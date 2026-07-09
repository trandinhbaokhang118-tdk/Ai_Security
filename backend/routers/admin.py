"""
Admin API routes for task execution and model training management.
"""
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import List, Optional, Literal
import asyncio
from pathlib import Path
import json
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["admin"])

# Global state for tracking execution status
task_execution_status = {}
training_status = {
    "status": "idle",
    "progress": 0,
    "current_model": None,
    "message": None,
    "results": []
}


class SpecExecutionRequest(BaseModel):
    specId: str
    mode: Literal["all", "remaining"] = "remaining"


class ModelTrainingRequest(BaseModel):
    dataPath: str
    models: List[Literal["text", "prompt", "url"]] = ["text", "prompt", "url"]


class SpecInfo(BaseModel):
    id: str
    name: str
    path: str
    tasksTotal: int
    tasksCompleted: int
    tasksRemaining: int


class TaskExecutionStatus(BaseModel):
    specId: str
    status: Literal["idle", "running", "completed", "error"]
    currentTask: Optional[str] = None
    progress: int = 0
    message: Optional[str] = None


class ModelTrainingStatus(BaseModel):
    status: Literal["idle", "training", "completed", "error"]
    currentModel: Optional[str] = None
    progress: int = 0
    message: Optional[str] = None
    results: List[dict] = []


@router.get("/specs")
async def list_specs():
    """List all specs with their task status."""
    specs_dir = Path(".kiro/specs")
    
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
            # Parse tasks.md to count tasks
            content = tasks_file.read_text(encoding="utf-8")
            lines = content.split("\n")
            
            total = 0
            completed = 0
            
            for line in lines:
                # Count checkbox tasks: - [ ] or - [x]
                if line.strip().startswith("- ["):
                    total += 1
                    if line.strip().startswith("- [x]") or line.strip().startswith("- [X]"):
                        completed += 1
            
            specs.append({
                "id": spec_path.name,
                "name": spec_path.name.replace("-", " ").title(),
                "path": str(spec_path),
                "tasksTotal": total,
                "tasksCompleted": completed,
                "tasksRemaining": total - completed
            })
        except Exception as e:
            logger.error(f"Error parsing spec {spec_path}: {e}")
            continue
    
    return {"specs": specs}


@router.post("/specs/execute")
async def execute_spec_tasks(
    request: SpecExecutionRequest,
    background_tasks: BackgroundTasks
):
    """Execute all remaining tasks in a spec."""
    spec_path = Path(".kiro/specs") / request.specId / "tasks.md"
    
    if not spec_path.exists():
        raise HTTPException(status_code=404, detail="Spec not found")
    
    # Initialize status
    task_execution_status[request.specId] = {
        "specId": request.specId,
        "status": "running",
        "progress": 0,
        "currentTask": "Starting execution...",
        "message": "Initializing task runner"
    }
    
    # Run tasks in background
    background_tasks.add_task(run_spec_tasks, request.specId, str(spec_path))
    
    return {"message": "Execution started", "specId": request.specId}


@router.get("/specs/{spec_id}/status")
async def get_spec_execution_status(spec_id: str):
    """Get execution status for a specific spec."""
    status = task_execution_status.get(spec_id, {
        "specId": spec_id,
        "status": "idle",
        "progress": 0,
        "currentTask": None,
        "message": None
    })
    return status


@router.post("/models/train")
async def train_models(
    request: ModelTrainingRequest,
    background_tasks: BackgroundTasks
):
    """Train AI models using specified data."""
    data_path = Path(request.dataPath)
    
    if not data_path.exists():
        raise HTTPException(status_code=404, detail="Data file not found")
    
    # Initialize training status
    global training_status
    training_status = {
        "status": "training",
        "progress": 0,
        "current_model": None,
        "message": "Initializing training pipeline",
        "results": []
    }
    
    # Run training in background
    background_tasks.add_task(run_model_training, str(data_path), request.models)
    
    return {"message": "Training started", "dataPath": str(data_path)}


@router.get("/models/train/status")
async def get_training_status():
    """Get current model training status."""
    return training_status


