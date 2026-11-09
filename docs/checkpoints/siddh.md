# Siddh backend checkpoint

## Current phase — 5: Cursor and no-look-ahead engine

- State: complete
- Verified: 2026-11-07, Python 3.12.13; no added dependencies.
- Implemented: authenticated owned simulation create/list/get/advance; strict
  session/cash/version/key bounds; initial after-close cursor and cash state;
  immutable dataset/fingerprint pin; one equity snapshot per visited session;
  completion rules; scoped market data with date and available_at SQL filters;
  serialized writes, atomic success receipts, exact replay, and safe failures.
- Migration: 0003_simulations adds simulations, equity_snapshots,
  idempotency_receipts with constraints/FKs; prior tables/data preserved.
- Changed: app/simulations.py, app/models.py, app/main.py,
  migrations/versions/0003_simulations.py, tests/test_simulations.py,
  scripts/verify_simulations.py, scripts/verify_datasets.py (latest head),
  docs/fixtures/simulations.json, docs/API_CONTRACT.md, backend/README.md,
  docs/HANDOFFS.md, docs/BACKEND_WALKTHROUGH.md, this checkpoint.
- Full `.venv-local/bin/python -m pytest -q`: 205 passed, 152 non-failing
  Starlette/httpx TestClient and Alembic path-separator warnings.
- `.venv-local/bin/python -m compileall -q app tests migrations scripts`: passed.
- `.venv-local/bin/python scripts/verify_simulations.py`: PASS for synthetic
  cursor/ownership/no-future bars/replay/snapshots/restart persistence.
- Same script with `--csv data/local/ibm.csv --manifest data/local/ibm.manifest.json`:
  PASS for real local-research data. Both runs use fresh temporary databases,
  repeated migrations, source import, two generated users, and actual Uvicorn.
  Localhost sockets required escalation.
- CLI acceptance in both smoke runs: current = 0003_simulations (head), no schema
  drift. Every selected session was visited; source OHLC matched only after
  availability. End-of-range, foreign access, future range, and persisted replay
  behavior passed. No developer database modified by automated acceptance.
- HTTP tests additionally cover two-user separation, exact byte replay before
  stale checks (even after completion), key scope across routes/resources/users,
  concurrent create/advance, injected receipt failures and whole-transaction
  rollback, missing-next-bar failure without skipping, SQL availability cutoff,
  dataset immutability/pinning, bounded inputs, and OpenAPI/fixture alignment.
- Phase boundaries: advance returns order_results []; no orders/fills/positions/
  transaction or portfolio/performance APIs implemented yet. Internal cash and
  snapshots are foundations for Phases 6–7, not completed accounting/analytics.
- Carried dependency: Phase 4 stays complete_local for shared-app historical
  data rights. The IBM sample remains ignored/local personal research only.
  Owner Siddh must obtain project-use raw data/terms and no-action evidence
  before final real-core acceptance, no later than Phase 10. Phase 5 backend
  acceptance does not clear that release dependency or browser integration.
- Handoff: exact schemas and synthetic fixtures published; Kiran can consume
  owned simulation/market routes using existing bearer auth and safe retry
  semantics. No external teammate messages sent.
- Next action: on next proceed, begin Phase 6 — orders and accounting, extending
  the same locked advance/receipt transaction. Do not implement Phase 7 yet.
- Learning notes: docs/BACKEND_WALKTHROUGH.md explains the cursor, ownership,
  version versus idempotency, atomicity, acceptance, and the learning question.

## Historical Phase 4 acceptance

- State: complete_local
- Verified: 2026-11-07, Python 3.12.13; no added dependencies.
- Implemented: bounded offline CSV/manifest import and admin inspection,
  Decimal validation and scaled-integer OHLCV storage, full symbol/session grid,
  source/usage/retrieval/raw-policy/action-review provenance, immutable ID/version
  and checksums, atomic serialized import/replay/conflict handling, sealing and
  database immutability triggers, authenticated metadata/instrument HTTP routes.
