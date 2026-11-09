"""Direct HTTP coverage for ownership, cursor isolation, concurrency, and atomicity."""
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
import json
from pathlib import Path
from uuid import uuid4

from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
import pytest
from sqlalchemy import event, func, select
from sqlalchemy.exc import IntegrityError

from app.config import Settings
from app.database import make_engine
from app.datasets import import_dataset
from app.main import create_app
from app.models import EquitySnapshot, IdempotencyReceipt, Simulation

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data/fixtures"
CREATE = {"dataset_id": "synthetic-accounting-v1", "start_session": "2026-01-05",
          "end_session": "2026-01-08", "initial_cash": "1000.00"}


@dataclass
class Rig:
    client: TestClient
    app: object
    first: dict
    second: dict

    def create(self, key="create-1", headers=None, **changes):
        return self.client.post("/api/v1/simulations", json={**CREATE, **changes},
                                headers={**(self.first if headers is None else headers), "Idempotency-Key": key})

    def advance(self, simulation_id, version, key=None, headers=None):
        return self.client.post(f"/api/v1/simulations/{simulation_id}/advance", json={"expected_version": version},
            headers={**(self.first if headers is None else headers), "Idempotency-Key": key or str(uuid4())})

    def market(self, simulation_id, headers=None, **query):
        return self.client.get(f"/api/v1/simulations/{simulation_id}/market-data/TEST", params=query,
                               headers=self.first if headers is None else headers)


@pytest.fixture
def rig(tmp_path):
    url = f"sqlite:///{tmp_path / 'simulations.db'}"
    config = Config(str(ROOT / "alembic.ini"))
    config.attributes["database_url"] = url
    command.upgrade(config, "head")
    engine = make_engine(url)
    try:
        import_dataset(engine, DATA / "accounting.csv", DATA / "accounting.manifest.json")
    finally:
        engine.dispose()
    app = create_app(Settings(database_url=url, login_max_attempts=100))
    with TestClient(app, raise_server_exceptions=False) as client:
        users = []
        for email in ["first@example.com", "second@example.com"]:
            body = {"email": email, "password": "test-only password"}
            assert client.post("/api/v1/auth/register", json=body).status_code == 201
            token = client.post("/api/v1/auth/login", json=body).json()["access_token"]
            users.append({"Authorization": f"Bearer {token}"})
        yield Rig(client, app, *users)


def state(rig, simulation_id):
    with rig.app.state.sessions() as session:
        sim = session.get(Simulation, simulation_id)
        snapshots = list(session.scalars(select(EquitySnapshot).where(
            EquitySnapshot.simulation_id == simulation_id).order_by(EquitySnapshot.session_date)))
        return sim, snapshots


def test_create_cursor_cash_snapshot_and_no_future_payloads(rig):
    response = rig.create()
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["current_session"] == "2026-01-05"
    assert body["current_time"] == "2026-01-05T21:00:00Z"
    assert body["initial_cash"] == "1000.00" and body["version"] == 1
    assert body["status"] == "active" and body["symbols"] == ["TEST"]
    assert set(body) == {"id", "dataset_id", "symbols", "start_session", "end_session", "current_session",
                         "current_time", "initial_cash", "status", "version"}
    sim, snapshots = state(rig, body["id"])
    assert sim.cash_cents == sim.initial_cash_cents == 100000
    assert [(s.session_date, s.total_equity_cents) for s in snapshots] == [("2026-01-05", 100000)]
    bars = rig.market(body["id"]).json()["items"]
    assert bars == [{"session_date": "2026-01-05", "available_at": "2026-01-05T21:00:00Z", "open": "100.000000",
                     "high": "101.000000", "low": "99.000000", "close": "100.000000", "volume": 1000}]
    for path in ["/api/v1/simulations", f'/api/v1/simulations/{body["id"]}']:
        result = rig.client.get(path, headers=rig.first)
        assert result.status_code == 200 and result.headers["cache-control"] == "no-store"
        for value in ["110.000000", "120.000000", "90.000000", "95.000000"]:
            assert value not in result.text


