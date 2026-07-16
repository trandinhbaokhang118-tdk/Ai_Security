"""Add subscription package fields to SePay payment orders.

Revision ID: 0005_subscription_sepay_qr
Revises: 0004_sandbox_tiers
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0005_subscription_sepay_qr"
down_revision = "0004_sandbox_tiers"
branch_labels = None
depends_on = None


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    columns = {column["name"] for column in inspector.get_columns("payment_orders")}
    if "plan_tier" not in columns:
        op.add_column("payment_orders", sa.Column("plan_tier", sa.String(32), nullable=True))
        op.create_index("ix_payment_orders_plan_tier", "payment_orders", ["plan_tier"])
    if "billing_period" not in columns:
        op.add_column("payment_orders", sa.Column("billing_period", sa.String(16), nullable=True))
    if "expires_at" not in columns:
        op.add_column("payment_orders", sa.Column("expires_at", sa.DateTime(), nullable=True))
        op.create_index("ix_payment_orders_expires_at", "payment_orders", ["expires_at"])


def downgrade() -> None:
    op.drop_index("ix_payment_orders_expires_at", table_name="payment_orders")
    op.drop_column("payment_orders", "expires_at")
    op.drop_column("payment_orders", "billing_period")
    op.drop_index("ix_payment_orders_plan_tier", table_name="payment_orders")
    op.drop_column("payment_orders", "plan_tier")
