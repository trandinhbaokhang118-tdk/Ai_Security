"""Add local threat feeds and privacy-preserving URL telemetry.

Revision ID: 0008_url_intelligence_sources
Revises: 0007_mcp_oauth
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0008_url_intelligence_sources"
down_revision = "0007_mcp_oauth"
branch_labels = None
depends_on = None


def _indexes(table: str, columns: tuple[str, ...]) -> None:
    for column in columns:
        op.create_index(f"ix_{table}_{column}", table, [column])


def upgrade() -> None:
    existing = set(sa.inspect(op.get_bind()).get_table_names())
    if "url_telemetry_observations" not in existing:
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
        _indexes(
            "url_telemetry_observations",
            (
                "sensor_hash",
                "exact_url_key",
                "campaign_key",
                "registrable_domain",
                "verdict",
                "observed_at",
                "expires_at",
            ),
        )

    if "threat_feed_indicators" not in existing:
        op.create_table(
            "threat_feed_indicators",
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column("source", sa.String(32), nullable=False),
            sa.Column("source_ref", sa.String(160)),
            sa.Column("indicator_type", sa.String(24), nullable=False),
            sa.Column("normalized_value", sa.Text(), nullable=False),
            sa.Column("exact_url_key", sa.String(64), nullable=False),
            sa.Column("campaign_key", sa.String(64), nullable=False),
            sa.Column("registrable_domain", sa.String(253), nullable=False),
            sa.Column("verdict", sa.String(24), nullable=False),
            sa.Column("confidence", sa.Float(), nullable=False),
            sa.Column("tags", sa.JSON(), nullable=False),
            sa.Column("metadata", sa.JSON(), nullable=False),
            sa.Column("first_seen_at", sa.DateTime(), nullable=False),
            sa.Column("last_seen_at", sa.DateTime(), nullable=False),
            sa.Column("expires_at", sa.DateTime(), nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("updated_at", sa.DateTime(), nullable=False),
            sa.UniqueConstraint("source", "exact_url_key", name="uq_threat_feed_source_url"),
        )
        _indexes(
            "threat_feed_indicators",
            (
                "source",
                "source_ref",
                "exact_url_key",
                "campaign_key",
                "registrable_domain",
                "last_seen_at",
                "expires_at",
            ),
        )

    if "threat_feed_sync_state" not in existing:
        op.create_table(
            "threat_feed_sync_state",
            sa.Column("source", sa.String(32), primary_key=True),
            sa.Column("endpoint", sa.String(255), nullable=False),
            sa.Column("status", sa.String(24), nullable=False),
            sa.Column("etag", sa.String(255)),
            sa.Column("last_modified", sa.String(255)),
            sa.Column("last_attempt_at", sa.DateTime()),
            sa.Column("last_success_at", sa.DateTime()),
            sa.Column("next_allowed_at", sa.DateTime()),
            sa.Column("records_seen", sa.Integer(), nullable=False),
            sa.Column("records_upserted", sa.Integer(), nullable=False),
            sa.Column("error", sa.Text()),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("updated_at", sa.DateTime(), nullable=False),
        )
        _indexes("threat_feed_sync_state", ("last_success_at", "next_allowed_at"))


def downgrade() -> None:
    existing = set(sa.inspect(op.get_bind()).get_table_names())
    for table in (
        "threat_feed_sync_state",
        "threat_feed_indicators",
        "url_telemetry_observations",
    ):
        if table in existing:
            op.drop_table(table)
