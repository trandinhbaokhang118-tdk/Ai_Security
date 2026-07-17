"""Add normalized local threat-feed storage and sync audit state.

Revision ID: 0008_threat_feed_pipeline
Revises: 0007_url_telemetry_observations
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0008_threat_feed_pipeline"
down_revision = "0007_url_telemetry_observations"
branch_labels = None
depends_on = None


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    tables = set(inspector.get_table_names())
    if "threat_feed_indicators" not in tables:
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
        for column in (
            "source",
            "source_ref",
            "exact_url_key",
            "campaign_key",
            "registrable_domain",
            "last_seen_at",
            "expires_at",
        ):
            op.create_index(
                f"ix_threat_feed_indicators_{column}",
                "threat_feed_indicators",
                [column],
            )

    if "threat_feed_sync_state" not in tables:
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
        op.create_index(
            "ix_threat_feed_sync_state_last_success_at",
            "threat_feed_sync_state",
            ["last_success_at"],
        )
        op.create_index(
            "ix_threat_feed_sync_state_next_allowed_at",
            "threat_feed_sync_state",
            ["next_allowed_at"],
        )


def downgrade() -> None:
    op.drop_table("threat_feed_sync_state")
    op.drop_table("threat_feed_indicators")