def test_deterministic_advancement_snapshots_and_final_session(rig):
    sim = rig.create().json()
    for version, day in [(1, "06"), (2, "07"), (3, "08")]:
        response = rig.advance(sim["id"], version, f"advance-{version}")
        assert response.status_code == 200, response.text
        assert response.json()["order_results"] == []
        sim = response.json()["simulation"]
        assert sim["current_session"] == f"2026-01-{day}"
        assert sim["current_time"] == f"2026-01-{day}T21:00:00Z"
        assert sim["version"] == version + 1
        bars = rig.market(sim["id"]).json()["items"]
        assert len(bars) == version + 1
        assert all(bar["session_date"] <= sim["current_session"] and bar["available_at"] <= sim["current_time"] for bar in bars)
        stored, snapshots = state(rig, sim["id"])
        assert len(snapshots) == version + 1
        assert all(s.total_equity_cents == 100000 for s in snapshots)
    assert sim["status"] == "completed"
    response = rig.advance(sim["id"], 4)
    assert response.status_code == 409 and response.json()["error"]["code"] == "simulation_completed"
    replay = rig.advance(sim["id"], 3, "advance-3")
    assert replay.status_code == 200 and replay.json()["simulation"] == sim
    assert len(state(rig, sim["id"])[1]) == 4


def test_start_equals_end_is_completed_and_subrange_does_not_show_earlier_bars(rig):
    sim = rig.create(start_session="2026-01-07", end_session="2026-01-07").json()
    assert sim["status"] == "completed" and sim["version"] == 1
    assert [bar["session_date"] for bar in rig.market(sim["id"]).json()["items"]] == ["2026-01-07"]
    assert rig.advance(sim["id"], 1).status_code == 409
    assert rig.market(sim["id"], **{"from": "2026-01-05"}).status_code == 422
    assert len(state(rig, sim["id"])[1]) == 1


@pytest.mark.parametrize("changes", [
    {"initial_cash": "0.00"}, {"initial_cash": "-1.00"}, {"initial_cash": "1000000000.01"},
    {"initial_cash": "1.001"}, {"initial_cash": "NaN"}, {"initial_cash": "Infinity"},
    {"initial_cash": 1000}, {"initial_cash": True}, {"initial_cash": "1e3"},
    {"start_session": "2026-01-04"}, {"end_session": "2026-01-09"},
    {"start_session": "2026-01-08", "end_session": "2026-01-05"},
    {"start_session": "2026-02-30"}, {"start_session": "2026-1-5"},
    {"unknown": "120.000000"},
])
def test_create_invalid_bounds_sessions_and_unknown_fields(rig, changes):
    response = rig.create(**changes)
    assert response.status_code == 422, response.text
    assert set(response.json()) == {"error"}
    assert "120.000000" not in response.text
    with rig.app.state.sessions() as session:
        assert session.scalar(select(func.count()).select_from(Simulation)) == 0
        assert session.scalar(select(func.count()).select_from(IdempotencyReceipt)) == 0


@pytest.mark.parametrize("cash", ["0.01", "1000000000.00"])
def test_initial_cash_boundaries(rig, cash):
    response = rig.create(initial_cash=cash)
    assert response.status_code == 201 and response.json()["initial_cash"] == cash


def test_absent_dataset(rig):
    assert rig.create(dataset_id="absent").status_code == 404


@pytest.mark.parametrize("key", [None, "", "bad key", "x" * 129])
def test_idempotency_header_required_and_bounded(rig, key):
    headers = {**rig.first}
    if key is not None:
        headers["Idempotency-Key"] = key
    assert rig.client.post("/api/v1/simulations", json=CREATE, headers=headers).status_code == 422
    sim = rig.create().json()
    assert rig.client.post(f'/api/v1/simulations/{sim["id"]}/advance',
                           json={"expected_version": 1}, headers=headers).status_code == 422


