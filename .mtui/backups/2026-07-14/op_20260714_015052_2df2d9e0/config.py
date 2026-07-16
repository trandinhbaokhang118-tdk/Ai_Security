"""Gateway configuration (pydantic-settings)."""

from __future__ import annotations

from typing import Literal

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    app_env: Literal["development", "test", "production"] = "development"

    # Lightweight ONNX artifacts are committed with the portable source package.
    model_dir: str = "ai/models"
    deepfake_model_path: str = "ai/models/deepfake_image_q4.onnx"
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "qwen2.5:7b-instruct-q4_K_M"

    database_url: str = "sqlite:///./.aisec-data/armor.db"
    database_auto_create: bool = True
    database_echo: bool = False
    seed_demo_user: bool = True
    api_key_pepper: str = "dev-api-key-pepper-change-in-production"

    api_key: str = "dev-key-change-in-production"
    rate_limit_per_min: int = 60
    anonymous_daily_scan_limit: int = 50
    max_upload_bytes: int = 10 * 1024 * 1024

    # Public MCP transport is authenticated independently from the web gateway.
    mcp_allow_anonymous: bool = False
    mcp_api_key_rate_limit_per_min: int = 120
    mcp_anonymous_rate_limit_per_min: int = 10

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

    @model_validator(mode="after")
    def validate_production_safety(self) -> Settings:
        if self.app_env != "production":
            return self
        unsafe = []
        if self.api_key_pepper == "dev-api-key-pepper-change-in-production":
            unsafe.append("API_KEY_PEPPER")
        if self.api_key == "dev-key-change-in-production":
            unsafe.append("API_KEY")
        if self.seed_demo_user:
            unsafe.append("SEED_DEMO_USER=false")
        if self.database_auto_create:
            unsafe.append("DATABASE_AUTO_CREATE=false")
        if self.mcp_allow_anonymous:
            unsafe.append("MCP_ALLOW_ANONYMOUS=false")
        if self.mcp_api_key_rate_limit_per_min <= 0:
            unsafe.append("MCP_API_KEY_RATE_LIMIT_PER_MIN>0")
        if unsafe:
            raise ValueError("Unsafe production configuration: " + ", ".join(unsafe))
        return self


settings = Settings()
