"""Offline imports and HTTP metadata boundaries; no live source calls."""
from concurrent.futures import ThreadPoolExecutor
import copy
import csv
from hashlib import sha256
import io
import json
import os
from pathlib import Path
import subprocess
import sys

from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
import pytest
from sqlalchemy import event, func, insert, select
from sqlalchemy.exc import IntegrityError

from app.config import Settings
from app.database import make_engine
from app.datasets import (DatasetManifest, ImportConflict, ImportFailure, import_dataset,
    inspect_manifest, price_scaled, validate_files)
from app.main import create_app
from app.models import Dataset, DatasetInstrument, DatasetSession, MarketBar

ROOT = Path(__file__).resolve().parents[1]
FIXTURES = ROOT / "data/fixtures"


@pytest.fixture
def storage(tmp_path):
    url = f"sqlite:///{tmp_path / 'datasets.db'}"
    config = Config(str(ROOT / "alembic.ini"))
    config.attributes["database_url"] = url
    command.upgrade(config, "head")
    engine = make_engine(url)
    try:
        yield engine, url
    finally:
        engine.dispose()


def inputs(tmp_path, transform_rows=None, transform_manifest=None):
    manifest = json.loads((FIXTURES / "accounting.manifest.json").read_text())
    rows = list(csv.DictReader(io.StringIO((FIXTURES / "accounting.csv").read_text())))
    if transform_rows:
        transform_rows(rows)
    text = io.StringIO(newline="")
    writer = csv.DictWriter(text, fieldnames=["symbol", "session_date", "open", "high", "low", "close", "volume"],
                            lineterminator="\n")
    writer.writeheader()
    writer.writerows(rows)
    csv_path = tmp_path / "bars.csv"
    csv_path.write_bytes(text.getvalue().encode())
    manifest["csv_sha256"] = sha256(csv_path.read_bytes()).hexdigest()
    if transform_manifest:
        transform_manifest(manifest)
    manifest_path = tmp_path / "manifest.json"
    manifest_path.write_text(json.dumps(manifest))
    return csv_path, manifest_path


def test_valid_import_reimport_and_persisted_provenance(storage):
    engine, url = storage
    result = import_dataset(engine, FIXTURES / "accounting.csv", FIXTURES / "accounting.manifest.json")
    assert result["result"] == "imported" and result["bar_count"] == 4
    again = import_dataset(engine, FIXTURES / "accounting.csv", FIXTURES / "accounting.manifest.json")
    assert again == {**result, "result": "unchanged"}
    engine.dispose()
    reopened = make_engine(url)
    try:
        stored = inspect_manifest(reopened, result["dataset_id"])
        original = json.loads((FIXTURES / "accounting.manifest.json").read_text())
        assert stored["manifest"] == original
        assert stored["manifest_sha256"] == result["manifest_sha256"]
        with reopened.connect() as connection:
            bars = connection.execute(select(MarketBar).order_by(MarketBar.session_date)).all()
            assert [bar.open_scaled for bar in bars] == [100000000, 100000000, 120000000, 95000000]
            assert [bar.close_scaled for bar in bars] == [100000000, 110000000, 90000000, 95000000]
            assert all(type(bar.open_scaled) is int for bar in bars)
    finally:
        reopened.dispose()


def test_changed_csv_or_manifest_requires_new_id(storage, tmp_path):
    engine, _ = storage
    import_dataset(engine, FIXTURES / "accounting.csv", FIXTURES / "accounting.manifest.json")
    paths = inputs(tmp_path, lambda rows: rows[0].update(volume="1001"))
    with pytest.raises(ImportConflict):
        import_dataset(engine, *paths)
    paths = inputs(tmp_path, transform_manifest=lambda manifest: manifest.update(label="Changed label"))
    with pytest.raises(ImportConflict):
        import_dataset(engine, *paths)
    paths = inputs(tmp_path, transform_manifest=lambda manifest: manifest.update(
        id="synthetic-accounting-v2", version=2))
    assert import_dataset(engine, *paths)["result"] == "imported"


