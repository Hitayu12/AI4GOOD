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

Expected test result: 4 passed. This result has NOT yet been verified.
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

