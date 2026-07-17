"""Add persistent OAuth grants for remote MCP clients.

Revision ID: 0007_mcp_oauth
Revises: 0006_risk_core_v2_audit
"""

from alembic import op
import sqlalchemy as sa

revision = "0007_mcp_oauth"
down_revision = "0006_risk_core_v2_audit"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table("oauth_clients", sa.Column("client_id", sa.String(160), primary_key=True), sa.Column("client_secret_hash", sa.String(64)), sa.Column("metadata", sa.JSON(), nullable=False), sa.Column("created_at", sa.DateTime(), nullable=False))
    op.create_table("oauth_authorization_requests", sa.Column("id", sa.String(64), primary_key=True), sa.Column("client_id", sa.String(160), nullable=False), sa.Column("redirect_uri", sa.Text(), nullable=False), sa.Column("state", sa.Text()), sa.Column("scopes", sa.JSON(), nullable=False), sa.Column("code_challenge", sa.String(180), nullable=False), sa.Column("resource", sa.Text()), sa.Column("expires_at", sa.DateTime(), nullable=False), sa.Column("consumed_at", sa.DateTime()), sa.Column("created_at", sa.DateTime(), nullable=False))
    op.create_index("ix_oauth_authorization_requests_client_id", "oauth_authorization_requests", ["client_id"])
    op.create_index("ix_oauth_authorization_requests_expires_at", "oauth_authorization_requests", ["expires_at"])
    op.create_table("oauth_authorization_codes", sa.Column("code_hash", sa.String(64), primary_key=True), sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False), sa.Column("client_id", sa.String(160), nullable=False), sa.Column("redirect_uri", sa.Text(), nullable=False), sa.Column("scopes", sa.JSON(), nullable=False), sa.Column("code_challenge", sa.String(180), nullable=False), sa.Column("resource", sa.Text()), sa.Column("expires_at", sa.DateTime(), nullable=False), sa.Column("used_at", sa.DateTime()), sa.Column("created_at", sa.DateTime(), nullable=False))
    op.create_index("ix_oauth_authorization_codes_user_id", "oauth_authorization_codes", ["user_id"])
    op.create_index("ix_oauth_authorization_codes_client_id", "oauth_authorization_codes", ["client_id"])
    op.create_index("ix_oauth_authorization_codes_expires_at", "oauth_authorization_codes", ["expires_at"])
    op.create_table("oauth_tokens", sa.Column("id", sa.String(36), primary_key=True), sa.Column("family_id", sa.String(36), nullable=False), sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False), sa.Column("client_id", sa.String(160), nullable=False), sa.Column("access_token_hash", sa.String(64), nullable=False, unique=True), sa.Column("refresh_token_hash", sa.String(64), nullable=False, unique=True), sa.Column("scopes", sa.JSON(), nullable=False), sa.Column("resource", sa.Text()), sa.Column("access_expires_at", sa.DateTime(), nullable=False), sa.Column("refresh_expires_at", sa.DateTime(), nullable=False), sa.Column("revoked_at", sa.DateTime()), sa.Column("rotated_at", sa.DateTime()), sa.Column("created_at", sa.DateTime(), nullable=False))
    for col in ("family_id", "user_id", "client_id", "access_token_hash", "refresh_token_hash", "access_expires_at", "refresh_expires_at"):
        op.create_index(f"ix_oauth_tokens_{col}", "oauth_tokens", [col])


def downgrade() -> None:
    op.drop_table("oauth_tokens")
    op.drop_table("oauth_authorization_codes")
    op.drop_table("oauth_authorization_requests")
    op.drop_table("oauth_clients")