@pytest.mark.parametrize("price", ["NaN", "Infinity", "-1", "0", "0.004", "0.015", "1000000.01",
                                    "1e1000000", "1e2", "100.0000001", "", " 100", "1" * 1000])
def test_invalid_prices(price):
    with pytest.raises(ImportFailure):
        price_scaled(price)


@pytest.mark.parametrize("price,expected", [("0.01", 10000), ("1000000.000000", 1000000000000),
                                             ("100.120000", 100120000)])
def test_price_bounds_exact_scaling(price, expected):
    assert price_scaled(price) == expected


@pytest.mark.parametrize("changes", [{"high": "99"}, {"low": "101"}, {"low": "102", "high": "101"},
                                      {"open": "0.001"}, {"close": "100.005"},
                                      {"volume": "-1"}, {"volume": "1.5"}, {"volume": "NaN"},
                                      {"volume": "9223372036854775808"}, {"volume": "1e2"}])
def test_invalid_rows_leave_no_dataset(storage, tmp_path, changes):
    engine, _ = storage
    paths = inputs(tmp_path, lambda rows: rows[0].update(changes))
    with pytest.raises(ImportFailure):
        import_dataset(engine, *paths)
    with engine.connect() as connection:
        assert connection.scalar(select(func.count()).select_from(Dataset)) == 0


@pytest.mark.parametrize("mutation", [
    lambda rows: rows.pop(), lambda rows: rows.append(copy.deepcopy(rows[-1])),
    lambda rows: rows.reverse(), lambda rows: rows[0].update(symbol="UNKNOWN"),
    lambda rows: rows[0].update(session_date="2026-01-09"),
])
def test_missing_duplicate_out_of_order_or_undeclared_bars(tmp_path, mutation):
    with pytest.raises(ImportFailure):
        validate_files(*inputs(tmp_path, mutation))


def test_two_symbol_grid_requires_every_pair(tmp_path):
    def add_second(manifest):
        manifest["instruments"].append({"symbol": "ZZZ", "name": "Second synthetic instrument"})
    with pytest.raises(ImportFailure, match="Missing bars"):
        validate_files(*inputs(tmp_path, transform_manifest=add_second))


@pytest.mark.parametrize("mutation", [
    lambda m: m.update(csv_sha256="0" * 64), lambda m: m.update(version=True),
    lambda m: m.update(currency="EUR"), lambda m: m.update(price_policy="adjusted"),
    lambda m: m.update(extra="unknown"), lambda m: m.update(usage_terms=""),
    lambda m: m.update(retrieved_on="2025-01-01"), lambda m: m.update(retrieved_on=123),
    lambda m: m["sessions"].reverse(), lambda m: m["sessions"].append(m["sessions"][-1]),
    lambda m: m["sessions"][0].update(open_at="2026-01-05T22:00:00Z"),
    lambda m: m["sessions"][0].update(close_at="2026-01-05T21:00:00+00:00"),
    lambda m: m["sessions"][0].update(session_date="2026-02-30"),
    lambda m: m.update(synthetic=False),
    lambda m: m["corporate_actions"].update(status="verified_none"),
    lambda m: m["corporate_actions"].update(checked_on="2025-01-01"),
])
def test_invalid_manifest_and_provenance(tmp_path, mutation):
    with pytest.raises(ImportFailure):
        validate_files(*inputs(tmp_path, transform_manifest=mutation))


def test_real_provenance_shape_requires_explicit_evidence(tmp_path):
    # Declaration validation only; this offline test is NOT evidence of real data.
    def real_shape(m):
        m.update(synthetic=False, source="Test-only provenance validator",
                 source_urls=["https://example.com/prices"], usage_terms_url="https://example.com/terms")
        m["corporate_actions"].update(status="verified_none", evidence_urls=["https://example.com/actions"])
    manifest, _, _ = validate_files(*inputs(tmp_path, transform_manifest=real_shape))
    assert manifest.synthetic is False


