"""Shared singletons for the gateway (model/service injection)."""

from __future__ import annotations

from functools import lru_cache

from ai.inference.engine import InferenceEngine
from backend.config import settings
from backend.services.deepfake_service import DeepfakeImageService
from backend.services.explanation_service import ExplanationService
from backend.services.inference_service import InferenceService
from security.policy_engine import PolicyEngine


@lru_cache
def get_inference_service() -> InferenceService:
    engine = InferenceEngine(model_dir=settings.model_dir)
    policy = PolicyEngine(
        block=settings.risk_threshold_block,
        warn=settings.risk_threshold_warn,
        allow=settings.risk_threshold_allow,
    )
    return InferenceService(engine=engine, policy=policy)


@lru_cache
def get_explanation_service() -> ExplanationService:
    return ExplanationService(model=settings.ollama_model, base_url=settings.ollama_base_url)


@lru_cache
def get_deepfake_service() -> DeepfakeImageService:
    return DeepfakeImageService(model_path=settings.deepfake_model_path)
