"""Production database constraints and query indexes.

Revision ID: 0003_production_hardening
Revises: 0002_agent_shield_keys
Create Date: 2026-07-14
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0003_production_hardening"
down_revision = "0002_agent_shield_keys"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    indexes = {
        table: {item["name"] for item in inspector.get_indexes(table)}
        for table in ("api_keys", "sessions", "subscriptions", "scan_events", "audit_logs")
    }
    for table, name, columns in (
        ("api_keys", "ix_api_keys_user_status", ["user_id", "status"]),
        ("sessions", "ix_sessions_user_expiry", ["user_id", "expires_at"]),
        (
            "subscriptions",
            "ix_subscriptions_user_status_created",
            ["user_id", "status", "created_at"],
        ),
        ("scan_events", "ix_scan_events_user_created", ["user_id", "created_at"]),
        (
            "scan_events",
            "ix_scan_events_api_key_created",
            ["api_key_id", "created_at"],
        ),
        ("audit_logs", "ix_audit_logs_actor_created", ["actor_user_id", "created_at"]),
        ("audit_logs", "ix_audit_logs_action_created", ["action", "created_at"]),
    ):
        if name not in indexes[table]:
            op.create_index(name, table, columns)

    quota_checks = (
        ("ck_daily_quota_scan_count_nonnegative", "scan_count >= 0"),
        ("ck_daily_quota_limit_nonnegative", "limit_snapshot IS NULL OR limit_snapshot >= 0"),
        (
            "ck_daily_quota_exactly_one_identity",
            "(CASE WHEN user_id IS NULL THEN 0 ELSE 1 END + "
            "CASE WHEN api_key_id IS NULL THEN 0 ELSE 1 END + "
            "CASE WHEN anonymous_id IS NULL THEN 0 ELSE 1 END) = 1",
        ),
    )
    scan_checks = (
        ("ck_scan_event_risk_score", "risk_score >= 0 AND risk_score <= 1"),
        ("ck_scan_event_confidence", "confidence >= 0 AND confidence <= 1"),
        (
            "ck_scan_event_input_size",
            "input_size_bytes IS NULL OR input_size_bytes >= 0",
        ),
    )
    if bind.dialect.name == "sqlite":
        # SQLite cannot ALTER a table to add constraints. Alembic batch mode
        # performs the supported copy-and-move operation while preserving data.
        with op.batch_alter_table("daily_quota_usage") as batch:
            for name, condition in quota_checks:
                batch.create_check_constraint(name, condition)
        with op.batch_alter_table("scan_events") as batch:
            for name, condition in scan_checks:
                batch.create_check_constraint(name, condition)
        with op.batch_alter_table("admin_jobs") as batch:
            batch.create_check_constraint(
                "ck_admin_job_progress", "progress >= 0 AND progress <= 100"
            )
    else:
        for name, condition in quota_checks:
            op.create_check_constraint(name, "daily_quota_usage", condition)
        for name, condition in scan_checks:
            op.create_check_constraint(name, "scan_events", condition)
        op.create_check_constraint(
            "ck_admin_job_progress", "admin_jobs", "progress >= 0 AND progress <= 100"
        )

    # PostgreSQL treats NULL values as distinct in normal UNIQUE constraints. These
    # partial indexes provide the exact conflict targets used by atomic quota UPSERTs.
    if bind.dialect.name == "postgresql":
        op.drop_constraint("uq_quota_user_day", "daily_quota_usage", type_="unique")
        op.drop_constraint("uq_quota_api_key_day", "daily_quota_usage", type_="unique")
        op.drop_constraint("uq_quota_anonymous_day", "daily_quota_usage", type_="unique")
        op.create_index("uq_quota_user_day", "daily_quota_usage", ["user_id", "usage_day"], unique=True, postgresql_where=sa.text("user_id IS NOT NULL"))
        op.create_index("uq_quota_api_key_day", "daily_quota_usage", ["api_key_id", "usage_day"], unique=True, postgresql_where=sa.text("api_key_id IS NOT NULL"))
        op.create_index("uq_quota_anonymous_day", "daily_quota_usage", ["anonymous_id", "usage_day"], unique=True, postgresql_where=sa.text("anonymous_id IS NOT NULL"))


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.drop_index("uq_quota_anonymous_day", table_name="daily_quota_usage")
        op.drop_index("uq_quota_api_key_day", table_name="daily_quota_usage")
        op.drop_index("uq_quota_user_day", table_name="daily_quota_usage")
        op.create_unique_constraint("uq_quota_user_day", "daily_quota_usage", ["user_id", "usage_day"])
        op.create_unique_constraint("uq_quota_api_key_day", "daily_quota_usage", ["api_key_id", "usage_day"])
        op.create_unique_constraint("uq_quota_anonymous_day", "daily_quota_usage", ["anonymous_id", "usage_day"])

    constraints = (
        ("admin_jobs", "ck_admin_job_progress"),
        ("scan_events", "ck_scan_event_input_size"),
        ("scan_events", "ck_scan_event_confidence"),
        ("scan_events", "ck_scan_event_risk_score"),
        ("daily_quota_usage", "ck_daily_quota_exactly_one_identity"),
        ("daily_quota_usage", "ck_daily_quota_limit_nonnegative"),
        ("daily_quota_usage", "ck_daily_quota_scan_count_nonnegative"),
    )
    if bind.dialect.name == "sqlite":
        by_table: dict[str, list[str]] = {}
        for table, name in constraints:
            by_table.setdefault(table, []).append(name)
        for table, names in by_table.items():
            with op.batch_alter_table(table) as batch:
                for name in names:
                    batch.drop_constraint(name, type_="check")
    else:
        for table, name in constraints:
            op.drop_constraint(name, table, type_="check")
    for table, name in (
        ("audit_logs", "ix_audit_logs_action_created"),
        ("audit_logs", "ix_audit_logs_actor_created"),
        ("scan_events", "ix_scan_events_api_key_created"),
        ("scan_events", "ix_scan_events_user_created"),
        ("subscriptions", "ix_subscriptions_user_status_created"),
        ("sessions", "ix_sessions_user_expiry"),
        ("api_keys", "ix_api_keys_user_status"),
    ):
        op.drop_index(name, table_name=table)