def test_malformed_headers_json_and_column_counts(tmp_path):
    csv_path, manifest_path = inputs(tmp_path)
    for content in [b"wrong,header\n", b"symbol,session_date,open,high,low,close,volume\nTEST,2026-01-05,100\n",
                    b"symbol,session_date,open,high,low,close,volume\nTEST,2026-01-05,100,101,99,100,1,extra\n"]:
        csv_path.write_bytes(content)
        manifest = json.loads(manifest_path.read_text())
        manifest["csv_sha256"] = sha256(content).hexdigest()
        manifest_path.write_text(json.dumps(manifest))
        with pytest.raises(ImportFailure):
            validate_files(csv_path, manifest_path)
    manifest_path.write_text('{"id":"first","id":"duplicate"}')
    with pytest.raises(ImportFailure):
        validate_files(csv_path, manifest_path)


def test_import_failure_rolls_back_every_table(storage):
    engine, _ = storage
    def fail_seal(_conn, _cursor, statement, _params, _context, _many):
        if statement.startswith("UPDATE datasets"):
            raise RuntimeError("Injected seal failure")
    event.listen(engine, "before_cursor_execute", fail_seal)
    try:
        with pytest.raises(RuntimeError, match="Injected"):
            import_dataset(engine, FIXTURES / "accounting.csv", FIXTURES / "accounting.manifest.json")
    finally:
        event.remove(engine, "before_cursor_execute", fail_seal)
    with engine.connect() as connection:
        for model in [Dataset, DatasetInstrument, DatasetSession, MarketBar]:
            assert connection.scalar(select(func.count()).select_from(model)) == 0


@pytest.mark.parametrize("changes", [
    {"open_scaled": 100000000.5}, {"close_scaled": 100000001}, {"open_scaled": 0},
    {"high_scaled": 99000000}, {"volume": -1}, {"volume": 1.5}, {"symbol": "UNKNOWN"},
])
def test_bar_database_constraints(storage, changes):
    engine, _ = storage
    with engine.begin() as connection:
        connection.execute(insert(Dataset), dict(id="staging", manifest_json="{}", manifest_sha256="0" * 64, sealed=0))
        connection.execute(insert(DatasetInstrument), dict(dataset_id="staging", symbol="TEST", name="Test"))
        connection.execute(insert(DatasetSession), dict(dataset_id="staging", session_date="2026-01-05",
            open_at="2026-01-05T14:30:00Z", close_at="2026-01-05T21:00:00Z"))
    row = dict(dataset_id="staging", symbol="TEST", session_date="2026-01-05", open_scaled=100000000,
               high_scaled=101000000, low_scaled=99000000, close_scaled=100000000, volume=1000)
    row.update(changes)
    with pytest.raises(IntegrityError), engine.begin() as connection:
        connection.execute(insert(MarketBar), row)


def test_concurrent_identical_import_is_safe(storage):
    engine, _ = storage
    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(lambda _: import_dataset(engine, FIXTURES / "accounting.csv",
                                                         FIXTURES / "accounting.manifest.json"), range(2)))
    assert sorted(result["result"] for result in results) == ["imported", "unchanged"]


@pytest.mark.parametrize("sql", [
    "UPDATE datasets SET manifest_json = '{}'",
    "DELETE FROM datasets", "UPDATE market_bars SET close_scaled = 101000000", "DELETE FROM market_bars",
    "INSERT OR REPLACE INTO datasets SELECT * FROM datasets",
    "UPDATE dataset_sessions SET close_at = '2026-01-05T22:00:00Z'", "DELETE FROM dataset_sessions",
    "UPDATE dataset_instruments SET name = 'Changed'", "DELETE FROM dataset_instruments",
    "INSERT INTO dataset_instruments VALUES ('synthetic-accounting-v1', 'NEW', 'New')",
    "INSERT INTO dataset_sessions VALUES ('synthetic-accounting-v1','2026-01-09','2026-01-09T14:30:00Z','2026-01-09T21:00:00Z')",
    "INSERT INTO market_bars VALUES ('synthetic-accounting-v1','TEST','2026-01-05',100000000,101000000,99000000,100000000,0)",
])
def test_sealed_dataset_rejects_direct_sql_changes(storage, sql):
    engine, _ = storage
    import_dataset(engine, FIXTURES / "accounting.csv", FIXTURES / "accounting.manifest.json")
    with pytest.raises(IntegrityError), engine.begin() as connection:
        connection.exec_driver_sql(sql)


