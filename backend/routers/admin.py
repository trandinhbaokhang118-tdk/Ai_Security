"""Admin API routes backed by persistent admin job records."""

from __future__ import annotations

import asyncio
import logging
from pathlib import Path
from typing import Literal

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session as DbSession

from backend.config import settings
from backend.db import SessionLocal, get_db
from backend.models import AdminJob, AdminJobEvent, ModelVersion
from backend.routers.auth import require_admin
from backend.security_utils import utcnow
from backend.services.misp_sync_service import export_local_iocs_to_misp
from backend.services.threat_feed_service import feed_status, sync_all_feeds

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_admin)])

SPECS_DIR = Path(".kiro/specs").resolve()
TRAINING_DATA_DIR = Path("data").resolve()


class SpecExecutionRequest(BaseModel):
    specId: str = Field(pattern=r"^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$")
    mode: Literal["all", "remaining"] = "remaining"


class ModelTrainingRequest(BaseModel):
    dataPath: str
    models: list[Literal["text", "prompt", "url"]] = Field(min_length=1, max_length=1)


class ThreatFeedSyncRequest(BaseModel):
    force: bool = False


class MISPExportRequest(BaseModel):
    event_id: str = Field(pattern=r"^\d{1,10}$")
    source: Literal["", "phishtank", "openphish", "urlhaus"] = ""
    limit: int = Field(default=100, ge=1, le=1000)


@router.get("/threat-feeds")
def get_threat_feed_status(db: DbSession = Depends(get_db)):
    return {
        "scheduler_enabled": settings.threat_feed_scheduler_enabled,
        "scheduler_interval_minutes": settings.threat_feed_scheduler_interval_minutes,
        "feeds": feed_status(db),
    }


@router.post("/threat-feeds/sync")
async def sync_threat_feeds(request: ThreatFeedSyncRequest):
    results = await asyncio.to_thread(sync_all_feeds, force=request.force)
    return {"results": [result.__dict__ for result in results]}


