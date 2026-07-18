"""initial persistence schema

Revision ID: 0001_initial_persistence
Revises:
Create Date: 2026-07-09
"""

from __future__ import annotations

from alembic import op

from backend import models  # noqa: F401
from backend.db import Base

revision = "0001_initial_persistence"
down_revision = None
branch_labels = None
depends_on = None

# Never call ``create_all`` against every table in the live ORM here. New ORM
# models are imported when Alembic starts, so doing that would silently move
# future tables into revision 0001 and make their real migrations fail with
# DuplicateTable on a clean database. Keep this exclusion list aligned with the
# revisions that own these tables.
_TABLES_CREATED_BY_LATER_REVISIONS = {
    # 0004_sandbox_tiers
    "cloud_sandbox_sessions",
    "payment_orders",
    "sandbox_wallets",
    # 0007_mcp_oauth
    "oauth_authorization_codes",
    "oauth_authorization_requests",
    "oauth_clients",
    "oauth_tokens",
    # 0008_url_intelligence_sources
    "threat_feed_indicators",
    "threat_feed_sync_state",
    "url_telemetry_observations",
    # 0010_gmail_oauth
    "gmail_connections",
    "gmail_oauth_states",
}


def _initial_tables():
    return [
        table
        for table in Base.metadata.sorted_tables
        if table.name not in _TABLES_CREATED_BY_LATER_REVISIONS
    ]


def upgrade() -> None:
    Base.metadata.create_all(bind=op.get_bind(), tables=_initial_tables())


def downgrade() -> None:
    Base.metadata.drop_all(bind=op.get_bind(), tables=list(reversed(_initial_tables())))
