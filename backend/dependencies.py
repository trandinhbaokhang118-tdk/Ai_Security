"""Shared singletons for the gateway (model/service injection)."""

from __future__ import annotations

from functools import lru_cache

from ai.inference.engine import InferenceEngine
from backend.config import settings
from backend.services.adapter_registry import AdapterRegistry
from backend.services.deepfake_service import DeepfakeImageService
from backend.services.explanation_service import ExplanationService
from backend.services.inference_service import InferenceService
from security.policy_engine import PolicyEngine


@lru_cache
def get_adapter_registry() -> AdapterRegistry:
    return AdapterRegistry(
        settings.adapter_manifest_path,
        base_url=settings.adapter_base_url or settings.llm_base_url,
        api_key=settings.adapter_api_key or settings.llm_api_key,
        default_timeout_seconds=settings.adapter_timeout_seconds,
        enabled=settings.adapter_registry_enabled,
    )


@lru_cache
def get_inference_service() -> InferenceService:
    engine = InferenceEngine(model_dir=settings.model_dir)
    policy = PolicyEngine(
        block=settings.risk_threshold_block,
        warn=settings.risk_threshold_warn,
        allow=settings.risk_threshold_allow,
    )
    return InferenceService(
        engine=engine,
        policy=policy,
        adapter_registry=get_adapter_registry(),
        adapter_max_risk_contribution=settings.adapter_max_risk_contribution,
    )


@lru_cache
def get_explanation_service() -> ExplanationService:
    base_url = settings.llm_base_url
    model = settings.llm_model
    if not base_url:
        base_url = settings.ollama_base_url.rstrip("/") + "/v1"
    if not model:
        model = settings.ollama_model
    return ExplanationService(
        model=model,
        base_url=base_url,
        api_key=settings.llm_api_key,
        timeout_seconds=settings.llm_timeout_seconds,
        max_tokens=settings.llm_max_tokens,
        adapter_registry=get_adapter_registry(),
    )


@lru_cache
def get_deepfake_service() -> DeepfakeImageService:
    return DeepfakeImageService(model_path=settings.deepfake_model_path)
