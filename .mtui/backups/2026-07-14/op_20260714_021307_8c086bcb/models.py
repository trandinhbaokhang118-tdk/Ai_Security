"""SQLAlchemy ORM models for the production persistence layer."""

from __future__ import annotations

import uuid

from sqlalchemy import (
    JSON,
    Boolean,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.db import Base
from backend.security_utils import utcnow


def uuid_str() -> str:
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_str)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True, nullable=False)
    display_name: Mapped[str] = mapped_column(String(200), nullable=False)
    avatar_url: Mapped[str | None] = mapped_column(String(1000))
    password_salt: Mapped[str] = mapped_column(String(64), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(256), nullable=False)
    password_algorithm: Mapped[str] = mapped_column(String(32), default="pbkdf2_sha256")
    role: Mapped[str] = mapped_column(String(32), default="user", nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="active", nullable=False)
    email_verified_at: Mapped[object | None] = mapped_column(DateTime)
    last_login_at: Mapped[object | None] = mapped_column(DateTime)
    created_at: Mapped[object] = mapped_column(DateTime, default=utcnow, nullable=False)
    updated_at: Mapped[object] = mapped_column(
        DateTime, default=utcnow, onupdate=utcnow, nullable=False
    )

    sessions: Mapped[list[SessionRecord]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    api_keys: Mapped[list[ApiKey]] = relationship(back_populates="user")
    subscriptions: Mapped[list[Subscription]] = relationship(back_populates="user")


class SessionRecord(Base):
    __tablename__ = "sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_str)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    expires_at: Mapped[object] = mapped_column(DateTime, nullable=False)
    revoked_at: Mapped[object | None] = mapped_column(DateTime)
    source_ip_hash: Mapped[str | None] = mapped_column(String(64))
    user_agent_hash: Mapped[str | None] = mapped_column(String(64))
    created_at: Mapped[object] = mapped_column(DateTime, default=utcnow, nullable=False)

    user: Mapped[User] = relationship(back_populates="sessions")


class ApiKey(Base):
    __tablename__ = "api_keys"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_str)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(120), default="Default key", nullable=False)
    key_prefix: Mapped[str] = mapped_column(String(32), index=True, nullable=False)
    key_tail: Mapped[str] = mapped_column(String(8), nullable=False)
    key_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    scopes: Mapped[list[str]] = mapped_column(
        JSON,
        default=lambda: [
            "assess:url", "assess:content", "assess:prompt", "assess:file",
            "assess:action", "mcp:invoke",
        ],
        nullable=False,
    )
    status: Mapped[str] = mapped_column(String(32), default="active", nullable=False)
    expires_at: Mapped[object | None] = mapped_column(DateTime)
    last_used_at: Mapped[object | None] = mapped_column(DateTime)
    rotated_from_id: Mapped[str | None] = mapped_column(ForeignKey("api_keys.id"))
    created_at: Mapped[object] = mapped_column(DateTime, default=utcnow, nullable=False)
    revoked_at: Mapped[object | None] = mapped_column(DateTime)

    user: Mapped[User] = relationship(back_populates="api_keys", foreign_keys=[user_id])


class Plan(Base):
    __tablename__ = "plans"

    tier: Mapped[str] = mapped_column(String(32), primary_key=True)
    label: Mapped[str] = mapped_column(String(40), nullable=False)
    daily_scan_limit: Mapped[int | None] = mapped_column(Integer)
    monthly_price_vnd: Mapped[int | None] = mapped_column(Integer)
    yearly_price_vnd: Mapped[int | None] = mapped_column(Integer)
    features: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    created_at: Mapped[object] = mapped_column(DateTime, default=utcnow, nullable=False)
    updated_at: Mapped[object] = mapped_column(
        DateTime, default=utcnow, onupdate=utcnow, nullable=False
    )


class Subscription(Base):
    __tablename__ = "subscriptions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_str)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    plan_tier: Mapped[str] = mapped_column(ForeignKey("plans.tier"), nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="active", nullable=False)
    provider: Mapped[str | None] = mapped_column(String(80))
    provider_customer_id: Mapped[str | None] = mapped_column(String(200))
    provider_subscription_id: Mapped[str | None] = mapped_column(String(200))
    trial_ends_at: Mapped[object | None] = mapped_column(DateTime)
    renews_at: Mapped[object | None] = mapped_column(DateTime)
    canceled_at: Mapped[object | None] = mapped_column(DateTime)
    created_at: Mapped[object] = mapped_column(DateTime, default=utcnow, nullable=False)
    updated_at: Mapped[object] = mapped_column(
        DateTime, default=utcnow, onupdate=utcnow, nullable=False
    )

    user: Mapped[User] = relationship(back_populates="subscriptions")
    plan: Mapped[Plan] = relationship()


