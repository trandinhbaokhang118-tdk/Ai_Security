"""Health endpoint."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends

from backend.db import check_database
from backend.dependencies import (
    get_deepfake_service,
    get_explanation_service,
    get_inference_service,
)
from backend.services.deepfake_service import DeepfakeImageService
from backend.services.explanation_service import ExplanationService
from backend.services.inference_service import InferenceService
from shared.schemas import HealthResponse

router = APIRouter(prefix="/v1", tags=["health"])


@router.get("/health", response_model=HealthResponse)
def health(
    svc: Annotated[InferenceService, Depends(get_inference_service)],
    expl: Annotated[ExplanationService, Depends(get_explanation_service)],
    deepfake: Annotated[DeepfakeImageService, Depends(get_deepfake_service)],
):
    model_status = dict(svc.model_status)
    model_status["database"] = {"ready": check_database()}
    model_status["deepfake_image"] = {
        "ready": deepfake.available,
        "model_version": deepfake.model_version,
    }
    return HealthResponse(
        status="ok",
        models_loaded=svc.models_loaded,
        llm_available=expl.available,
        model_status=model_status,
    )
