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
    ip2whois_api_key: str = ""
    whoisxml_api_key: str = ""

    # Basic IP enrichment. The keyless IP2Location endpoint is intentionally
    # bounded by a short timeout and receives only a public IP address, never
    # the full URL or query string.
    ip_geolocation_enabled: bool = True
    ip2location_api_key: str = ""
    ip_geolocation_timeout_seconds: float = 3.0
    ip_geolocation_cache_ttl_seconds: int = 21600

    # Optional external URL intelligence. Values are read server-side only.
    hudson_rock_api_url: str = ""
    hudson_rock_api_key: str = ""
    phishtank_api_url: str = ""
    phishtank_api_key: str = ""
    phishtank_enabled: bool = False
    ipqs_api_url: str = ""
    ipqs_api_key: str = ""
    google_web_risk_api_url: str = ""
    google_web_risk_api_key: str = ""
    google_safe_browsing_api_key: str = ""
    apivoid_api_url: str = ""
    apivoid_api_key: str = ""
    phishdestroy_api_url: str = ""
    phishdestroy_api_key: str = ""
    phishdestroy_enabled: bool = False
    # url.vet remains a separately deployed AGPL service and is consumed over HTTP.
    urlvet_enabled: bool = False
    urlvet_api_url: str = "http://127.0.0.1:8080"
    urlvet_timeout_seconds: float = 12.0

    # Local threat-feed pipeline. Sources remain opt-in because each provider has
    # its own API key, rate limit, and terms of use.
    threat_feed_scheduler_enabled: bool = False
    threat_feed_scheduler_interval_minutes: int = 60
    threat_feed_request_timeout_seconds: float = 45.0
    threat_feed_max_download_bytes: int = 64 * 1024 * 1024
    threat_feed_max_records_per_source: int = 250_000
    threat_feed_retention_days: int = 30
    threat_feed_user_agent: str = "AI-Security-Armor/0.2 threat-feed-collector"
    threat_feed_allow_custom_endpoints: bool = False
    threat_feed_phishtank_enabled: bool = False
    threat_feed_phishtank_url: str = "http://data.phishtank.com/data/online-valid.csv.gz"
    threat_feed_phishtank_app_key: str = ""
    threat_feed_openphish_enabled: bool = False
    threat_feed_openphish_url: str = (
        "https://raw.githubusercontent.com/openphish/public_feed/refs/heads/main/feed.txt"
    )
    threat_feed_urlhaus_enabled: bool = False
    threat_feed_urlhaus_url: str = (
        "https://urlhaus-api.abuse.ch/v2/files/exports/{auth_key}/recent.csv"
    )
    threat_feed_urlhaus_auth_key: str = ""
    threat_feed_openphish_interval_hours: int = 12

    # Candidate-only scheduled retraining. New artifacts are never promoted
    # automatically; an administrator must review their holdout metrics first.
    model_retrain_scheduler_enabled: bool = False
    model_retrain_interval_hours: int = 168
    model_retrain_dataset_path: str = "data/url_dataset.csv"
    model_retrain_algorithms: list[str] = ["lightgbm", "random_forest", "xgboost"]
    model_retrain_timeout_seconds: int = 7200

    # Optional self-hosted MISP and Telegram bot webhook integrations.
    misp_enabled: bool = False
    misp_base_url: str = ""
    misp_api_key: str = ""
    misp_verify_tls: bool = True
    misp_timeout_seconds: float = 8.0
    misp_lookup_last: str = "90d"
    telegram_bot_enabled: bool = False
    telegram_bot_token: str = ""
    telegram_webhook_secret: str = ""
    telegram_allowed_chat_ids: list[str] = []
    telegram_timeout_seconds: float = 10.0
    threat_feed_phishing_database_path: str = ".aisec-data/Phishing.Database"

    # Privacy-preserving endpoint telemetry. Raw sensor identifiers are never stored.
    telemetry_sensor_pepper: str = "dev-telemetry-pepper-change-in-production"
    telemetry_retention_days: int = 30
    telemetry_consensus_window_days: int = 14
    telemetry_min_independent_sensors: int = 2

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

    # SePay webhook authentication. Prefer HMAC-SHA256 using X-SePay-Signature.
    sepay_webhook_api_key: str = ""
    sepay_webhook_secret: str = ""
    sepay_bank_account: str = ""
    sepay_bank_name: str = ""
    sepay_account_name: str = ""
    sepay_qr_base_url: str = "https://vietqr.app/img"
    sepay_payment_expiry_minutes: int = 30
    sandbox_credit_price_vnd: int = 15000
    sandbox_session_minutes: int = 10

    # Disposable Windows EC2 + browser remote desktop URL supplied by the AMI.
    aws_region: str = "ap-southeast-1"
    aws_sandbox_ami_id: str = ""
    aws_sandbox_instance_type: str = "t3.large"
    aws_sandbox_max_ami_id: str = ""
    aws_sandbox_max_instance_type: str = "g4dn.xlarge"
    aws_sandbox_subnet_id: str = ""
    free_sandbox_remote_url: str = ""
    free_sandbox_daily_minutes: int = 10
    pro_sandbox_session_minutes: int = 15
    max_sandbox_session_minutes: int = 30
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
        if len(self.telemetry_sensor_pepper.encode("utf-8")) < 32:
            unsafe.append("TELEMETRY_SENSOR_PEPPER>=32 bytes")
        if unsafe:
            raise ValueError("Unsafe production configuration: " + ", ".join(unsafe))
        return self


settings = Settings()
