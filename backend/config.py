"""Gateway configuration (pydantic-settings)."""

from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Lightweight ONNX artifacts are committed with the portable source package.
    model_dir: str = "ai/models"
    deepfake_model_path: str = "ai/models/deepfake_image_q4.onnx"
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "qwen2.5:7b-instruct-q4_K_M"

    database_url: str = "sqlite:///./.aisec-data/armor.db"
    database_auto_create: bool = True
    database_echo: bool = False
    api_key_pepper: str = "dev-api-key-pepper-change-in-production"

    api_key: str = "dev-key-change-in-production"
    rate_limit_per_min: int = 60
    anonymous_daily_scan_limit: int = 50

    risk_threshold_block: float = 0.85
    risk_threshold_warn: float = 0.50
    risk_threshold_allow: float = 0.15

    # CORS: chrome-extension origins are added at runtime; web dev origin here.
    cors_allow_origins: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ]


settings = Settings()