def test_create_and_advance_replay_precede_stale_checks_and_preserve_exact_response(rig):
    created = rig.create()
    sim = created.json()
    first = rig.advance(sim["id"], 1, "first-advance")
    assert first.status_code == 200
    assert rig.advance(sim["id"], 2).status_code == 200
    assert rig.create().content == created.content
    assert rig.advance(sim["id"], 1, "first-advance").content == first.content
    conflict = rig.create(initial_cash="2000.00")
    assert conflict.status_code == 409 and conflict.json()["error"]["code"] == "idempotency_conflict"
    conflict = rig.advance(sim["id"], 3, "first-advance")
    assert conflict.status_code == 409 and conflict.json()["error"]["code"] == "idempotency_conflict"
    stale = rig.advance(sim["id"], 1)
    assert stale.status_code == 409 and stale.json()["error"]["code"] == "stale_version"
    assert state(rig, sim["id"])[0].version == 3


def test_key_scope_includes_user_route_and_resource(rig):
    first = rig.create("shared-key").json()
    second = rig.create("shared-key", headers=rig.second).json()
    assert first["id"] != second["id"]
    other = rig.create("another-create").json()
    assert rig.advance(first["id"], 1, "shared-key").status_code == 200
    assert rig.advance(other["id"], 1, "shared-key").status_code == 200


def test_every_simulation_route_enforces_auth_and_owned_access(rig):
    sim = rig.create().json()
    assert rig.client.post("/api/v1/simulations", json=CREATE, headers={"Idempotency-Key": "absent-auth"}).status_code == 401
    for headers, status in [({}, 401), (rig.second, 404)]:
        for suffix in ["", "/market-data/TEST"]:
            response = rig.client.get(f'/api/v1/simulations/{sim["id"]}{suffix}', headers=headers)
            assert response.status_code == status
            assert "100.000000" not in response.text and sim["id"] not in response.text
        assert rig.advance(sim["id"], 1, headers=headers).status_code == status
    assert rig.client.get("/api/v1/simulations", headers={}).status_code == 401
    assert rig.client.get("/api/v1/simulations", headers=rig.second).json() == {"items": []}
    assert rig.client.get("/api/v1/simulations", headers=rig.first).json() == {"items": [sim]}
    for path in [f'/api/v1/simulations/{sim["id"]}', '/api/v1/simulations/absent']:
        assert rig.client.get(path, headers=rig.second).json() == {"error": {
            "code": "simulation_not_found", "message": "Simulation not found."}}
    # Ownership must be checked before semantic cursor checks.
    assert rig.market(sim["id"], headers=rig.second, **{"to": "2026-01-08"}).status_code == 404


@pytest.mark.parametrize("query", [
    {"to": "2026-01-06"}, {"from": "2026-01-06"}, {"to": "2026-01-09"},
    {"from": "2026-01-04"}, {"to": "2026-01-04"}, {"to": "2026-02-30"},
    {"to": "120.000000"}, {"current_time": "2026-01-08T21:00:00Z"},
    {"dataset_id": "synthetic-accounting-v1"},
])
def test_future_invalid_and_override_ranges_are_rejected_without_price_leaks(rig, query):
    sim = rig.create().json()
    response = rig.market(sim["id"], **query)
    assert response.status_code == 422
    for value in ["110.000000", "120.000000", "90.000000", "95.000000"]:
        assert value not in response.text
    assert state(rig, sim["id"])[0].version == 1


def test_visible_filters_unknown_symbol_and_unimplemented_routes(rig):
    sim = rig.create().json()
    assert rig.advance(sim["id"], 1).status_code == 200
    assert [bar["session_date"] for bar in rig.market(sim["id"], **{"from": "2026-01-06"}).json()["items"]] == ["2026-01-06"]
    assert [bar["session_date"] for bar in rig.market(sim["id"], **{"to": "2026-01-05"}).json()["items"]] == ["2026-01-05"]
    assert rig.market(sim["id"], **{"from": "2026-01-06", "to": "2026-01-05"}).status_code == 422
    assert rig.client.get(f'/api/v1/simulations/{sim["id"]}/market-data/UNKNOWN', headers=rig.first).status_code == 404
    for path in ["/api/v1/market-data/TEST", f'/api/v1/datasets/{sim["dataset_id"]}/bars',
                 f'/api/v1/simulations/{sim["id"]}/portfolio', f'/api/v1/simulations/{sim["id"]}/performance']:
        response = rig.client.get(path, headers=rig.first)
        assert response.status_code == 404
        assert "120.000000" not in response.text


