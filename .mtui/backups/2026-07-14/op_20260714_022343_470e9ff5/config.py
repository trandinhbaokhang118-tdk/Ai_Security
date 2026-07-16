"""Gateway configuration (pydantic-settings)."""

from __future__ import annotations

from typing import Literal

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    app_env: Literal["development", "test", "production"] = "development"

    model_dir: str = "ai/models"
    deepfake_model_path: str = "ai/models/deepfake_image_q4.onnx"
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "qwen2.5:7b-instruct-q4_K_M"

    database_url: str = "sqlite:///./.aisec-data/armor.db"
    database_auto_create: bool = True
    database_echo: bool = False
    database_pool_size: int = 10
    database_max_overflow: int = 20
    database_pool_timeout: int = 30
    database_pool_recycle: int = 1800
    database_require_tls: bool = True
    seed_demo_user: bool = True
    api_key_pepper: str = "dev-api-key-pepper-change-in-production"
    api_key_last_used_write_interval_seconds: int = 300

    api_key: str = "dev-key-change-in-production"
    rate_limit_per_min: int = 60
    anonymous_daily_scan_limit: int = 50
    max_upload_bytes: int = 10 * 1024 * 1024

    # Payment credits (SePay bank-transfer webhook).
    sepay_webhook_api_key: str = ""
    sepay_bank_account: str = ""
    sepay_bank_name: str = ""
    sepay_account_name: str = ""
    sandbox_credit_price_vnd: int = 15000
    sandbox_session_minutes: int = 10

    # Disposable Windows EC2 + browser remote desktop URL supplied by the AMI.
    aws_region: str = "ap-southeast-1"
    aws_sandbox_ami_id: str = ""
    aws_sandbox_instance_type: str = "t3.large"
    aws_sandbox_subnet_id: str = ""
    aws_sandbox_security_group_id: str = ""
    aws_sandbox_key_name: str = ""
    aws_sandbox_remote_port: int = 8443
    sandbox_public_base_url: str = ""

    # Public MCP transport is authenticated independently from the web gateway.
    mcp_allow_anonymous: bool = False
    mcp_api_key_rate_limit_per_min: int = 120
    mcp_anonymous_rate_limit_per_min: int = 10

    risk_threshold_block: float = 0.85
    risk_threshold_warn: float = 0.50
    risk_threshold_allow: float = 0.15

    # Official product origins plus local development origins.
    cors_allow_origins: list[str] = [
        "https://prewise.site",
        "https://www.prewise.site",
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
        if not self.database_url.startswith(("postgresql://", "postgresql+psycopg://")):
            unsafe.append("DATABASE_URL=postgresql+psycopg://...")
        if self.database_require_tls and "sslmode=" not in self.database_url:
            unsafe.append("DATABASE_URL with sslmode=require or verify-full")
        if len(self.api_key_pepper.encode("utf-8")) < 32:
            unsafe.append("API_KEY_PEPPER>=32 bytes")
        if self.mcp_allow_anonymous:
            unsafe.append("MCP_ALLOW_ANONYMOUS=false")
        if self.mcp_api_key_rate_limit_per_min <= 0:
            unsafe.append("MCP_API_KEY_RATE_LIMIT_PER_MIN>0")
        if unsafe:
            raise ValueError("Unsafe production configuration: " + ", ".join(unsafe))
        return self


settings = Settings()
