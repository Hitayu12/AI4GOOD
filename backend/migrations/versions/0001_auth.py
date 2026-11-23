"""Initial users and hashed opaque-token storage."""
from alembic import op
import sqlalchemy as sa

revision = "0001_auth"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "users",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("email", sa.String(254), nullable=False),
        sa.Column("password_hash", sa.String(), nullable=False),
        sa.UniqueConstraint("email"),
        sa.CheckConstraint("length(email) BETWEEN 3 AND 254", name="ck_users_email_length"),
        sa.CheckConstraint("email = lower(trim(email))", name="ck_users_email_normalized"),
        sa.CheckConstraint("length(password_hash) > 0", name="ck_users_password_hash"),
    )
    op.create_table(
        "auth_tokens",
        sa.Column("token_hash", sa.String(64), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_at", sa.Integer(), nullable=False),
        sa.Column("expires_at", sa.Integer(), nullable=False),
        sa.Column("revoked_at", sa.Integer(), nullable=True),
        sa.CheckConstraint("length(token_hash) = 64 AND token_hash NOT GLOB '*[^0-9a-f]*'", name="ck_auth_tokens_hash"),
        sa.CheckConstraint("expires_at > created_at", name="ck_auth_tokens_expiry"),
        sa.CheckConstraint("created_at >= 0", name="ck_auth_tokens_created"),
        sa.CheckConstraint("revoked_at IS NULL OR revoked_at >= created_at", name="ck_auth_tokens_revocation"),
    )
    op.create_index("ix_auth_tokens_user_id", "auth_tokens", ["user_id"])
    op.create_index("ix_auth_tokens_expires_at", "auth_tokens", ["expires_at"])


def downgrade():
    op.drop_table("auth_tokens")
    op.drop_table("users")