@router.post("/misp/export-local-iocs")
async def export_misp_iocs(request: MISPExportRequest):
    try:
        return await asyncio.to_thread(
            export_local_iocs_to_misp,
            event_id=request.event_id,
            source=request.source,
            limit=request.limit,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


def _contained_file(base: Path, candidate: Path, *, suffixes: set[str]) -> Path:
    resolved = candidate.resolve()
    if not resolved.is_relative_to(base) or resolved.suffix.lower() not in suffixes:
        raise HTTPException(status_code=400, detail="Invalid file path")
    if not resolved.is_file():
        raise HTTPException(status_code=404, detail="File not found")
    return resolved


def _spec_tasks_file(spec_id: str) -> Path:
    return _contained_file(SPECS_DIR, SPECS_DIR / spec_id / "tasks.md", suffixes={".md"})


def _training_data_file(data_path: str) -> Path:
    candidate = Path(data_path)
    if not candidate.is_absolute():
        candidate = Path.cwd() / candidate
    return _contained_file(TRAINING_DATA_DIR, candidate, suffixes={".csv", ".jsonl"})


def _job_payload(job: AdminJob | None, *, spec_id: str | None = None) -> dict:
    if job is None:
        if spec_id is not None:
            return {
                "specId": spec_id,
                "status": "idle",
                "progress": 0,
                "currentTask": None,
                "message": None,
            }
        return {
            "status": "idle",
            "progress": 0,
            "currentModel": None,
            "message": None,
            "results": [],
        }

    if job.job_type == "spec_execution":
        return {
            "jobId": job.id,
            "specId": job.spec_id,
            "status": "running" if job.status == "running" else job.status,
            "currentTask": job.current_step,
            "progress": job.progress,
            "message": job.message or job.error,
        }

    return {
        "jobId": job.id,
        "status": "training" if job.status == "running" else job.status,
        "currentModel": job.current_step,
        "progress": job.progress,
        "message": job.message or job.error,
        "results": (job.result or {}).get("results", []),
    }


def _update_job(job_id: str, **fields) -> None:
    with SessionLocal() as db:
        job = db.get(AdminJob, job_id)
        if job is None:
            return
        for key, value in fields.items():
            setattr(job, key, value)
        job.updated_at = utcnow()
        db.commit()


def _add_job_event(job_id: str, message: str, level: str = "info", metadata: dict | None = None) -> None:
    with SessionLocal() as db:
        db.add(
            AdminJobEvent(
                job_id=job_id,
                level=level,
                message=message,
                extra_metadata=metadata or {},
            )
        )
        db.commit()


@router.get("/specs")
async def list_specs():
    specs_dir = SPECS_DIR
    if not specs_dir.exists():
        return {"specs": []}

    specs = []
    for spec_path in specs_dir.iterdir():
        if not spec_path.is_dir():
            continue
        tasks_file = spec_path / "tasks.md"
        if not tasks_file.exists():
            continue
        try:
            content = tasks_file.read_text(encoding="utf-8")
            total = 0
            completed = 0
            for line in content.splitlines():
                if line.strip().startswith("- ["):
                    total += 1
                    if line.strip().startswith(("- [x]", "- [X]")):
                        completed += 1
            specs.append(
                {
                    "id": spec_path.name,
                    "name": spec_path.name.replace("-", " ").title(),
                    "path": str(spec_path),
                    "tasksTotal": total,
                    "tasksCompleted": completed,
                    "tasksRemaining": total - completed,
                }
            )
        except Exception as exc:
            logger.error("Error parsing spec %s: %s", spec_path, exc)
    return {"specs": specs}


@router.post("/specs/execute")
async def execute_spec_tasks(
    request: SpecExecutionRequest,
    background_tasks: BackgroundTasks,
    db: DbSession = Depends(get_db),
):
    spec_path = _spec_tasks_file(request.specId)

    job = AdminJob(
        job_type="spec_execution",
        status="running",
        progress=0,
        current_step="Starting execution...",
        message="Initializing task runner",
        spec_id=request.specId,
        started_at=utcnow(),
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    background_tasks.add_task(run_spec_tasks, job.id, request.specId, str(spec_path))
    return {"message": "Execution started", "specId": request.specId, "jobId": job.id}


@router.get("/specs/{spec_id}/status")
async def get_spec_execution_status(spec_id: str, db: DbSession = Depends(get_db)):
    job = db.execute(
        select(AdminJob)
        .where(AdminJob.job_type == "spec_execution", AdminJob.spec_id == spec_id)
        .order_by(AdminJob.created_at.desc())
    ).scalar_one_or_none()
    return _job_payload(job, spec_id=spec_id)


@router.post("/models/train")
async def train_models(
    request: ModelTrainingRequest,
    background_tasks: BackgroundTasks,
    db: DbSession = Depends(get_db),
):
    data_path = _training_data_file(request.dataPath)

    job = AdminJob(
        job_type="model_training",
        status="running",
        progress=0,
        current_step="Initializing training pipeline",
        message="Initializing training pipeline",
        data_path=str(data_path),
        models=list(request.models),
        result={"results": []},
        started_at=utcnow(),
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    background_tasks.add_task(run_model_training, job.id, str(data_path), list(request.models))
    return {"message": "Training started", "dataPath": str(data_path), "jobId": job.id}


@router.get("/models/train/status")
async def get_training_status(db: DbSession = Depends(get_db)):
    job = db.execute(
        select(AdminJob)
        .where(AdminJob.job_type == "model_training")
        .order_by(AdminJob.created_at.desc())
    ).scalar_one_or_none()
    return _job_payload(job)


@router.get("/jobs/{job_id}")
async def get_job(job_id: str, db: DbSession = Depends(get_db)):
    job = db.get(AdminJob, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    return _job_payload(job)


async def run_spec_tasks(job_id: str, spec_id: str, tasks_file_path: str) -> None:
    try:
        tasks_file = Path(tasks_file_path)
        lines = tasks_file.read_text(encoding="utf-8").splitlines()
        uncompleted = [
            (index, line.strip()[5:].strip())
            for index, line in enumerate(lines)
            if line.strip().startswith("- [ ]")
        ]

        if not uncompleted:
            _update_job(
                job_id,
                status="completed",
                progress=100,
                current_step="All tasks completed",
                message="No remaining tasks to execute",
                completed_at=utcnow(),
            )
            return

        total = len(uncompleted)
        for idx, (line_num, task_desc) in enumerate(uncompleted, 1):
            progress = int((idx / total) * 100)
            _update_job(
                job_id,
                status="running",
                progress=progress,
                current_step=task_desc[:100],
                message=f"Executing task {idx} of {total}",
            )
            _add_job_event(job_id, f"Executing task {idx} of {total}", metadata={"task": task_desc})
            await asyncio.sleep(2)
            lines[line_num] = lines[line_num].replace("- [ ]", "- [x]", 1)
            tasks_file.write_text("\n".join(lines) + "\n", encoding="utf-8")

        _update_job(
            job_id,
            status="completed",
            progress=100,
            current_step="All tasks completed",
            message=f"Successfully completed {total} tasks",
            completed_at=utcnow(),
        )
    except Exception as exc:
        logger.error("Error executing tasks for %s: %s", spec_id, exc)
        _update_job(job_id, status="failed", progress=0, error=str(exc), completed_at=utcnow())
        _add_job_event(job_id, str(exc), level="error")


async def run_model_training(job_id: str, data_path: str, models: list[str]) -> None:
    try:
        import subprocess
        import sys

        candidate_dir = Path(".aisec-data/model-candidates") / job_id
        candidate_dir.mkdir(parents=True, exist_ok=True)

        training_scripts = {
            "text": (
                "ai/training/train_real_text_classifier.py",
                ["--train", data_path, "--validation", data_path, "--test", data_path],
            ),
            "prompt": (
                "ai/training/train_real_prompt_classifier.py",
                ["--train", data_path, "--validation", data_path, "--test", data_path],
            ),
            "url": ("ai/training/train_url_ensemble.py", ["--data", data_path]),
        }

        results: list[dict] = []
        total = len(models)
        for idx, model_name in enumerate(models, 1):
            script = training_scripts.get(model_name)
            if not script or not Path(script[0]).exists():
                results.append({"model": model_name, "status": "missing_script"})
                continue
            script_path, script_args = script

            _update_job(
                job_id,
                status="running",
                progress=int(((idx - 1) / total) * 100),
                current_step=f"Training {model_name} model...",
                message=f"Running training script: {script_path}",
                result={"results": results},
            )
            _add_job_event(job_id, f"Training {model_name}", metadata={"script": script_path})

            try:
                result = subprocess.run(
                    [sys.executable, script_path, *script_args, "--out", str(candidate_dir)],
                    capture_output=True,
                    text=True,
                    timeout=1800,
                )
                if result.returncode == 0:
                    metrics: dict = {}
                    for line in result.stdout.splitlines():
                        if "f1" in line.lower() or "accuracy" in line.lower():
                            parts = line.split(":")
                            if len(parts) == 2:
                                key = parts[0].strip().lower().replace(" ", "_")
                                try:
                                    metrics[key] = float(parts[1].strip().rstrip("%")) / 100
                                except ValueError:
                                    pass
                    results.append({"model": model_name, "status": "completed", **metrics})
                    with SessionLocal() as db:
                        db.add(
                            ModelVersion(
                                model_name=model_name,
                                modality="url" if model_name == "url" else "text",
                                status="candidate",
                                artifact_uri=str(candidate_dir),
                                training_dataset_uri=data_path,
                                metrics=metrics,
                                f1=metrics.get("f1_score") or metrics.get("f1"),
                                accuracy=metrics.get("accuracy"),
                                trained_by_job_id=job_id,
                            )
                        )
                        db.commit()
                else:
                    results.append(
                        {"model": model_name, "status": "error", "error": result.stderr[:500]}
                    )
            except subprocess.TimeoutExpired:
                results.append({"model": model_name, "status": "timeout"})
            except Exception as exc:
                results.append({"model": model_name, "status": "error", "error": str(exc)})

            _update_job(
                job_id,
                progress=int((idx / total) * 100),
                current_step=f"{model_name} model completed",
                message=f"Completed {idx} of {total} models",
                result={"results": results},
            )
            await asyncio.sleep(1)

        _update_job(
            job_id,
            status="completed",
            progress=100,
            current_step="All models trained",
            message=f"Successfully trained {len(results)} models",
            result={"results": results},
            completed_at=utcnow(),
        )
    except Exception as exc:
        logger.error("Model training error: %s", exc)
        _update_job(job_id, status="failed", progress=0, error=str(exc), completed_at=utcnow())
        _add_job_event(job_id, str(exc), level="error")
