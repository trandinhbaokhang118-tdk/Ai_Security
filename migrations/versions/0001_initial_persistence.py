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


def upgrade() -> None:
    Base.metadata.create_all(bind=op.get_bind())


def downgrade() -> None:
    Base.metadata.drop_all(bind=op.get_bind())
