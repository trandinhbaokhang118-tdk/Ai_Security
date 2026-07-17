"""Add Telegram webhook replay protection.

Revision ID: 0009_misp_telegram_integrations
Revises: 0008_threat_feed_pipeline
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0009_misp_telegram_integrations"
down_revision = "0008_threat_feed_pipeline"
branch_labels = None
depends_on = None


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    if "telegram_update_receipts" in inspector.get_table_names():
        return
    op.create_table(
        "telegram_update_receipts",
        sa.Column("update_id", sa.String(32), primary_key=True),
        sa.Column("chat_id_hash", sa.String(64), nullable=False),
        sa.Column("status", sa.String(24), nullable=False),
        sa.Column("received_at", sa.DateTime(), nullable=False),
        sa.Column("completed_at", sa.DateTime()),
    )
    op.create_index(
        "ix_telegram_update_receipts_chat_id_hash",
        "telegram_update_receipts",
        ["chat_id_hash"],
    )


def downgrade() -> None:
    op.drop_table("telegram_update_receipts")