- Migration: 0002_datasets (new datasets/instruments/sessions/bars tables).
  Existing auth schema is preserved. Startup does not migrate or import.
- Changed: app/datasets.py, app/models.py, app/main.py,
  migrations/versions/0002_datasets.py, data/manifest.schema.json,
  data/fixtures/accounting.csv, data/fixtures/accounting.manifest.json,
  tests/test_datasets.py, scripts/verify_datasets.py, README.md, .gitignore,
  docs/API_CONTRACT.md, docs/fixtures/datasets.json, docs/fixtures/instruments.json,
  docs/HANDOFFS.md, docs/BACKEND_WALKTHROUGH.md, this checkpoint.
- Full `.venv-local/bin/python -m pytest -q`: 149 passed; 96 non-failing
  Starlette/httpx TestClient and Alembic path-separator warnings.
- Real HTTP `.venv-local/bin/python scripts/verify_datasets.py`: PASS for
  synthetic import/replay, fresh/repeated migrations, SQL immutability,
  manifest/persistence, and metadata-only access by two users.
- Same HTTP script with `--csv data/local/ibm.csv --manifest
  data/local/ibm.manifest.json`: PASS against real personal-research input.
  Both flows use fresh temporary DBs; localhost sockets required escalation.
- Migration CLI: current = 0002_datasets (head); check = No new upgrade
  operations detected. Real local import/replay, inspected manifest, reopening,
  and New York-to-UTC schedule checks also passed separately.
- Source evidence: Alpha Vantage public IBM raw daily sample, Oct 14–16 2026;
  retrieved via web on Nov 7. Raw OHLCV copied without rounding or adjusted close.
  Each selected session's dividend/split fields are 0.0000/1.0; NYSE calendar
  and regular hours checked. Source URLs and limits are in README/walkthrough.
- Local-only evidence: ignored backend/data/local/{ibm.csv,ibm.manifest.json,
  source_evidence.json,imported-manifest-inspection.json}. This is a selected
  source extract, not a claim that the full original API response was downloaded.
- Remaining real-integration dependency: this Alpha Vantage sample has only a
  personal-use grant; shared-app rights are not cleared. Owner Siddh must obtain
  suitable project-use raw data with no-action evidence and verify its import
  before final real-core acceptance, no later than Phase 10. No shared-app real
  dataset acceptance is claimed. Synthetic fixtures do not satisfy that release gate.
- Tests are offline; restricted data is not in tracked fixtures or frontend
  artifacts. Automated acceptance does not use the developer's database.
- Contracts/handoff: metadata-only datasets and instruments routes, bounded
  schemas and matching frontend fixtures published. No unscoped price route.
  Kiran can integrate metadata/auth; production content and browser acceptance
  remain later dependencies. No external teammate messages sent.
- Historical next action: Phase 5 cursor (now complete above).
  The guide permits advancement from complete_local; carry the shared-app data
  dependency forward and resolve it before Phase 10. Do not implement orders yet.
- Learning notes: docs/BACKEND_WALKTHROUGH.md explains Phase 4 and acceptance.

## Historical Phase 3 acceptance

- State: complete
- Acceptance verified: 2026-11-07, Python 3.12.13, backend/.venv-local.
- Implemented: register/login/me/logout, bounded normalized credentials,
  Argon2id password hashing/rehash, opaque expiring/revocable tokens stored only
  as SHA-256 digests, reusable authentication dependency, generic login errors,
  configurable bounded thread-safe login throttling, and safe error envelopes.
- Migration: unchanged 0001_auth; no additional schema changes required.
- Dependency blocker resolved: user regenerated requirements.lock and installed
  dependencies. All 32 locked versions match the environment, including
  argon2-cffi 25.1.0 and email-validator 2.3.0. pip check passed.
