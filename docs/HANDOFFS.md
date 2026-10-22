# Backend handoffs

## Phase 1 foundation — Siddh
Contract: docs/API_CONTRACT.md, shared v2. Only GET /api/v1/health is
implemented; docs/fixtures/health.json is the matching frontend fixture.
Reproduce using backend/README.md. API and docs startup plus health tests are
pending dependency installation; sandbox DNS prevents resolving PyPI.
No runtime or frontend acceptance claimed. Later lesson definitions remain
Kiran's responsibility. This note has not been sent to teammates.


## Phase 2 database — Siddh
Branch: siddh. Migration: 0001_auth. Run the database verification commands in
backend/README.md against an isolated database. User and hashed-token storage
is provided; auth routes arrive in Phase 3. Application startup does not run
migrations. SQLite must use persistent storage and a single writer at deployment.
Migration execution, dependency locking and runtime tests remain pending because
dependencies are unavailable in the coding environment. No passing acceptance
or teammate notification is claimed.
