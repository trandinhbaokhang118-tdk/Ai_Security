"""Persist production sandbox tiers and session entitlement fields.

Revision ID: 0004_sandbox_tiers
Revises: 0003_production_hardening
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0004_sandbox_tiers"
down_revision = "0003_production_hardening"
branch_labels = None
depends_on = None


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    tables = set(inspector.get_table_names())
    if "payment_orders" not in tables:
        op.create_table("payment_orders",
            sa.Column("id", sa.String(36), primary_key=True), sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
            sa.Column("reference", sa.String(40), nullable=False, unique=True), sa.Column("amount_vnd", sa.Integer(), nullable=False), sa.Column("credits", sa.Integer(), nullable=False, server_default="1"),
            sa.Column("status", sa.String(24), nullable=False, server_default="pending"), sa.Column("provider", sa.String(40), nullable=False, server_default="sepay"),
            sa.Column("provider_transaction_id", sa.String(160), unique=True), sa.Column("provider_payload", sa.JSON(), nullable=False), sa.Column("paid_at", sa.DateTime()), sa.Column("created_at", sa.DateTime(), nullable=False))
        op.create_index("ix_payment_orders_reference", "payment_orders", ["reference"], unique=True)
    if "sandbox_wallets" not in tables:
        op.create_table("sandbox_wallets", sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True), sa.Column("credits", sa.Integer(), nullable=False, server_default="0"), sa.Column("updated_at", sa.DateTime(), nullable=False))
    if "cloud_sandbox_sessions" not in tables:
        op.create_table("cloud_sandbox_sessions",
            sa.Column("id", sa.String(36), primary_key=True), sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
            sa.Column("status", sa.String(24), nullable=False), sa.Column("provider", sa.String(24), nullable=False), sa.Column("sandbox_tier", sa.String(24), nullable=False, server_default="pro"),
            sa.Column("provider_instance_id", sa.String(100), unique=True), sa.Column("remote_url", sa.Text()), sa.Column("error", sa.Text()), sa.Column("expires_at", sa.DateTime(), nullable=False),
            sa.Column("terminated_at", sa.DateTime()), sa.Column("created_at", sa.DateTime(), nullable=False), sa.Column("updated_at", sa.DateTime(), nullable=False))
        op.create_index("ix_cloud_sandbox_sessions_user_id", "cloud_sandbox_sessions", ["user_id"])
        op.create_index("ix_cloud_sandbox_sessions_status", "cloud_sandbox_sessions", ["status"])
        op.create_index("ix_cloud_sandbox_sessions_sandbox_tier", "cloud_sandbox_sessions", ["sandbox_tier"])
    else:
        columns = {column["name"] for column in inspector.get_columns("cloud_sandbox_sessions")}
        if "sandbox_tier" not in columns:
            op.add_column("cloud_sandbox_sessions", sa.Column("sandbox_tier", sa.String(24), nullable=False, server_default="pro"))
            op.create_index("ix_cloud_sandbox_sessions_sandbox_tier", "cloud_sandbox_sessions", ["sandbox_tier"])


def downgrade() -> None:
    op.drop_table("cloud_sandbox_sessions")
    op.drop_table("sandbox_wallets")
    op.drop_table("payment_orders")