- Full `.venv-local/bin/python -m pytest -q`: 73 passed, 61 non-failing warnings
  (Starlette/httpx TestClient and Alembic path separator deprecations).
- `.venv-local/bin/python scripts/verify_auth.py`: PASS for real HTTP auth,
  two-user separation, restart persistence, and persisted logout. Initial
  sandbox socket denial was resolved by an escalated rerun.
- Covered: registration/duplicates/normalization/password bounds, password hashes
  and rehashing, generic invalid login, malformed/unknown/expired/revoked tokens,
  logout, current-user dependency, independent sessions/two users, persistence,
  throttling/window/concurrency/capacity, safe errors, OpenAPI/fixture consistency.
- Earlier partial acceptance: 27 config/database/error tests and compilation
  passed; full suite was initially blocked by missing dependencies/PyPI DNS.
  Final results above supersede those implemented_unverified notes.
- Changed files: app/auth.py, app/errors.py, app/main.py, app/config.py,
  app/models.py, requirements.in, requirements.lock, .env.example,
  tests/test_auth.py, tests/test_errors.py, tests/test_config.py,
  scripts/verify_auth.py, README.md, .gitignore, docs/API_CONTRACT.md,
  docs/fixtures/auth.json, docs/HANDOFFS.md, docs/BACKEND_WALKTHROUGH.md,
  this checkpoint.
- Limits: limiter is process-local and resets on restart; use a single process
  and explicit proxy trust. No registration throttle, email verification,
  password recovery, or auth UI. Frontend/browser integration remains pending
  for later phases; shared S4 owns auth UI. No real users seeded or modified.
- Owners: Siddh backend; Kiran later supplies curriculum and consumes auth for
  owned feature APIs. No teammate messages sent.
- Historical next action: Phase 4 datasets (now complete_local above).
- Learning notes: docs/BACKEND_WALKTHROUGH.md includes Phase 3 code explanation,
  initial blocker, final acceptance evidence, and an understanding question.

## Historical Phase 1–2 acceptance

- Phase: 2 — Database and repeatable migrations
- State: complete
- Phase 1 state: complete
- Acceptance verified: 2026-11-07; Python 3.12.13, existing backend/.venv-local.
- Implementation: FastAPI health/docs/configuration; SQLAlchemy sessions, SQLite
  foreign keys, constrained user/hashed-token storage, reversible 0001_auth migration.
- Dependency lock is committed (1e64c80). All 26 pinned versions match the
  installed environment; pip check reports no broken requirements. A fresh
  dependency download was not repeated.
- Checks: `.venv-local/bin/python -m pytest -q` — 18 passed. Covers health,
  schema/docs, configuration, repeatable migrations, downgrade/re-upgrade,
  metadata drift, constraints, rollback, and persistence after reopening.
- CLI acceptance against a fresh temporary database: upgrade head twice passed;
  current = 0001_auth (head); check = No new upgrade operations detected.
- Runtime acceptance: Uvicorn clean startup/shutdown; real HTTP health, docs,
  and OpenAPI returned 200. Health payload and published route verified.
  Localhost sockets were blocked in sandbox; rerun with escalation passed.
- Non-failing warnings: Starlette/httpx TestClient deprecation and Alembic
  legacy path separator. No unresolved Phase 1–2 local acceptance blocker.
- Phase 1–2 acceptance-only changed files: backend/README.md, docs/HANDOFFS.md,
  docs/checkpoints/siddh.md. At that acceptance point, no Phase 3 code had been added.
- Dependencies/owners: Siddh owns next backend phase; Kiran later supplies
  production curriculum. Frontend integration remains later acceptance.
  No external teammate messages sent.
- Historical next action: Phase 3 auth APIs (now complete above).
- Learning notes: docs/BACKEND_WALKTHROUGH.md records the Phase 1–2 code
  walkthrough and acceptance evidence; extend it after subsequent phases.
