"""Fresh-database, real HTTP cursor acceptance; no credentials/prices are logged."""
import argparse
import csv
from decimal import Decimal
import json
import os
from pathlib import Path
import secrets
import sqlite3
import subprocess
import sys
import tempfile
from uuid import uuid4

from verify_auth import ROOT, running_server, check


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--csv", type=Path, default=ROOT / "data/fixtures/accounting.csv")
    parser.add_argument("--manifest", type=Path, default=ROOT / "data/fixtures/accounting.manifest.json")
    args = parser.parse_args()
    csv_path, manifest_path = args.csv.resolve(), args.manifest.resolve()
    manifest = json.loads(manifest_path.read_text())
    dates = [item["session_date"] for item in manifest["sessions"]]
    check(len(dates) >= 2, "Cursor smoke requires at least two sessions.")
    symbol = manifest["instruments"][0]["symbol"]
    with csv_path.open(newline="") as file:
        reference = {(row["session_date"], row["symbol"]): row for row in csv.DictReader(file)}
    with tempfile.TemporaryDirectory(prefix="ai4good-simulations-") as folder:
        database = Path(folder) / "simulations.db"
        env = dict(os.environ, DATABASE_URL=f"sqlite:///{database}", LOGIN_MAX_ATTEMPTS="100",
                   LOGIN_WINDOW_SECONDS="60", AUTH_TOKEN_TTL_SECONDS="3600")
        def run(*command):
            result = subprocess.run([sys.executable, "-m", *command], cwd=ROOT, env=env,
                                    text=True, capture_output=True, check=True)
            return result.stdout.strip()
        run("alembic", "upgrade", "head")
        run("alembic", "upgrade", "head")
        check("0003_simulations" in run("alembic", "current"), "Wrong migration head.")
        check("No new upgrade operations" in run("alembic", "check"), "Schema drift.")
        run("app.datasets", "--csv", str(csv_path), "--manifest", str(manifest_path))
        password = secrets.token_urlsafe(24)
        create_key, first_advance_key = str(uuid4()), str(uuid4())
        create_body = {"dataset_id": manifest["id"], "start_session": dates[0], "end_session": dates[-1],
                       "initial_cash": "1000.00"}
        with running_server(env) as client:
            headers = []
            for email in ["sim-first@example.com", "sim-second@example.com"]:
                body = {"email": email, "password": password}
                check(client.post("/api/v1/auth/register", json=body).status_code == 201, "Register failed.")
                response = client.post("/api/v1/auth/login", json=body)
                check(response.status_code == 200, "Login failed.")
                headers.append({"Authorization": "Bearer " + response.json()["access_token"]})
            first, second = headers
            created = client.post("/api/v1/simulations", json=create_body,
                                  headers={**first, "Idempotency-Key": create_key})
            check(created.status_code == 201, "Create failed.")
            simulation = created.json()
            path = f'/api/v1/simulations/{simulation["id"]}'
            market = path + "/market-data/" + symbol
            check(client.get(path, headers=second).status_code == 404, "Foreign simulation access.")
            check(client.get(market, headers=second).status_code == 404, "Foreign market access.")
            check(client.post(path + "/advance", json={"expected_version": 1},
                              headers={**second, "Idempotency-Key": str(uuid4())}).status_code == 404, "Foreign advance.")
            check(client.get(market, params={"to": dates[1]}, headers=first).status_code == 422, "Future range allowed.")
            check(len(client.get(market, headers=first).json()["items"]) == 1, "Initial future bar leak.")
            first_advance = None
            for index, day in enumerate(dates[1:], 1):
                key = first_advance_key if index == 1 else str(uuid4())
                response = client.post(path + "/advance", json={"expected_version": simulation["version"]},
                                       headers={**first, "Idempotency-Key": key})
                check(response.status_code == 200, "Advance failed.")
                if index == 1:
                    first_advance = response.content
                simulation = response.json()["simulation"]
                check(response.json()["order_results"] == [], "Unexpected orders in cursor-only phase.")
                check(simulation["current_session"] == day, "Cursor skipped a declared session.")
                bars = client.get(market, headers=first).json()["items"]
                check(len(bars) == index + 1, "Incorrect visible bar count.")
                for bar in bars:
                    check(bar["session_date"] <= day and bar["available_at"] <= simulation["current_time"], "Future data leaked.")
                    expected = reference[(bar["session_date"], symbol)]
                    check(all(bar[field] == format(Decimal(expected[field]), ".6f") for field in ["open", "high", "low", "close"]),
                          "Visible prices do not match source input.")
            check(simulation["status"] == "completed", "Final status wrong.")
            check(client.post(path + "/advance", json={"expected_version": simulation["version"]},
                              headers={**first, "Idempotency-Key": str(uuid4())}).status_code == 409, "Advance beyond end.")
        with running_server(env) as client:
            check(client.get(path, headers=first).json() == simulation, "Cursor persistence failed.")
            check(client.post("/api/v1/simulations", json=create_body,
                              headers={**first, "Idempotency-Key": create_key}).content == created.content, "Create replay changed.")
            check(client.post(path + "/advance", json={"expected_version": 1},
                              headers={**first, "Idempotency-Key": first_advance_key}).content == first_advance, "Advance replay changed.")
        with sqlite3.connect(database) as connection:
            snapshots = connection.execute("SELECT session_date,total_equity_cents FROM equity_snapshots ORDER BY session_date").fetchall()
            check(snapshots == [(day, 100000) for day in dates], "Snapshot history wrong.")
            check(connection.execute("SELECT cash_cents FROM simulations").fetchone()[0] == 100000, "Initial cash changed.")
        kind = "synthetic" if manifest["synthetic"] else "real local research"
        print(f"PASS: {kind} simulation cursor, ownership, no future bars, replay, snapshots, and restart persistence.")


if __name__ == "__main__":
    main()
