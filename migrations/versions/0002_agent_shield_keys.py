"""Agent Shield API key defaults

Revision ID: 0002_agent_shield_keys
Revises: 0001_initial_persistence
Create Date: 2026-07-13
"""

from __future__ import annotations

from alembic import op
from sqlalchemy import text

revision = "0002_agent_shield_keys"
down_revision = "0001_initial_persistence"
branch_labels = None
depends_on = None

_DEFAULT_SCOPES = (
    '["assess:url","assess:content","assess:prompt","assess:file",'
    '"assess:action","mcp:invoke"]'
)


def upgrade() -> None:
    bind = op.get_bind()
    bind.execute(
        text("UPDATE api_keys SET scopes = :scopes WHERE scopes IS NULL OR scopes = :legacy"),
        {"scopes": _DEFAULT_SCOPES, "legacy": '["scan"]'},
    )


def downgrade() -> None:
    bind = op.get_bind()
    bind.execute(
        text("UPDATE api_keys SET scopes = :legacy WHERE scopes = :scopes"),
        {"legacy": '["scan"]', "scopes": _DEFAULT_SCOPES},
    )
