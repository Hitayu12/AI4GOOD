"""Authentication storage and immutable versioned historical market datasets."""
from uuid import uuid4

from sqlalchemy import BigInteger, CheckConstraint, ForeignKey, ForeignKeyConstraint, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint("length(email) BETWEEN 3 AND 254", name="ck_users_email_length"),
        CheckConstraint("email = lower(trim(email))", name="ck_users_email_normalized"),
        CheckConstraint("length(password_hash) > 0", name="ck_users_password_hash"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    email: Mapped[str] = mapped_column(String(254), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String, nullable=False)


class AuthToken(Base):
    __tablename__ = "auth_tokens"
    __table_args__ = (
        CheckConstraint(
            "length(token_hash) = 64 AND token_hash NOT GLOB '*[^0-9a-f]*'",
            name="ck_auth_tokens_hash",
        ),
        CheckConstraint("expires_at > created_at", name="ck_auth_tokens_expiry"),
        CheckConstraint("created_at >= 0", name="ck_auth_tokens_created"),
        CheckConstraint(
            "revoked_at IS NULL OR revoked_at >= created_at", name="ck_auth_tokens_revocation"
        ),
    )

    # Only a SHA-256 digest is stored; never the raw bearer token.
    token_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # UTC Unix seconds avoid SQLite's timezone-stripping datetime conversion.
    created_at: Mapped[int] = mapped_column(Integer, nullable=False)
    expires_at: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    revoked_at: Mapped[int | None] = mapped_column(Integer, nullable=True)


class Dataset(Base):
    __tablename__ = "datasets"
    __table_args__ = (
        CheckConstraint("sealed IN (0, 1)", name="ck_datasets_sealed"),
        CheckConstraint("length(manifest_sha256) = 64", name="ck_datasets_manifest_hash"),
    )
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    manifest_json: Mapped[str] = mapped_column(Text, nullable=False)
    manifest_sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    sealed: Mapped[int] = mapped_column(Integer, nullable=False)


class DatasetInstrument(Base):
    __tablename__ = "dataset_instruments"
    dataset_id: Mapped[str] = mapped_column(ForeignKey("datasets.id"), primary_key=True)
    symbol: Mapped[str] = mapped_column(String(12), primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)


class DatasetSession(Base):
    __tablename__ = "dataset_sessions"
    __table_args__ = (
        CheckConstraint("open_at < close_at", name="ck_dataset_sessions_times"),
    )
    dataset_id: Mapped[str] = mapped_column(ForeignKey("datasets.id"), primary_key=True)
    session_date: Mapped[str] = mapped_column(String(10), primary_key=True)
    open_at: Mapped[str] = mapped_column(String(20), nullable=False)
    close_at: Mapped[str] = mapped_column(String(20), nullable=False)


class MarketBar(Base):
    __tablename__ = "market_bars"
    __table_args__ = (
        ForeignKeyConstraint(["dataset_id", "symbol"],
                             ["dataset_instruments.dataset_id", "dataset_instruments.symbol"]),
        ForeignKeyConstraint(["dataset_id", "session_date"],
                             ["dataset_sessions.dataset_id", "dataset_sessions.session_date"]),
        *(CheckConstraint(f"typeof({field}) = 'integer' AND {field} BETWEEN 10000 AND 1000000000000 AND {field} % 10000 = 0",
                          name=f"ck_market_bars_{field}")
          for field in ("open_scaled", "high_scaled", "low_scaled", "close_scaled")),
        CheckConstraint("high_scaled >= open_scaled AND high_scaled >= close_scaled "
                        "AND low_scaled <= open_scaled AND low_scaled <= close_scaled "
                        "AND low_scaled <= high_scaled", name="ck_market_bars_ohlc"),
        CheckConstraint("typeof(volume) = 'integer' AND volume >= 0", name="ck_market_bars_volume"),
    )
    dataset_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    symbol: Mapped[str] = mapped_column(String(12), primary_key=True)
    session_date: Mapped[str] = mapped_column(String(10), primary_key=True)
    open_scaled: Mapped[int] = mapped_column(BigInteger, nullable=False)
    high_scaled: Mapped[int] = mapped_column(BigInteger, nullable=False)
    low_scaled: Mapped[int] = mapped_column(BigInteger, nullable=False)
    close_scaled: Mapped[int] = mapped_column(BigInteger, nullable=False)
    volume: Mapped[int] = mapped_column(BigInteger, nullable=False)


class Simulation(Base):
    __tablename__ = "simulations"
    __table_args__ = (
        CheckConstraint("typeof(initial_cash_cents) = 'integer' AND initial_cash_cents BETWEEN 1 AND 100000000000",
                        name="ck_simulations_initial_cash"),
        CheckConstraint("typeof(cash_cents) = 'integer' AND cash_cents >= 0", name="ck_simulations_cash"),
        CheckConstraint("typeof(version) = 'integer' AND version BETWEEN 1 AND 1000000000", name="ck_simulations_version"),
        CheckConstraint("status IN ('active', 'completed')", name="ck_simulations_status"),
        CheckConstraint("start_session <= current_session AND current_session <= end_session",
                        name="ck_simulations_range"),
        CheckConstraint("(status = 'completed') = (current_session = end_session)", name="ck_simulations_completion"),
        *(ForeignKeyConstraint(["dataset_id", field], ["dataset_sessions.dataset_id", "dataset_sessions.session_date"],
                                name=f"fk_simulations_{field}")
          for field in ("start_session", "end_session", "current_session")),
    )
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    dataset_id: Mapped[str] = mapped_column(ForeignKey("datasets.id"), nullable=False)
    dataset_manifest_sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    start_session: Mapped[str] = mapped_column(String(10), nullable=False)
    end_session: Mapped[str] = mapped_column(String(10), nullable=False)
    current_session: Mapped[str] = mapped_column(String(10), nullable=False)
    current_time: Mapped[str] = mapped_column(String(20), nullable=False)
    initial_cash_cents: Mapped[int] = mapped_column(BigInteger, nullable=False)
    cash_cents: Mapped[int] = mapped_column(BigInteger, nullable=False)
    status: Mapped[str] = mapped_column(String(12), nullable=False)
    version: Mapped[int] = mapped_column(Integer, nullable=False)


class EquitySnapshot(Base):
    __tablename__ = "equity_snapshots"
    __table_args__ = (
        CheckConstraint("typeof(total_equity_cents) = 'integer' AND total_equity_cents >= 0",
                        name="ck_equity_snapshots_equity"),
    )
    simulation_id: Mapped[str] = mapped_column(ForeignKey("simulations.id", ondelete="CASCADE"), primary_key=True)
    session_date: Mapped[str] = mapped_column(String(10), primary_key=True)
    total_equity_cents: Mapped[int] = mapped_column(BigInteger, nullable=False)


class IdempotencyReceipt(Base):
    __tablename__ = "idempotency_receipts"
    __table_args__ = (
        CheckConstraint("length(request_sha256) = 64", name="ck_receipts_fingerprint"),
        CheckConstraint("http_status IN (200, 201)", name="ck_receipts_status"),
    )
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    route: Mapped[str] = mapped_column(String(80), primary_key=True)
    resource_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    key: Mapped[str] = mapped_column(String(128), primary_key=True)
    request_sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    http_status: Mapped[int] = mapped_column(Integer, nullable=False)
    response_json: Mapped[str] = mapped_column(Text, nullable=False)
