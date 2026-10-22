# Backend foundation

Python 3.11+; the available local interpreter was Python 3.14.6.
Run from the repository root:

```sh
cd backend
python3 -m venv .venv
.venv/bin/python -m pip install pip-tools
.venv/bin/pip-compile --generate-hashes --output-file requirements.lock requirements.in
.venv/bin/python -m pip install --require-hashes -r requirements.lock
.venv/bin/python -m pytest -q
.venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Expected result: all tests pass. The expanded Phase 2 suite has NOT yet run here.
In another terminal, `curl http://127.0.0.1:8000/api/v1/health` should return
`{"status":"ok"}`. Open http://127.0.0.1:8000/docs for interactive API docs;
http://127.0.0.1:8000/openapi.json publishes the implemented schema.

Dependency resolution is blocked in the current sandbox because pypi.org cannot
resolve. No dependency lock or successful runtime test is claimed. Generate and
commit requirements.lock after network access is restored, then use that lock for
subsequent installs. Phase 1 remains implemented_unverified until health/tests,
server startup, and dependency locking pass.

Configuration is read from environment variables at application creation.
`.env.example` documents the optional app name; export variables manually.
No database, credentials, auth bypass, or frontend is required for Phase 1.
See ../docs/API_CONTRACT.md for the complete planned interface. Only health is
implemented now. This endpoint reports process liveness, not database readiness.


## Phase 2: database and migrations

Use the same backend virtual environment and dependency locking commands above.
SQLAlchemy and Alembic are now declared in requirements.in. From backend/:

```sh
export DATABASE_URL=sqlite:///./ai4good.db
.venv/bin/python -m alembic upgrade head
.venv/bin/python -m alembic current
.venv/bin/python -m alembic check
.venv/bin/python -m pytest -q
```

Expected current revision: `0001_auth (head)`. Repeating upgrade head is safe.
`alembic check` should report no new upgrade operations. Tests migrate fresh files
under pytest temporary directories and reopen them to check persistence. They
never use the configured application database. Auth constraint tests use explicit
test-only placeholders; these are not usable production accounts or passwords.

Startup does not create or migrate tables: run migrations before serving API
routes. Request sessions close and roll back uncommitted work; future mutation
routes must commit explicitly. SQLite foreign keys are enabled on every connection.
Run one writer process; a database file needs durable storage for deployment.
The default relative path is resolved from your working directory, so run backend
commands consistently from backend/ or use an absolute SQLite path.

User emails are unique and constrained to normalized lowercase without outer
spaces. Tokens store only 64-character lowercase SHA-256 digests with UTC Unix
second timestamps and expiry/revocation constraints. Phase 3 supplies actual
password hashing, bearer-token issuance, authentication and normalization.
There are no auth routes or demo seed command yet. No real users are inserted.
Future financial models must use integer cents and six-place scaled integer
prices; this phase does not introduce financial columns.

Development-only reversal (deletes auth tables and their data):
`.venv/bin/python -m alembic downgrade base`. Do not use on a real user database.
