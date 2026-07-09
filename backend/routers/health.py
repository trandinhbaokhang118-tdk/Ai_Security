"""Health endpoint."""

from __future__ import annotations

from fastapi import APIRouter, Depends

from backend.dependencies import get_explanation_service, get_inference_service
from backend.services.explanation_service import ExplanationService
from backend.services.inference_service import InferenceService
from shared.schemas import HealthResponse

router = APIRouter(prefix="/v1", tags=["health"])


@router.get("/health", response_model=HealthResponse)
def health(
    svc: InferenceService = Depends(get_inference_service),
    expl: ExplanationService = Depends(get_explanation_service),
):
    return HealthResponse(
        status="ok",
        models_loaded=svc.models_loaded,
        llm_available=expl.available,
        model_status=svc.model_status,
    )
