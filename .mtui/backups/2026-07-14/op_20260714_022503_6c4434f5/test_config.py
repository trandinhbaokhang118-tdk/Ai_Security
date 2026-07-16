import pytest
from pydantic import ValidationError

from backend.config import Settings


def test_production_rejects_development_defaults() -> None:
    with pytest.raises(ValidationError, match="Unsafe production configuration"):
        Settings(app_env="production")


def test_production_accepts_explicit_safe_configuration() -> None:
    settings = Settings(
        app_env="production",
        api_key_pepper="a-production-pepper-value",
        api_key="a-production-api-key-value",
        seed_demo_user=False,
        database_auto_create=False,
    )
    assert settings.app_env == "production"