@pytest.mark.parametrize("version", [True, "1", 0, -1, 1.5, 1000000001, None])
def test_advance_version_is_a_bounded_strict_integer(rig, version):
    sim = rig.create().json()
    assert rig.advance(sim["id"], version).status_code == 422


@pytest.mark.parametrize("same_key", [False, True])
def test_concurrent_advance_moves_exactly_once(rig, same_key):
    sim = rig.create().json()
    with ThreadPoolExecutor(max_workers=2) as pool:
        responses = list(pool.map(lambda index: rig.advance(sim["id"], 1,
            "same-key" if same_key else f"concurrent-{index}"), range(2)))
    assert sorted(r.status_code for r in responses) == ([200, 200] if same_key else [200, 409])
    if same_key:
        assert responses[0].content == responses[1].content
    stored, snapshots = state(rig, sim["id"])
    assert stored.current_session == "2026-01-06" and stored.version == 2 and len(snapshots) == 2


def test_concurrent_create_with_same_key_creates_one_simulation(rig):
    with ThreadPoolExecutor(max_workers=2) as pool:
        responses = list(pool.map(lambda _: rig.create("concurrent-create"), range(2)))
    assert all(r.status_code == 201 for r in responses)
    assert responses[0].content == responses[1].content
    with rig.app.state.sessions() as session:
        assert session.scalar(select(func.count()).select_from(Simulation)) == 1


def test_receipt_failure_rolls_back_cursor_snapshot_and_retry_is_safe(rig):
    sim = rig.create().json()
    def fail_receipt(_conn, _cursor, statement, _params, _context, _many):
        if statement.startswith("INSERT INTO idempotency_receipts"):
            raise RuntimeError("private-price-120.000000")
    engine = rig.app.state.engine
    event.listen(engine, "before_cursor_execute", fail_receipt)
    try:
        response = rig.advance(sim["id"], 1, "retry-after-failure")
        assert response.status_code == 500
        assert "120.000000" not in response.text and "Traceback" not in response.text
    finally:
        event.remove(engine, "before_cursor_execute", fail_receipt)
    stored, snapshots = state(rig, sim["id"])
    assert stored.version == 1 and stored.current_session == "2026-01-05" and len(snapshots) == 1
    with rig.app.state.sessions() as session:
        assert session.scalar(select(func.count()).select_from(IdempotencyReceipt)) == 1
    assert rig.advance(sim["id"], 1, "retry-after-failure").status_code == 200
    assert len(state(rig, sim["id"])[1]) == 2


def test_missing_next_bar_rolls_back_without_skipping_or_leaking(rig):
    sim = rig.create().json()
    # Simulate an administrator/storage corruption; ordinary writes cannot do this.
    with rig.app.state.engine.begin() as connection:
        connection.exec_driver_sql("DROP TRIGGER market_bars_no_delete")
        connection.exec_driver_sql("DELETE FROM market_bars WHERE session_date = '2026-01-06'")
    response = rig.advance(sim["id"], 1)
    assert response.status_code == 503
    assert response.json() == {"error": {"code": "market_data_unavailable", "message": "Required market data is unavailable."}}
    stored, snapshots = state(rig, sim["id"])
    assert stored.version == 1 and len(snapshots) == 1
    assert rig.market(sim["id"]).status_code == 200


