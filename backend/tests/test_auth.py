"""HTTP and storage acceptance; all accounts/databases are isolated test data."""
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from pathlib import Path

from alembic import command
from alembic.config import Config
from argon2 import PasswordHasher
from fastapi import Depends
from fastapi.testclient import TestClient
import pytest
from sqlalchemy import select

from app.auth import LoginLimiter, get_current_user, token_digest
from app.config import Settings
from app.errors import APIError
from app.main import create_app
from app.models import AuthToken, User


PASSWORD = "test-only password 123"


@pytest.fixture
def auth_app(tmp_path):
    url = f"sqlite:///{tmp_path / 'auth.db'}"
    config = Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))
    config.attributes["database_url"] = url
    command.upgrade(config, "head")
    app = create_app(Settings(database_url=url, login_max_attempts=100))
    # Exercise the same dependency future protected routes will use.
    @app.get("/test-protected")
    def protected(user=Depends(get_current_user)):
        return {"id": user.id}
    return app


@pytest.fixture
def client(auth_app):
    with TestClient(auth_app) as client:
        yield client


def register(client, email="first@example.com", password=PASSWORD):
    result = client.post("/api/v1/auth/register", json={"email": email, "password": password})
    assert result.status_code == 201, result.text
    return result.json()["user"]


def login(client, email="first@example.com", password=PASSWORD):
    result = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert result.status_code == 200, result.text
    return result.json()["access_token"]


def headers(token):
    return {"Authorization": f"Bearer {token}"}


def test_register_normalize_hash_and_duplicate(client, auth_app):
    user = register(client, "  FIRST@EXAMPLE.COM  ")
    assert set(user) == {"id", "email"}
    assert user["email"] == "first@example.com"
    with auth_app.state.sessions() as session:
        stored = session.get(User, user["id"])
        assert stored.password_hash.startswith("$argon2id$")
        assert PASSWORD not in stored.password_hash
        assert PasswordHasher().verify(stored.password_hash, PASSWORD)
        assert session.scalar(select(AuthToken)) is None  # Registration does not log in.
    duplicate = client.post("/api/v1/auth/register", json={
        "email": "FIRST@example.com", "password": PASSWORD})
    assert duplicate.status_code == 409
    assert duplicate.json()["error"]["code"] == "email_registered"


def test_login_me_storage_and_logout(client, auth_app):
    user = register(client)
    result = client.post("/api/v1/auth/login", json={
        "email": " FIRST@EXAMPLE.COM ", "password": PASSWORD})
    assert result.status_code == 200
    body = result.json()
    assert set(body) == {"access_token", "token_type", "expires_at"}
    assert body["token_type"] == "bearer"
    assert body["expires_at"].endswith("Z")
    raw = body["access_token"]
    assert len(raw) == 43
    with auth_app.state.sessions() as session:
        token = session.get(AuthToken, token_digest(raw))
        assert token is not None and token.user_id == user["id"]
        assert token.token_hash != raw
        assert token.expires_at - token.created_at == 3600
        assert int(datetime.fromisoformat(body["expires_at"].replace("Z", "+00:00")).timestamp()) == token.expires_at
    me = client.get("/api/v1/auth/me", headers=headers(raw))
    assert me.status_code == 200 and me.json() == user
    assert me.headers["cache-control"] == "no-store"
    assert client.get("/test-protected", headers=headers(raw)).json() == {"id": user["id"]}
    logout = client.post("/api/v1/auth/logout", headers=headers(raw))
    assert logout.status_code == 204 and logout.content == b""
    with auth_app.state.sessions() as session:
        assert session.get(AuthToken, token_digest(raw)).revoked_at is not None
    assert client.get("/api/v1/auth/me", headers=headers(raw)).status_code == 401
    assert client.post("/api/v1/auth/logout", headers=headers(raw)).status_code == 401


