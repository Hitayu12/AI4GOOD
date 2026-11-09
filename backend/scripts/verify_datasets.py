"""Isolated CLI/migration/HTTP dataset acceptance, with optional local real inputs."""
import argparse
import json
import os
from pathlib import Path
import secrets
import sqlite3
import subprocess
import sys
import tempfile

from verify_auth import ROOT, running_server, check


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--csv", type=Path, default=ROOT / "data/fixtures/accounting.csv")
    parser.add_argument("--manifest", type=Path, default=ROOT / "data/fixtures/accounting.manifest.json")
    args = parser.parse_args()
    csv_path, manifest_path = args.csv.resolve(), args.manifest.resolve()
    expected = json.loads(manifest_path.read_text())
    with tempfile.TemporaryDirectory(prefix="ai4good-datasets-") as folder:
        database = Path(folder) / "datasets.db"
        env = dict(os.environ, DATABASE_URL=f"sqlite:///{database}", LOGIN_MAX_ATTEMPTS="100",
                   LOGIN_WINDOW_SECONDS="60", AUTH_TOKEN_TTL_SECONDS="3600")
        def run(*command):
            result = subprocess.run([sys.executable, "-m", *command], cwd=ROOT, env=env,
                                    text=True, capture_output=True, check=True)
            return result.stdout.strip()
        run("alembic", "upgrade", "head")
        run("alembic", "upgrade", "head")
        check("0003_simulations" in run("alembic", "current"), "Wrong migration head.")
        check("No new upgrade operations" in run("alembic", "check"), "Schema drift detected.")
        for status in ["imported", "unchanged"]:
            result = json.loads(run("app.datasets", "--csv", str(csv_path), "--manifest", str(manifest_path)))
            check(result["result"] == status, "Import/reimport failed.")
        stored = json.loads(run("app.datasets", "--inspect", expected["id"]))
        check(stored["manifest"] == expected, "Persisted manifest differs.")
        with sqlite3.connect(database) as connection:
            count = connection.execute("SELECT count(*) FROM market_bars").fetchone()[0]
            check(count == len(expected["sessions"]) * len(expected["instruments"]), "Incomplete grid.")
            try:
                connection.execute("UPDATE market_bars SET volume = volume + 1")
            except sqlite3.IntegrityError:
                connection.rollback()
            else:
                raise RuntimeError("Database allowed mutation of an imported dataset.")
        password = secrets.token_urlsafe(24)
        with running_server(env) as client:
            check(client.get("/api/v1/datasets").status_code == 401, "Unauthenticated catalog access.")
            for email in ["dataset-first@example.com", "dataset-second@example.com"]:
                body = {"email": email, "password": password}
                check(client.post("/api/v1/auth/register", json=body).status_code == 201, "Registration failed.")
                login = client.post("/api/v1/auth/login", json=body)
                check(login.status_code == 200, "Login failed.")
                headers = {"Authorization": "Bearer " + login.json()["access_token"]}
                response = client.get("/api/v1/datasets", headers=headers)
                check(response.status_code == 200, "Catalog failed.")
                items = response.json()["items"]
                check(len(items) == 1 and items[0]["id"] == expected["id"], "Wrong catalog.")
                check(items[0]["synthetic"] is expected["synthetic"], "Incorrect synthetic label.")
                check(set(items[0]) == {"id", "label", "source", "synthetic", "session_dates", "symbols"},
                      "Unexpected fields in metadata.")
                response = client.get("/api/v1/instruments", params={"dataset_id": expected["id"]}, headers=headers)
                check(response.status_code == 200 and response.json() == {"items": expected["instruments"]},
                      "Wrong instruments.")
                for path in [f'/api/v1/datasets/{expected["id"]}/bars', "/api/v1/market-data/IBM"]:
                    check(client.get(path, headers=headers).status_code == 404, "Unscoped price endpoint exists.")
        check(json.loads(run("app.datasets", "--inspect", expected["id"])) == stored,
              "Manifest changed after server shutdown/reopen.")
        kind = "synthetic" if expected["synthetic"] else "real (local research; check source terms)"
        print(f"PASS: {kind} dataset import/replay, migrations, immutability, persistence, and metadata-only HTTP.")


if __name__ == "__main__":
    main()
