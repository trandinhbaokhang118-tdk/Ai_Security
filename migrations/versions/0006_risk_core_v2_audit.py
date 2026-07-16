"""Add Risk Core v2 audit columns to scan events.

Revision ID: 0006_risk_core_v2_audit
Revises: 0005_subscription_sepay_qr
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0006_risk_core_v2_audit"
down_revision = "0005_subscription_sepay_qr"
branch_labels = None
depends_on = None


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    columns = {column["name"] for column in inspector.get_columns("scan_events")}
    additions = (
        ("schema_version", sa.String(16)),
        ("scoring_version", sa.String(64)),
        ("raw_score", sa.Float()),
        ("final_score", sa.Float()),
        ("risk_core_trace", sa.JSON()),
    )
    for name, column_type in additions:
        if name not in columns:
            op.add_column("scan_events", sa.Column(name, column_type, nullable=True))


def downgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    columns = {column["name"] for column in inspector.get_columns("scan_events")}
    for name in ("risk_core_trace", "final_score", "raw_score", "scoring_version", "schema_version"):
        if name in columns:
            op.drop_column("scan_events", name)