def test_login_failure_is_generic_and_secret_free(client):
    register(client)
    responses = [client.post("/api/v1/auth/login", json={"email": email, "password": "wrong password 123"})
                 for email in ["first@example.com", "missing@example.com"]]
    assert all(response.status_code == 401 for response in responses)
    assert responses[0].json() == responses[1].json() == {"error": {
        "code": "invalid_credentials", "message": "Invalid email or password."}}
    assert all(response.headers["www-authenticate"] == "Bearer" for response in responses)


@pytest.mark.parametrize("authorization", [None, "", "Basic abc", "Bearer", "Bearer short",
                                            "Bearer " + "!" * 43, "Bearer " + "x" * 43])
def test_absent_malformed_unknown_tokens(client, authorization):
    supplied = {} if authorization is None else {"Authorization": authorization}
    for method, path in [("get", "/api/v1/auth/me"), ("post", "/api/v1/auth/logout"),
                         ("get", "/test-protected")]:
        response = getattr(client, method)(path, headers=supplied)
        assert response.status_code == 401
        assert response.json() == {"error": {"code": "unauthenticated", "message": "Authentication required."}}


def test_expiry_boundary_and_revocation(client, auth_app, monkeypatch):
    register(client)
    token = login(client)
    with auth_app.state.sessions() as session:
        expiry = session.get(AuthToken, token_digest(token)).expires_at
    monkeypatch.setattr("app.auth.time.time", lambda: expiry - 1)
    assert client.get("/api/v1/auth/me", headers=headers(token)).status_code == 200
    monkeypatch.setattr("app.auth.time.time", lambda: expiry)
    assert client.get("/api/v1/auth/me", headers=headers(token)).status_code == 401


def test_two_users_and_independent_tokens(client):
    first, second = register(client), register(client, "second@example.com")
    token_a, token_b = login(client), login(client, "second@example.com")
    token_a2 = login(client)
    assert len({token_a, token_b, token_a2}) == 3
    assert client.get("/api/v1/auth/me", headers=headers(token_a)).json() == first
    assert client.get("/api/v1/auth/me", headers=headers(token_b)).json() == second
    client.post("/api/v1/auth/logout", headers=headers(token_a))
    assert client.get("/api/v1/auth/me", headers=headers(token_a2)).status_code == 200
    assert client.get("/api/v1/auth/me", headers=headers(token_b)).json() == second


def test_successful_login_upgrades_old_hash_parameters(client, auth_app):
    user = register(client)
    old = PasswordHasher(time_cost=2, memory_cost=19456, parallelism=1).hash(PASSWORD)
    with auth_app.state.sessions() as session:
        session.get(User, user["id"]).password_hash = old
        session.commit()
    assert login(client)
    with auth_app.state.sessions() as session:
        upgraded = session.get(User, user["id"]).password_hash
        assert upgraded != old
        assert not auth_app.state.password_hasher.check_needs_rehash(upgraded)


def test_auth_persists_across_application_restart(auth_app):
    with TestClient(auth_app) as client:
        user = register(client)
        token = login(client)
    with TestClient(create_app(auth_app.state.settings)) as client:
        assert client.get("/api/v1/auth/me", headers=headers(token)).json() == user
        assert login(client) != token
        assert client.post("/api/v1/auth/logout", headers=headers(token)).status_code == 204
    with TestClient(create_app(auth_app.state.settings)) as client:
        assert client.get("/api/v1/auth/me", headers=headers(token)).status_code == 401


@pytest.mark.parametrize("changes", [
    {"email": "not-an-email"}, {"email": "a" * 255}, {"email": 123},
    {"email": "Person <first@example.com>"}, {"email": "é@example.com"},
    {"password": "x" * 11}, {"password": "x" * 129}, {"password": 123},
    {"password": None}, {"admin": True},
])
@pytest.mark.parametrize("route", ["register", "login"])
def test_invalid_credentials_are_safe(client, changes, route):
    payload = {"email": "first@example.com", "password": PASSWORD, **changes}
    response = client.post(f"/api/v1/auth/{route}", json=payload)
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"
    assert PASSWORD not in response.text
    assert "password_hash" not in response.text
    assert "input" not in response.json()["error"]


