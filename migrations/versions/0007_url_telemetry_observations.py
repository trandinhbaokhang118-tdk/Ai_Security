"""Add privacy-preserving multi-sensor URL telemetry.

Revision ID: 0007_url_telemetry_observations
Revises: 0006_risk_core_v2_audit
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0007_url_telemetry_observations"
down_revision = "0006_risk_core_v2_audit"
branch_labels = None
depends_on = None


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    if "url_telemetry_observations" in inspector.get_table_names():
        return
    op.create_table(
        "url_telemetry_observations",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("event_id", sa.String(128), nullable=False),
        sa.Column("sensor_hash", sa.String(64), nullable=False),
        sa.Column("api_key_id", sa.String(36), sa.ForeignKey("api_keys.id", ondelete="SET NULL")),
        sa.Column("exact_url_key", sa.String(64), nullable=False),
        sa.Column("campaign_key", sa.String(64), nullable=False),
        sa.Column("registrable_domain", sa.String(253), nullable=False),
        sa.Column("verdict", sa.String(24), nullable=False),
        sa.Column("event_type", sa.String(24), nullable=False),
        sa.Column("confidence", sa.Float(), nullable=False),
        sa.Column("malware_family", sa.String(120)),
        sa.Column("tags", sa.JSON(), nullable=False),
        sa.Column("observed_at", sa.DateTime(), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.UniqueConstraint("sensor_hash", "event_id", name="uq_url_telemetry_sensor_event"),
    )
    for column in (
        "sensor_hash",
        "exact_url_key",
        "campaign_key",
        "registrable_domain",
        "verdict",
        "observed_at",
        "expires_at",
    ):
        op.create_index(
            f"ix_url_telemetry_observations_{column}",
            "url_telemetry_observations",
            [column],
        )


def downgrade() -> None:
    op.drop_table("url_telemetry_observations")
