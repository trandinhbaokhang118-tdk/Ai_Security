import pytest
from pydantic import ValidationError

from backend.config import Settings


def test_production_rejects_development_defaults() -> None:
    with pytest.raises(ValidationError, match="Unsafe production configuration"):
        Settings(app_env="production")


def test_production_accepts_explicit_safe_configuration() -> None:
    settings = Settings(
        app_env="production",
        database_url="postgresql+psycopg://armor:secret@db.example/armor?sslmode=verify-full",
        api_key_pepper="a-production-pepper-value-that-is-long-enough",
        api_key="a-production-api-key-value",
        seed_demo_user=False,
        database_auto_create=False,
    )
    assert settings.app_env == "production"


def test_production_remote_llm_requires_api_key() -> None:
    with pytest.raises(ValidationError, match="LLM_API_KEY"):
        Settings(
            app_env="production",
            database_url="postgresql+psycopg://armor:secret@db.example/armor?sslmode=require",
            api_key_pepper="a-production-pepper-value-that-is-long-enough",
            api_key="a-production-api-key-value",
            seed_demo_user=False,
            database_auto_create=False,
            llm_base_url="https://gpu.example/v1",
            llm_api_key="",
        )
