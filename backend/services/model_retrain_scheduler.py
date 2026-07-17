"""Periodic candidate-only URL ensemble retraining."""
from __future__ import annotations

import asyncio
import json
import logging
import subprocess
import sys
from datetime import timedelta
from pathlib import Path

from sqlalchemy import select

from backend.config import settings
from backend.db import SessionLocal
from backend.models import AdminJob, ModelVersion
from backend.security_utils import utcnow

logger = logging.getLogger(__name__)
DATA_DIR = Path("data").resolve()


def _dataset_path() -> Path:
    candidate = Path(settings.model_retrain_dataset_path)
    if not candidate.is_absolute():
        candidate = Path.cwd() / candidate
    resolved = candidate.resolve()
    if not resolved.is_relative_to(DATA_DIR) or resolved.suffix.lower() != ".csv":
        raise ValueError("Scheduled retraining dataset must be a CSV inside data/")
    return resolved


def run_scheduled_url_retrain(*, force: bool = False) -> dict[str, object]:
    dataset = _dataset_path()
    if not dataset.is_file():
        return {"status": "skipped", "reason": "dataset_missing", "path": str(dataset)}
    cutoff = utcnow() - timedelta(hours=max(1, settings.model_retrain_interval_hours))
    with SessionLocal() as db:
        recent = db.execute(
            select(AdminJob)
            .where(
                AdminJob.job_type == "scheduled_url_retrain",
                AdminJob.status == "completed",
                AdminJob.completed_at >= cutoff,
            )
            .order_by(AdminJob.completed_at.desc())
        ).scalars().first()
        if recent is not None and not force:
            return {"status": "not_due", "job_id": recent.id}
        job = AdminJob(
            job_type="scheduled_url_retrain",
            status="running",
            progress=5,
            current_step="Training URL ensemble candidate",
            data_path=str(dataset),
            models=["url"],
            started_at=utcnow(),
        )
        db.add(job)
        db.commit()
        db.refresh(job)
        job_id = job.id

    output_dir = Path(".aisec-data/model-candidates") / job_id
    output_dir.mkdir(parents=True, exist_ok=True)
    command = [
        sys.executable,
        "ai/training/train_url_ensemble.py",
        "--data",
        str(dataset),
        "--out",
        str(output_dir),
        "--algorithms",
        *settings.model_retrain_algorithms,
    ]
    try:
        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            timeout=max(300, settings.model_retrain_timeout_seconds),
            check=False,
        )
        summary: dict[str, object] = {}
        for line in reversed(result.stdout.splitlines()):
            try:
                parsed = json.loads(line)
            except json.JSONDecodeError:
                continue
            if isinstance(parsed, dict) and "models" in parsed:
                summary = parsed
                break
        with SessionLocal() as db:
            job = db.get(AdminJob, job_id)
            if result.returncode != 0:
                job.status = "failed"
                job.error = (result.stderr or result.stdout)[-2000:]
                job.current_step = "Training failed"
            else:
                job.status = "completed"
                job.progress = 100
                job.current_step = "Candidate ensemble ready for review"
                job.result = summary
                for item in summary.get("models", []):
                    if not isinstance(item, dict) or item.get("status") != "completed":
                        continue
                    db.add(
                        ModelVersion(
                            model_name=f"url_{item.get('algorithm')}",
                            modality="url",
                            status="candidate",
                            artifact_uri=str(output_dir),
                            training_dataset_uri=str(dataset),
                            metrics=item,
                            f1=float(item.get("f1", 0)),
                            accuracy=float(item.get("accuracy", 0)),
                            trained_by_job_id=job_id,
                        )
                    )
            job.completed_at = utcnow()
            db.commit()
        return {"status": "completed" if result.returncode == 0 else "failed", "job_id": job_id, "summary": summary}
    except Exception as exc:
        with SessionLocal() as db:
            job = db.get(AdminJob, job_id)
            job.status = "failed"
            job.error = f"{type(exc).__name__}: {exc}"[:2000]
            job.completed_at = utcnow()
            db.commit()
        return {"status": "failed", "job_id": job_id, "error": str(exc)}


async def run_model_retrain_scheduler() -> None:
    while True:
        try:
            await asyncio.to_thread(run_scheduled_url_retrain)
        except asyncio.CancelledError:
            raise
        except Exception:
            logger.exception("Unexpected scheduled model retraining failure")
        await asyncio.sleep(3600)
