"""Add persistent admin control for AI context weighting.

Revision ID: 0011_ai_context_weight_setting
Revises: 0010_gmail_oauth
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0011_ai_context_weight_setting"
down_revision = "0010_gmail_oauth"
branch_labels = None
depends_on = None


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    if "system_settings" in inspector.get_table_names():
        return
    op.create_table(
        "system_settings",
        sa.Column("key", sa.String(length=100), primary_key=True),
        sa.Column("value", sa.Integer(), nullable=False),
        sa.Column("updated_by_user_id", sa.String(length=36), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(
            ["updated_by_user_id"], ["users.id"], ondelete="SET NULL"
        ),
    )
    op.create_index(
        "ix_system_settings_updated_by_user_id",
        "system_settings",
        ["updated_by_user_id"],
    )


def downgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    if "system_settings" not in inspector.get_table_names():
        return
    op.drop_index("ix_system_settings_updated_by_user_id", table_name="system_settings")
    op.drop_table("system_settings")
