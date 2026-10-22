"""Explicit engine/session ownership; schema changes belong to Alembic."""
from collections.abc import Iterator

from fastapi import Request
from sqlalchemy import Engine, create_engine, event
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker
from sqlalchemy.pool import StaticPool


class Base(DeclarativeBase):
    pass


def make_engine(database_url: str) -> Engine:
    # Local MVP supports SQLite only. A hosted database needs separate acceptance.
    if not database_url.startswith("sqlite:"):
        raise ValueError("This MVP requires a SQLite DATABASE_URL.")
    options = {"connect_args": {"check_same_thread": False, "timeout": 10}}
    if database_url in {"sqlite://", "sqlite:///:memory:"}:
        options["poolclass"] = StaticPool
    engine = create_engine(database_url, **options)

    @event.listens_for(engine, "connect")
    def enable_foreign_keys(connection, _record):
        cursor = connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    return engine


def session_factory(engine: Engine) -> sessionmaker[Session]:
    return sessionmaker(bind=engine, expire_on_commit=False)


def get_session(request: Request) -> Iterator[Session]:
    # Routes explicitly commit successful mutations; exceptions roll back on close.
    with request.app.state.sessions() as session:
        yield session
