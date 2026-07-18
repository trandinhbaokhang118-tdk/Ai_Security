"""Add server-side AI and deep-analysis quota counters.

Revision ID: 0009_ai_plan_entitlements
Revises: 0008_url_intelligence_sources
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0009_ai_plan_entitlements"
down_revision = "0008_url_intelligence_sources"
branch_labels = None
depends_on = None


def upgrade() -> None:
    columns = {
        column["name"]
        for column in sa.inspect(op.get_bind()).get_columns("daily_quota_usage")
    }
    additions = (
        ("ai_credit_count", sa.Integer(), "0"),
        ("ai_evaluation_count", sa.Integer(), "0"),
        ("ai_explanation_count", sa.Integer(), "0"),
        ("deep_scan_count", sa.Integer(), "0"),
        ("ai_limit_snapshot", sa.Integer(), None),
        ("deep_limit_snapshot", sa.Integer(), None),
        ("last_ai_at", sa.DateTime(), None),
        ("last_deep_at", sa.DateTime(), None),
    )
    for name, column_type, default in additions:
        if name in columns:
            continue
        kwargs = {"nullable": default is None}
        if default is not None:
            kwargs["server_default"] = default
        op.add_column("daily_quota_usage", sa.Column(name, column_type, **kwargs))


def downgrade() -> None:
    columns = {
        column["name"]
        for column in sa.inspect(op.get_bind()).get_columns("daily_quota_usage")
    }
    for name in (
        "last_deep_at",
        "last_ai_at",
        "deep_limit_snapshot",
        "ai_limit_snapshot",
        "deep_scan_count",
        "ai_explanation_count",
        "ai_evaluation_count",
        "ai_credit_count",
    ):
        if name in columns:
            op.drop_column("daily_quota_usage", name)
