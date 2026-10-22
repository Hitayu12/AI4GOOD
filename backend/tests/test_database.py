from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
from alembic.migration import MigrationContext
from alembic.autogenerate import compare_metadata
from sqlalchemy import inspect, insert, select
from sqlalchemy.exc import IntegrityError

from app.database import Base, make_engine, session_factory
from app.models import AuthToken, User


@pytest.fixture
def migrated(tmp_path):
    # Always override config: never migrate a developer's DATABASE_URL in tests.
    url = f"sqlite:///{tmp_path / 'isolated.db'}"
    config = Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))
    config.attributes["database_url"] = url
    command.upgrade(config, "head")
    engine = make_engine(url)
    try:
        yield config, engine, url
    finally:
        engine.dispose()


def test_repeatable_migration_and_metadata(migrated):
    config, engine, _ = migrated
    command.upgrade(config, "head")
    assert {"users", "auth_tokens"} <= set(inspect(engine).get_table_names())
    with engine.connect() as connection:
        assert compare_metadata(MigrationContext.configure(connection), Base.metadata) == []
    command.downgrade(config, "base")
    assert "users" not in inspect(engine).get_table_names()
    command.upgrade(config, "head")
    assert "users" in inspect(engine).get_table_names()


def test_persistence_and_cascade(migrated):
    _, engine, url = migrated
    with session_factory(engine)() as session:
        user = User(email="test@example.com", password_hash="test-only-placeholder")
        session.add(user)
        session.flush()
        user_id = user.id
        session.add(AuthToken(token_hash="a" * 64, user_id=user_id, created_at=10, expires_at=20))
        session.commit()
    engine.dispose()
    reopened = make_engine(url)
    try:
        with session_factory(reopened)() as session:
            user = session.get(User, user_id)
            assert user.email == "test@example.com"
            assert session.get(AuthToken, "a" * 64).expires_at == 20
            session.delete(user)
            session.commit()
            assert session.scalar(select(AuthToken.token_hash)) is None
    finally:
        reopened.dispose()


@pytest.mark.parametrize("values", [
    {"email": "UPPER@example.com"}, {"email": " test@example.com"},
    {"email": "a"}, {"email": "x" * 255}, {"password_hash": ""},
])
def test_user_constraints(migrated, values):
    _, engine, _ = migrated
    row = dict(id="user", email="test@example.com", password_hash="test-only")
    row.update(values)
    with pytest.raises(IntegrityError), engine.begin() as connection:
        connection.execute(insert(User).values(**row))


def test_duplicate_email_and_rollback(migrated):
    _, engine, _ = migrated
    factory = session_factory(engine)
    with factory() as session:
        session.add(User(email="test@example.com", password_hash="test-only"))
        session.commit()
    with pytest.raises(IntegrityError), factory() as session:
        session.add(User(email="test@example.com", password_hash="test-only"))
        session.commit()
    with factory() as session:
        session.add(User(email="uncommitted@example.com", password_hash="test-only"))
        session.flush()
    with factory() as session:
        assert session.scalar(select(User.id).where(User.email == "uncommitted@example.com")) is None


@pytest.mark.parametrize("overrides", [
    {"user_id": "missing"}, {"token_hash": "plaintext"}, {"token_hash": "g" * 64},
    {"expires_at": 10}, {"created_at": -1}, {"revoked_at": 9},
])
def test_token_constraints(migrated, overrides):
    _, engine, _ = migrated
    with engine.begin() as connection:
        connection.execute(insert(User).values(id="user", email="test@example.com", password_hash="test-only"))
    row = dict(token_hash="b" * 64, user_id="user", created_at=10, expires_at=20)
    row.update(overrides)
    with pytest.raises(IntegrityError), engine.begin() as connection:
        connection.execute(insert(AuthToken).values(**row))
