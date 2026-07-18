"""Add encrypted Gmail OAuth connections and single-use state records.

Revision ID: 0010_gmail_oauth
Revises: 0009_ai_plan_entitlements
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0010_gmail_oauth"
down_revision = "0009_ai_plan_entitlements"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "gmail_oauth_states",
        sa.Column("state_hash", sa.String(length=64), primary_key=True),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("code_verifier_ciphertext", sa.Text(), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("consumed_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_gmail_oauth_states_user_id", "gmail_oauth_states", ["user_id"])
    op.create_index("ix_gmail_oauth_states_expires_at", "gmail_oauth_states", ["expires_at"])
    op.create_table(
        "gmail_connections",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("gmail_address", sa.String(length=320), nullable=False),
        sa.Column("access_token_ciphertext", sa.Text(), nullable=False),
        sa.Column("refresh_token_ciphertext", sa.Text(), nullable=False),
        sa.Column("scopes", sa.JSON(), nullable=False),
        sa.Column("token_expires_at", sa.DateTime(), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("last_used_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("user_id", name="uq_gmail_connection_user"),
    )
    op.create_index("ix_gmail_connections_user_id", "gmail_connections", ["user_id"])
    op.create_index("ix_gmail_connections_token_expires_at", "gmail_connections", ["token_expires_at"])


def downgrade() -> None:
    op.drop_table("gmail_connections")
    op.drop_table("gmail_oauth_states")
