"""Add private EXE delivery and telemetry fields to cloud sandbox sessions."""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0012_cloud_sandbox_sample_delivery"
down_revision = "0011_ai_context_weight_setting"
branch_labels = None
depends_on = None


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    existing = {column["name"] for column in inspector.get_columns("cloud_sandbox_sessions")}
    additions = [
        ("agent_token_hash", sa.String(length=64)), ("sample_filename", sa.String(length=260)),
        ("sample_storage_path", sa.Text()), ("sample_sha256", sa.String(length=64)),
        ("sample_size", sa.Integer()), ("sample_status", sa.String(length=32)),
        ("sample_report", sa.JSON()), ("sample_uploaded_at", sa.DateTime()),
        ("sample_completed_at", sa.DateTime()),
    ]
    for name, column_type in additions:
        if name not in existing:
            nullable = name not in {"sample_status", "sample_report"}
            server_default = (
                sa.text("'none'")
                if name == "sample_status"
                else sa.text("'{}'")
                if name == "sample_report"
                else None
            )
            op.add_column(
                "cloud_sandbox_sessions",
                sa.Column(name, column_type, nullable=nullable, server_default=server_default),
            )
    op.create_index("ix_cloud_sandbox_sessions_sample_sha256", "cloud_sandbox_sessions", ["sample_sha256"])
    op.create_index("ix_cloud_sandbox_sessions_sample_status", "cloud_sandbox_sessions", ["sample_status"])


def downgrade() -> None:
    op.drop_index("ix_cloud_sandbox_sessions_sample_status", table_name="cloud_sandbox_sessions")
    op.drop_index("ix_cloud_sandbox_sessions_sample_sha256", table_name="cloud_sandbox_sessions")
    for name in ("sample_completed_at", "sample_uploaded_at", "sample_report", "sample_status", "sample_size", "sample_sha256", "sample_storage_path", "sample_filename", "agent_token_hash"):
        op.drop_column("cloud_sandbox_sessions", name)