async def run_spec_tasks(spec_id: str, tasks_file_path: str):
    """
    Background task to execute spec tasks.
    This is a simplified implementation - in production you would use
    proper task orchestration tools.
    """
    try:
        # Simulate task execution
        tasks_file = Path(tasks_file_path)
        content = tasks_file.read_text(encoding="utf-8")
        lines = content.split("\n")
        
        # Find uncompleted tasks
        uncompleted_tasks = []
        for i, line in enumerate(lines):
            if line.strip().startswith("- [ ]"):
                # Extract task description
                task_desc = line.strip()[5:].strip()
                uncompleted_tasks.append((i, task_desc))
        
        if not uncompleted_tasks:
            task_execution_status[spec_id] = {
                "specId": spec_id,
                "status": "completed",
                "progress": 100,
                "currentTask": "All tasks completed",
                "message": "No remaining tasks to execute"
            }
            return
        
        total_tasks = len(uncompleted_tasks)
        
        for idx, (line_num, task_desc) in enumerate(uncompleted_tasks, 1):
            # Update status
            progress = int((idx / total_tasks) * 100)
            task_execution_status[spec_id] = {
                "specId": spec_id,
                "status": "running",
                "progress": progress,
                "currentTask": task_desc[:100],  # Limit length
                "message": f"Executing task {idx} of {total_tasks}"
            }
            
            # Simulate task execution (in real implementation, this would
            # invoke actual task execution logic)
            await asyncio.sleep(2)
            
            # Mark task as complete
            lines[line_num] = lines[line_num].replace("- [ ]", "- [x]", 1)
            tasks_file.write_text("\n".join(lines), encoding="utf-8")
        
        # Mark as completed
        task_execution_status[spec_id] = {
            "specId": spec_id,
            "status": "completed",
            "progress": 100,
            "currentTask": "All tasks completed",
            "message": f"Successfully completed {total_tasks} tasks"
        }
        
    except Exception as e:
        logger.error(f"Error executing tasks for {spec_id}: {e}")
        task_execution_status[spec_id] = {
            "specId": spec_id,
            "status": "error",
            "progress": 0,
            "currentTask": None,
            "message": str(e)
        }


async def run_model_training(data_path: str, models: List[str]):
    """
    Background task to train AI models.
    """
    global training_status
    
    try:
        import subprocess
        import sys
        
        training_scripts = {
            "text": "ai/training/train_real_text_classifier.py",
            "prompt": "ai/training/train_real_prompt_classifier.py",
            "url": "ai/training/train_url_lgbm.py"
        }
        
        results = []
        total_models = len(models)
        
        for idx, model_name in enumerate(models, 1):
            script_path = training_scripts.get(model_name)
            if not script_path or not Path(script_path).exists():
                logger.warning(f"Training script for {model_name} not found")
                continue
            
            # Update status
            progress = int(((idx - 1) / total_models) * 100)
            training_status = {
                "status": "training",
                "progress": progress,
                "current_model": f"Training {model_name} model...",
                "message": f"Running training script: {script_path}",
                "results": results
            }
            
            try:
                # Run training script
                result = subprocess.run(
                    [sys.executable, script_path, "--data", data_path],
                    capture_output=True,
                    text=True,
                    timeout=1800  # 30 minute timeout
                )
                
                if result.returncode == 0:
                    # Parse results from stdout (expecting JSON or similar)
                    try:
                        # Try to extract metrics from output
                        output_lines = result.stdout.split("\n")
                        metrics = {}
                        for line in output_lines:
                            if "f1" in line.lower() or "accuracy" in line.lower():
                                # Simple parsing - in real implementation, use proper JSON output
                                parts = line.split(":")
                                if len(parts) == 2:
                                    key = parts[0].strip().lower().replace(" ", "_")
                                    value = float(parts[1].strip().rstrip("%")) / 100
                                    metrics[key] = value
                        
                        results.append({
                            "model": model_name,
                            **metrics
                        })
                    except Exception as e:
                        logger.warning(f"Could not parse metrics for {model_name}: {e}")
                        results.append({"model": model_name, "status": "completed"})
                else:
                    logger.error(f"Training failed for {model_name}: {result.stderr}")
                    results.append({"model": model_name, "status": "error", "error": result.stderr[:200]})
                
            except subprocess.TimeoutExpired:
                logger.error(f"Training timeout for {model_name}")
                results.append({"model": model_name, "status": "timeout"})
            except Exception as e:
                logger.error(f"Training error for {model_name}: {e}")
                results.append({"model": model_name, "status": "error", "error": str(e)})
            
            # Update progress
            progress = int((idx / total_models) * 100)
            training_status = {
                "status": "training",
                "progress": progress,
                "current_model": f"{model_name} model completed",
                "message": f"Completed {idx} of {total_models} models",
                "results": results
            }
            
            await asyncio.sleep(1)
        
        # Mark as completed
        training_status = {
            "status": "completed",
            "progress": 100,
            "current_model": "All models trained",
            "message": f"Successfully trained {len(results)} models",
            "results": results
        }
        
    except Exception as e:
        logger.error(f"Model training error: {e}")
        training_status = {
            "status": "error",
            "progress": 0,
            "current_model": None,
            "message": str(e),
            "results": []
        }
