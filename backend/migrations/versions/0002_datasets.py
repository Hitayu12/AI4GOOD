"""Immutable versioned historical datasets and scaled-integer OHLCV."""
from alembic import op
import sqlalchemy as sa

revision = "0002_datasets"
down_revision = "0001_auth"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table("datasets",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("manifest_json", sa.Text(), nullable=False),
        sa.Column("manifest_sha256", sa.String(64), nullable=False),
        sa.Column("sealed", sa.Integer(), nullable=False),
        sa.CheckConstraint("sealed IN (0, 1)", name="ck_datasets_sealed"),
        sa.CheckConstraint("length(manifest_sha256) = 64", name="ck_datasets_manifest_hash"))
    op.create_table("dataset_instruments",
        sa.Column("dataset_id", sa.String(64), sa.ForeignKey("datasets.id"), primary_key=True),
        sa.Column("symbol", sa.String(12), primary_key=True),
        sa.Column("name", sa.String(120), nullable=False))
    op.create_table("dataset_sessions",
        sa.Column("dataset_id", sa.String(64), sa.ForeignKey("datasets.id"), primary_key=True),
        sa.Column("session_date", sa.String(10), primary_key=True),
        sa.Column("open_at", sa.String(20), nullable=False),
        sa.Column("close_at", sa.String(20), nullable=False),
        sa.CheckConstraint("open_at < close_at", name="ck_dataset_sessions_times"))
    op.create_table("market_bars",
        sa.Column("dataset_id", sa.String(64), primary_key=True),
        sa.Column("symbol", sa.String(12), primary_key=True),
        sa.Column("session_date", sa.String(10), primary_key=True),
        *(sa.Column(name, sa.BigInteger(), nullable=False)
          for name in ("open_scaled", "high_scaled", "low_scaled", "close_scaled", "volume")),
        sa.ForeignKeyConstraint(["dataset_id", "symbol"],
                                ["dataset_instruments.dataset_id", "dataset_instruments.symbol"]),
        sa.ForeignKeyConstraint(["dataset_id", "session_date"],
                                ["dataset_sessions.dataset_id", "dataset_sessions.session_date"]),
        *(sa.CheckConstraint(f"typeof({name}) = 'integer' AND {name} BETWEEN 10000 AND 1000000000000 AND {name} % 10000 = 0",
                            name=f"ck_market_bars_{name}")
          for name in ("open_scaled", "high_scaled", "low_scaled", "close_scaled")),
        sa.CheckConstraint("high_scaled >= open_scaled AND high_scaled >= close_scaled "
                           "AND low_scaled <= open_scaled AND low_scaled <= close_scaled "
                           "AND low_scaled <= high_scaled", name="ck_market_bars_ohlc"),
        sa.CheckConstraint("typeof(volume) = 'integer' AND volume >= 0", name="ck_market_bars_volume"))
    # Import stages all rows and seals the parent in one transaction. A sealed
    # dataset and all its children are immutable, even through direct SQL.
    op.execute("""CREATE TRIGGER datasets_no_replace BEFORE INSERT ON datasets
        WHEN EXISTS (SELECT 1 FROM datasets WHERE id = NEW.id AND sealed = 1)
        BEGIN SELECT RAISE(ABORT, 'dataset is immutable'); END""")
    for operation in ("UPDATE", "DELETE"):
        op.execute(f"""CREATE TRIGGER datasets_no_{operation.lower()}
            BEFORE {operation} ON datasets WHEN OLD.sealed = 1
            BEGIN SELECT RAISE(ABORT, 'dataset is immutable'); END""")
    for table in ("dataset_instruments", "dataset_sessions", "market_bars"):
        for operation in ("UPDATE", "DELETE"):
            op.execute(f"""CREATE TRIGGER {table}_no_{operation.lower()}
                BEFORE {operation} ON {table}
                BEGIN SELECT RAISE(ABORT, 'dataset is immutable'); END""")
        op.execute(f"""CREATE TRIGGER {table}_sealed_insert BEFORE INSERT ON {table}
            WHEN (SELECT sealed FROM datasets WHERE id = NEW.dataset_id) = 1
            BEGIN SELECT RAISE(ABORT, 'dataset is immutable'); END""")


def downgrade():
    for table in ("market_bars", "dataset_sessions", "dataset_instruments", "datasets"):
        op.drop_table(table)  # SQLite also removes triggers owned by each table.