def test_cli_import_inspect_and_validation_error(storage, tmp_path):
    _, url = storage
    env = dict(os.environ, DATABASE_URL=url)
    args = [sys.executable, "-m", "app.datasets"]
    result = subprocess.run(args + ["--csv", str(FIXTURES / "accounting.csv"),
                                    "--manifest", str(FIXTURES / "accounting.manifest.json")],
                            cwd=ROOT, env=env, capture_output=True, text=True)
    assert result.returncode == 0, result.stderr
    assert json.loads(result.stdout)["result"] == "imported"
    result = subprocess.run(args + ["--inspect", "synthetic-accounting-v1"],
                            cwd=ROOT, env=env, capture_output=True, text=True)
    assert result.returncode == 0
    assert json.loads(result.stdout)["manifest"]["synthetic"] is True
    bad = inputs(tmp_path, lambda rows: rows[0].update(close="0.004"))
    result = subprocess.run(args + ["--csv", str(bad[0]), "--manifest", str(bad[1])],
                            cwd=ROOT, env=env, capture_output=True, text=True)
    assert result.returncode == 1 and "Import failed:" in result.stderr
    assert "Traceback" not in result.stderr


def test_authenticated_metadata_only_and_frontend_fixtures(storage):
    engine, url = storage
    import_dataset(engine, FIXTURES / "accounting.csv", FIXTURES / "accounting.manifest.json")
    with TestClient(create_app(Settings(database_url=url))) as client:
        for path in ["/api/v1/datasets", "/api/v1/instruments?dataset_id=synthetic-accounting-v1"]:
            assert client.get(path).status_code == 401
        for email in ["first@example.com", "second@example.com"]:
            body = {"email": email, "password": "test-only password"}
            assert client.post("/api/v1/auth/register", json=body).status_code == 201
            token = client.post("/api/v1/auth/login", json=body).json()["access_token"]
            headers = {"Authorization": f"Bearer {token}"}
            response = client.get("/api/v1/datasets", headers=headers)
            assert response.status_code == 200
            item = response.json()["items"][0]
            assert set(item) == {"id", "label", "source", "synthetic", "session_dates", "symbols"}
            assert item["synthetic"] is True
            assert item["symbols"] == ["TEST"]
            assert response.json() == json.loads((ROOT.parent / "docs/fixtures/datasets.json").read_text())
            response = client.get("/api/v1/instruments?dataset_id=synthetic-accounting-v1", headers=headers)
            assert response.json() == {"items": [{"symbol": "TEST", "name": "Synthetic reference equity"}]}
            assert response.json() == json.loads((ROOT.parent / "docs/fixtures/instruments.json").read_text())
            assert client.get("/api/v1/instruments?dataset_id=absent", headers=headers).status_code == 404
            assert client.get("/api/v1/instruments", headers=headers).status_code == 422
            assert client.get("/api/v1/instruments?dataset_id=synthetic-accounting-v1&extra=true", headers=headers).status_code == 422
            for path in ["/api/v1/datasets/synthetic-accounting-v1/bars", "/api/v1/market-data/TEST"]:
                assert client.get(path, headers=headers).status_code == 404
        schema = client.get("/openapi.json").json()
        for path in ["/api/v1/datasets", "/api/v1/instruments"]:
            assert schema["paths"][path]["get"]["security"] == [{"BearerToken": []}]


def test_manifest_schema_artifact_matches_model():
    assert json.loads((ROOT / "data/manifest.schema.json").read_text()) == DatasetManifest.model_json_schema()