def test_dataset_pin_survives_new_version_import(rig, tmp_path):
    sim = rig.create().json()
    manifest = json.loads((DATA / "accounting.manifest.json").read_text())
    manifest.update(id="synthetic-accounting-v2", version=2)
    newer = tmp_path / "new.json"
    newer.write_text(json.dumps(manifest))
    import_dataset(rig.app.state.engine, DATA / "accounting.csv", newer)
    stored, _ = state(rig, sim["id"])
    assert stored.dataset_id == "synthetic-accounting-v1"
    assert rig.advance(sim["id"], 1).json()["simulation"]["dataset_id"] == "synthetic-accounting-v1"
    with pytest.raises(IntegrityError), rig.app.state.engine.begin() as connection:
        connection.exec_driver_sql("UPDATE datasets SET manifest_json = '{}' WHERE id = 'synthetic-accounting-v1'")


def test_available_at_constraint_fails_closed_if_storage_is_corrupted(rig):
    sim = rig.create().json()
    with rig.app.state.engine.begin() as connection:
        connection.exec_driver_sql("DROP TRIGGER dataset_sessions_no_update")
        connection.exec_driver_sql("UPDATE dataset_sessions SET close_at = '2026-01-05T23:00:00Z' WHERE session_date = '2026-01-05'")
    response = rig.market(sim["id"])
    assert response.status_code == 503 and "100.000000" not in response.text
    assert state(rig, sim["id"])[0].current_time == "2026-01-05T21:00:00Z"


def test_replay_is_allowed_at_simulation_cap_but_new_create_is_rejected(rig, monkeypatch):
    monkeypatch.setattr("app.simulations.MAX_SIMULATIONS_PER_USER", 1)
    first = rig.create()
    assert first.status_code == 201 and rig.create().content == first.content
    rejected = rig.create("another-key")
    assert rejected.status_code == 422 and rejected.json()["error"]["code"] == "simulation_limit_reached"
    assert rig.create(headers=rig.second).status_code == 201


def test_create_receipt_failure_leaves_no_simulation_or_initial_snapshot(rig):
    def fail_receipt(_conn, _cursor, statement, _params, _context, _many):
        if statement.startswith("INSERT INTO idempotency_receipts"):
            raise RuntimeError("Injected create failure")
    engine = rig.app.state.engine
    event.listen(engine, "before_cursor_execute", fail_receipt)
    try:
        assert rig.create().status_code == 500
    finally:
        event.remove(engine, "before_cursor_execute", fail_receipt)
    with rig.app.state.sessions() as session:
        for table in [Simulation, EquitySnapshot, IdempotencyReceipt]:
            assert session.scalar(select(func.count()).select_from(table)) == 0
    assert rig.create().status_code == 201


def test_cursor_receipts_and_snapshots_survive_app_restart(rig):
    created = rig.create()
    sim = created.json()
    advanced = rig.advance(sim["id"], 1, "persisted-advance")
    with TestClient(create_app(rig.app.state.settings)) as client:
        response = client.get(f'/api/v1/simulations/{sim["id"]}', headers=rig.first)
        assert response.json() == advanced.json()["simulation"]
        assert client.post("/api/v1/simulations", json=CREATE,
                           headers={**rig.first, "Idempotency-Key": "create-1"}).content == created.content
        assert client.post(f'/api/v1/simulations/{sim["id"]}/advance', json={"expected_version": 1},
                           headers={**rig.first, "Idempotency-Key": "persisted-advance"}).content == advanced.content
    assert len(state(rig, sim["id"])[1]) == 2


def test_openapi_and_frontend_examples(rig):
    from app.simulations import CreateSimulation, SimulationResponse, AdvanceResponse, MarketDataResponse
    schema = rig.client.get("/openapi.json").json()
    for path in ["/api/v1/simulations", "/api/v1/simulations/{simulation_id}/advance"]:
        operation = schema["paths"][path]["post"]
        assert operation["security"] == [{"BearerToken": []}]
        assert any(p["name"] == "Idempotency-Key" and p["required"] for p in operation["parameters"])
    fixtures = json.loads((ROOT.parent / "docs/fixtures/simulations.json").read_text())
    for name, model in [("create_request", CreateSimulation), ("simulation", SimulationResponse),
                        ("advance_response", AdvanceResponse), ("market_data_response", MarketDataResponse)]:
        model.model_validate(fixtures[name])