class DailyQuotaUsage(Base):
    __tablename__ = "daily_quota_usage"
    __table_args__ = (
        UniqueConstraint("user_id", "usage_day", name="uq_quota_user_day"),
        UniqueConstraint("api_key_id", "usage_day", name="uq_quota_api_key_day"),
        UniqueConstraint("anonymous_id", "usage_day", name="uq_quota_anonymous_day"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_str)
    user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    api_key_id: Mapped[str | None] = mapped_column(ForeignKey("api_keys.id", ondelete="SET NULL"))
    anonymous_id: Mapped[str | None] = mapped_column(String(128))
    usage_day: Mapped[object] = mapped_column(Date, nullable=False)
    scan_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    limit_snapshot: Mapped[int | None] = mapped_column(Integer)
    last_scan_at: Mapped[object | None] = mapped_column(DateTime)
    created_at: Mapped[object] = mapped_column(DateTime, default=utcnow, nullable=False)
    updated_at: Mapped[object] = mapped_column(
        DateTime, default=utcnow, onupdate=utcnow, nullable=False
    )


class ScanEvent(Base):
    __tablename__ = "scan_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_str)
    request_id: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    api_key_id: Mapped[str | None] = mapped_column(ForeignKey("api_keys.id", ondelete="SET NULL"))
    channel: Mapped[str] = mapped_column(String(32), nullable=False)
    modality: Mapped[str] = mapped_column(String(32), nullable=False)
    normalized_url: Mapped[str | None] = mapped_column(Text)
    input_sha256: Mapped[str | None] = mapped_column(String(64), index=True)
    input_preview: Mapped[str | None] = mapped_column(Text)
    input_size_bytes: Mapped[int | None] = mapped_column(Integer)
    risk_score: Mapped[float] = mapped_column(Float, nullable=False)
    risk_level: Mapped[str] = mapped_column(String(32), nullable=False)
    decision: Mapped[str] = mapped_column(String(40), nullable=False)
    confidence: Mapped[float] = mapped_column(Float, nullable=False)
    model_version: Mapped[str] = mapped_column(String(200), nullable=False)
    latency_ms: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    source_ip_hash: Mapped[str | None] = mapped_column(String(64))
    user_agent_hash: Mapped[str | None] = mapped_column(String(64))
    extra_metadata: Mapped[dict] = mapped_column("metadata", JSON, default=dict, nullable=False)
    created_at: Mapped[object] = mapped_column(DateTime, default=utcnow, index=True, nullable=False)

    evidence: Mapped[list[ScanEvidence]] = relationship(
        back_populates="scan_event", cascade="all, delete-orphan"
    )


class ScanEvidence(Base):
    __tablename__ = "scan_evidence"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_str)
    scan_event_id: Mapped[str] = mapped_column(
        ForeignKey("scan_events.id", ondelete="CASCADE"), index=True
    )
    source: Mapped[str] = mapped_column(String(120), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    severity: Mapped[str] = mapped_column(String(32), default="info", nullable=False)
    feature: Mapped[str | None] = mapped_column(String(160))
    contribution: Mapped[float | None] = mapped_column(Float)
    created_at: Mapped[object] = mapped_column(DateTime, default=utcnow, nullable=False)

    scan_event: Mapped[ScanEvent] = relationship(back_populates="evidence")


class SandboxRun(Base):
    __tablename__ = "sandbox_runs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_str)
    scan_event_id: Mapped[str | None] = mapped_column(ForeignKey("scan_events.id", ondelete="SET NULL"))
    sandbox_type: Mapped[str] = mapped_column(String(24), nullable=False)
    url: Mapped[str] = mapped_column(Text, nullable=False)
    final_url: Mapped[str | None] = mapped_column(Text)
    execution_status: Mapped[str] = mapped_column(String(32), nullable=False)
    ok: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    status_code: Mapped[int | None] = mapped_column(Integer)
    resolved_ip: Mapped[str | None] = mapped_column(String(80))
    content_type: Mapped[str | None] = mapped_column(String(200))
    bytes_read: Mapped[int | None] = mapped_column(Integer)
    page_title: Mapped[str | None] = mapped_column(Text)
    elapsed_ms: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    tls: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    page_signals: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    redirects: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    issues: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    scan_steps: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    network_events: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    browser_events: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    canary: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    created_at: Mapped[object] = mapped_column(DateTime, default=utcnow, nullable=False)


class AdminJob(Base):
    __tablename__ = "admin_jobs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_str)
    job_type: Mapped[str] = mapped_column(String(40), nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="queued", index=True, nullable=False)
    progress: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    current_step: Mapped[str | None] = mapped_column(Text)
    message: Mapped[str | None] = mapped_column(Text)
    spec_id: Mapped[str | None] = mapped_column(String(200), index=True)
    data_path: Mapped[str | None] = mapped_column(Text)
    models: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    started_by_user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    result: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    error: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[object] = mapped_column(DateTime, default=utcnow, nullable=False)
    started_at: Mapped[object | None] = mapped_column(DateTime)
    completed_at: Mapped[object | None] = mapped_column(DateTime)
    updated_at: Mapped[object] = mapped_column(
        DateTime, default=utcnow, onupdate=utcnow, nullable=False
    )


class AdminJobEvent(Base):
    __tablename__ = "admin_job_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_str)
    job_id: Mapped[str] = mapped_column(ForeignKey("admin_jobs.id", ondelete="CASCADE"), index=True)
    level: Mapped[str] = mapped_column(String(20), default="info", nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    extra_metadata: Mapped[dict] = mapped_column("metadata", JSON, default=dict, nullable=False)
    created_at: Mapped[object] = mapped_column(DateTime, default=utcnow, nullable=False)


class ModelVersion(Base):
    __tablename__ = "model_versions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_str)
    model_name: Mapped[str] = mapped_column(String(160), index=True, nullable=False)
    modality: Mapped[str] = mapped_column(String(32), nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="candidate", index=True, nullable=False)
    artifact_uri: Mapped[str] = mapped_column(Text, nullable=False)
    metadata_uri: Mapped[str | None] = mapped_column(Text)
    tokenizer_uri: Mapped[str | None] = mapped_column(Text)
    training_dataset_uri: Mapped[str | None] = mapped_column(Text)
    validation_dataset_uri: Mapped[str | None] = mapped_column(Text)
    metrics: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    f1: Mapped[float | None] = mapped_column(Float)
    accuracy: Mapped[float | None] = mapped_column(Float)
    precision_score: Mapped[float | None] = mapped_column(Float)
    recall: Mapped[float | None] = mapped_column(Float)
    trained_by_job_id: Mapped[str | None] = mapped_column(ForeignKey("admin_jobs.id", ondelete="SET NULL"))
    promoted_at: Mapped[object | None] = mapped_column(DateTime)
    created_at: Mapped[object] = mapped_column(DateTime, default=utcnow, nullable=False)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_str)
    actor_user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    actor_api_key_id: Mapped[str | None] = mapped_column(ForeignKey("api_keys.id", ondelete="SET NULL"))
    actor_channel: Mapped[str] = mapped_column(String(32), nullable=False)
    action: Mapped[str] = mapped_column(String(160), index=True, nullable=False)
    resource_type: Mapped[str | None] = mapped_column(String(80))
    resource_id: Mapped[str | None] = mapped_column(String(36))
    source_ip_hash: Mapped[str | None] = mapped_column(String(64))
    user_agent_hash: Mapped[str | None] = mapped_column(String(64))
    extra_metadata: Mapped[dict] = mapped_column("metadata", JSON, default=dict, nullable=False)
    created_at: Mapped[object] = mapped_column(DateTime, default=utcnow, nullable=False)


class UserFeedback(Base):
    __tablename__ = "user_feedback"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_str)
    scan_event_id: Mapped[str] = mapped_column(ForeignKey("scan_events.id", ondelete="CASCADE"))
    user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    label: Mapped[str] = mapped_column(String(40), nullable=False)
    corrected_risk_level: Mapped[str | None] = mapped_column(String(32))
    comment: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[object] = mapped_column(DateTime, default=utcnow, nullable=False)