@pytest.mark.parametrize("payload", [{}, {"email": "first@example.com"},
                                     {"password": PASSWORD}, [], None])
def test_missing_and_wrong_shaped_bodies(client, payload):
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 422
    assert set(response.json()) == {"error"}


def test_password_boundaries_and_exact_preservation(client):
    for index, password in enumerate(["x" * 12, "x" * 128, " " + "x" * 12 + " "]):
        email = f"bounds{index}@example.com"
        register(client, email, password)
        assert login(client, email, password)
    wrong = client.post("/api/v1/auth/login", json={
        "email": "bounds2@example.com", "password": "x" * 12})
    assert wrong.status_code == 401  # Passwords are not trimmed.


def test_login_limit_and_reset(client, auth_app, monkeypatch):
    register(client)
    auth_app.state.login_limiter = LoginLimiter(2, 30)
    clock = [100.0]
    monkeypatch.setattr("app.auth.monotonic", lambda: clock[0])
    assert login(client)
    failed = client.post("/api/v1/auth/login", json={"email": "missing@example.com", "password": PASSWORD})
    assert failed.status_code == 401
    limited = client.post("/api/v1/auth/login", json={"email": "first@example.com", "password": PASSWORD},
                          headers={"X-Forwarded-For": "different-client"})
    assert limited.status_code == 429
    assert limited.headers["retry-after"] == "30"
    assert limited.json()["error"]["code"] == "login_rate_limited"
    clock[0] += 30
    assert login(client)


def test_login_limit_is_atomic_and_per_peer():
    limiter = LoginLimiter(3, 60)
    def attempt(_):
        try:
            limiter.check("same-peer")
            return 200
        except APIError as error:
            return error.status
    with ThreadPoolExecutor(max_workers=8) as pool:
        statuses = list(pool.map(attempt, range(12)))
    assert statuses.count(200) == 3 and statuses.count(429) == 9
    limiter.check("different-peer")


def test_login_limiter_peer_capacity_and_expired_cleanup(monkeypatch):
    limiter = LoginLimiter(3, 60)
    monkeypatch.setattr("app.auth.monotonic", lambda: 100.0)
    limiter._buckets = {str(index): (100.0, 1) for index in range(10000)}
    with pytest.raises(APIError) as caught:
        limiter.check("new-peer")
    assert caught.value.status == 503
    monkeypatch.setattr("app.auth.monotonic", lambda: 160.0)
    limiter.check("new-peer")
    assert len(limiter._buckets) == 1


def test_http_payloads_and_logs_do_not_leak_credentials(client, caplog):
    register(client)
    token = login(client)
    response = client.get("/api/v1/auth/me", headers=headers(token))
    assert token not in response.text and PASSWORD not in response.text
    response = client.post("/api/v1/auth/register", content='{"password":"do-not-echo",',
                           headers={"Content-Type": "application/json"})
    assert response.status_code == 422 and "do-not-echo" not in response.text
    assert PASSWORD not in caplog.text and token not in caplog.text


def test_openapi_auth_and_matching_fixtures(client):
    import json
    from app.auth import Credentials, LoginResponse, PublicUser, RegistrationResponse
    from app.errors import ErrorResponse
    schema = client.get("/openapi.json").json()
    assert schema["components"]["securitySchemes"]["BearerToken"]["scheme"] == "bearer"
    for route in ["me", "logout"]:
        method = "get" if route == "me" else "post"
        assert schema["paths"][f"/api/v1/auth/{route}"][method]["security"] == [{"BearerToken": []}]
    assert schema["components"]["schemas"]["Credentials"]["additionalProperties"] is False
    fixture = json.loads((Path(__file__).resolve().parents[2] / "docs/fixtures/auth.json").read_text())
    for name, model in [("request", Credentials), ("register_response", RegistrationResponse),
                        ("login_response", LoginResponse), ("me_response", PublicUser),
                        ("error_response", ErrorResponse)]:
        model.model_validate(fixture[name])
