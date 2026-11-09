"""Owned simulation cursors, visited equity snapshots, atomic replay receipts."""
from alembic import op
import sqlalchemy as sa

revision = "0003_simulations"
down_revision = "0002_datasets"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table("simulations",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("dataset_id", sa.String(64), sa.ForeignKey("datasets.id"), nullable=False),
        sa.Column("dataset_manifest_sha256", sa.String(64), nullable=False),
        *(sa.Column(name, sa.String(10), nullable=False)
          for name in ("start_session", "end_session", "current_session")),
        sa.Column("current_time", sa.String(20), nullable=False),
        sa.Column("initial_cash_cents", sa.BigInteger(), nullable=False),
        sa.Column("cash_cents", sa.BigInteger(), nullable=False),
        sa.Column("status", sa.String(12), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.CheckConstraint("typeof(initial_cash_cents) = 'integer' AND initial_cash_cents BETWEEN 1 AND 100000000000",
                           name="ck_simulations_initial_cash"),
        sa.CheckConstraint("typeof(cash_cents) = 'integer' AND cash_cents >= 0", name="ck_simulations_cash"),
        sa.CheckConstraint("typeof(version) = 'integer' AND version BETWEEN 1 AND 1000000000", name="ck_simulations_version"),
        sa.CheckConstraint("status IN ('active', 'completed')", name="ck_simulations_status"),
        sa.CheckConstraint("start_session <= current_session AND current_session <= end_session",
                           name="ck_simulations_range"),
        sa.CheckConstraint("(status = 'completed') = (current_session = end_session)", name="ck_simulations_completion"),
        *(sa.ForeignKeyConstraint(["dataset_id", name], ["dataset_sessions.dataset_id", "dataset_sessions.session_date"],
                                  name=f"fk_simulations_{name}")
          for name in ("start_session", "end_session", "current_session")))
    op.create_index("ix_simulations_user_id", "simulations", ["user_id"])
    op.create_table("equity_snapshots",
        sa.Column("simulation_id", sa.String(36), sa.ForeignKey("simulations.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("session_date", sa.String(10), primary_key=True),
        sa.Column("total_equity_cents", sa.BigInteger(), nullable=False),
        sa.CheckConstraint("typeof(total_equity_cents) = 'integer' AND total_equity_cents >= 0",
                           name="ck_equity_snapshots_equity"))
    op.create_table("idempotency_receipts",
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("route", sa.String(80), primary_key=True),
        sa.Column("resource_id", sa.String(64), primary_key=True),
        sa.Column("key", sa.String(128), primary_key=True),
        sa.Column("request_sha256", sa.String(64), nullable=False),
        sa.Column("http_status", sa.Integer(), nullable=False),
        sa.Column("response_json", sa.Text(), nullable=False),
        sa.CheckConstraint("length(request_sha256) = 64", name="ck_receipts_fingerprint"),
        sa.CheckConstraint("http_status IN (200, 201)", name="ck_receipts_status"))


def downgrade():
    op.drop_table("idempotency_receipts")
    op.drop_table("equity_snapshots")
    op.drop_table("simulations")
