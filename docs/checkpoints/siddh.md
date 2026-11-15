# Siddh backend checkpoint

## Next terminal session — historical HTTP acceptance passed

Read this checkpoint, `docs/BACKEND_MERGE_HANDOFF.md`, the API contract and Git
status before editing. Preserve all uncommitted backend work. The user-selected
AAPL/MSFT/NVDA/TSLA/AMZN yfinance dataset has been downloaded and the user reports
PASS for real Uvicorn HTTP acceptance on **all five symbols**. Do not download
again into the existing immutable snapshot or restart completed phases.

- Dataset: `backend/data/local/yfinance-five-20250113-v1/` (ignored by Git).
- Four sessions Jan 13–16 2025, 20 bars; source evidence and manifest present.
- Latest backend suite: 290 passed. Technical historical HTTP acceptance passed.
- Remaining final-release dependency: shared-app source-use rights, as recorded
  in the manifest; download/testing does not establish redistribution permission.
- Next integration action: explicitly import into the chosen migrated app database
  using the README commands, then coordinate frontend integration. Acceptance
  used disposable temporary databases and did not populate the app database.
- Tutor auth/ownership and Docker packaging handoffs remain in the merge guide.
- No new commit, push, merge or deployment has been performed/authorized here.

To repeat historical acceptance if later code changes justify it, from `repo/backend`:

```sh
.venv-local/bin/python scripts/verify_backend.py --all-symbols \
  --csv data/local/yfinance-five-20250113-v1/prices.csv \
  --manifest data/local/yfinance-five-20250113-v1/manifest.json
```

## Current phase — 10: Final backend acceptance

### Latest result — all five historical symbols passed real HTTP

- State: technical backend acceptance passed; final release acceptance remains
  blocked only on documented shared-app historical source-use rights.
- User-run evidence: `scripts/verify_backend.py --all-symbols` with the selected
  CSV/manifest reported PASS separately for AAPL, AMZN, MSFT, NVDA and TSLA.
  Each run covered real Uvicorn HTTP, fresh migrations/import, actual curriculum/
  scoring/progress, buy/sell/P&L, ownership/no-future data, receipts and persistence
  across server restarts. This supersedes prior pending-download/HTTP notes.
- Agent read-only validation: existing CSV/manifest passes validate_files; five
  symbols × four sessions = 20 bars, Jan 13–16 2025, declared verified_none actions.
  Provider evidence present. Retrieval date in manifest: 2026-11-15 (UTC).
- CSV SHA-256: a2011cf3fb3e323ee25d9bba51f3e58e418db8031e97e4031027684241cfe1f1.
- Evidence versions: yfinance 1.8.0, exchange-calendars 4.13.3, pandas 3.1.1.
- Runtime suite remains 290 passed; documentation-only update needs no rerun.
- Data remains local/ignored, with source limitations intact. Acceptance used
  temporary databases; no developer/app database was populated by those runs.
- Next: select/configure the intended persistent app database, explicitly migrate
  and import this snapshot, then use the backend merge handoff for integration.
  Do not label shared publication approved or browser/deployment verified.

### Adapter preparation history — superseded by result above (2026-11-14)

- Implemented user-selected AAPL/MSFT/NVDA/TSLA/AMZN downloader and full
  per-symbol acceptance option. Default window Jan 13–16 2025.
- Optional download libraries live in requirements-data.in and are installed in
  a separate .venv-data; runtime requirements.lock is unchanged.
- 26 new offline tests passed, including every selected symbol's full API buy/
  sell/P&L/receipt/restart flow with explicitly synthetic prices.
- Latest full suite: 290 passed (47.83s), one existing TestClient deprecation
  warning. compileall and git diff --check passed.
- Actual download attempt stopped on missing optional dependencies. pip dry-run
  could not resolve yfinance in this restricted session. No real Yahoo data,
  imported app database or five-symbol historical acceptance is claimed.
- Next: run the exact commands above in the user terminal; report download and
  --all-symbols real HTTP output. Keep source-use restrictions explicit.

### Prior core acceptance evidence

- State: blocked on shared-app historical data only; implementation and synthetic
  real HTTP core acceptance complete.
- Date/environment: 2026-11-14, Python 3.12.13, branch siddh; no new dependencies.
- User authorized the remaining backend phases with per-phase documentation;
  implementation proceeded sequentially and each phase was reported in chat.
- Added scripts/verify_backend.py: default real Uvicorn HTTP, isolated temporary
  SQLite DB, repeated migrations/schema-drift check, explicit repeatable dataset
  seed/import, generated two-user auth, actual Kiran curriculum/quiz/progress,
  queued buy/sell, next-open fills, independent source-price/P&L reconciliation,
  visited-only equity, no-future requests, replay after completion/restart,
  resource/progress persistence across fresh apps/processes, persisted logout.
  Never modifies the developer database or resets/seeds real users.
- `.venv-local/bin/python scripts/verify_backend.py --transport asgi
  --write-fixtures ../docs/fixtures`: PASS using the synthetic accounting source;
  equity reference 1020.00 -> 1010.00 -> 1015.00 and final realized 15.00.
- Same script with `--transport asgi --csv data/local/ibm.csv --manifest
  data/local/ibm.manifest.json`: PASS using existing personal-research historical
  input. No restricted prices exported/committed; this does not clear shared rights.
- Default real HTTP script attempted after migrations/import: blocked by
  localhost bind PermissionError [Errno 1] Operation not permitted. Earlier
  verify_auth.py attempt hit the same restriction. ASGI is in-process API/SQLite
  verification with app restart, not a socket/server-process acceptance claim.
- Final `.venv-local/bin/python -m pytest -q`: 264 passed (30.73s), one
  existing Starlette/httpx TestClient deprecation warning. compileall passed.
- Financial/learning response fixtures generated from actual synthetic API
  responses. 36 focused hardening/database tests passed (1.61s), including all
  nine new fixtures against their published models and curriculum artifact hash.
- Changed: scripts/verify_backend.py, docs/fixtures, BACKEND_MERGE_HANDOFF.md,
  README, HANDOFFS, checkpoint; Phase 6–9 implementation details below.
- Socket blocker resolved — user-run evidence, 2026-11-14: the user ran
  `.venv-local/bin/python scripts/verify_backend.py` in their terminal and
  reported PASS: real Uvicorn HTTP; fresh migrations/import, actual curriculum/
  scoring/progress, buy/sell, P&L, ownership/no-future data, receipts and restart
  persistence. Dataset: synthetic accounting reference. This supersedes the
  environment blocker for synthetic HTTP acceptance; the agent did not rerun it.
- Remaining blocker (Siddh/data): obtain raw historical data permitted for the shared app,
  accurate terms/manifest and no-action evidence; run the same script with
  --csv/--manifest. Existing IBM usage is personal research only.
- Merge handoffs (Kiran): tutor placeholder auth/ownership must be replaced with
  real dependencies before mounting; Docker packaging must include migrations,
  curriculum and the lock; switch frontend fixtures off and retain retry keys.
  Actual browser/deployment acceptance remains Kiran's integration gate.
- No merge, commit, push, deployment or external teammate messages performed.
- Next action: resolve the historical-data acceptance blocker, record results, then
  mark Phase 10 complete. Do not claim final release acceptance before that.

## Phase 9 acceptance

- State: complete_local; verified 2026-11-14, Python 3.12.13.
- Full suite: 254 passed (30.54s), one existing Starlette/httpx deprecation warning.
  pip check: no broken requirements. git diff --check and compileall passed.
- Added explicit ALLOWED_ORIGINS (empty by default; at most 20 HTTP(S) origins),
  bearer/idempotency preflight configuration, no credentialed/wildcard CORS.
- GET/HEAD database requests now begin a real SQLite snapshot so concurrent
  advancement cannot mix cursor/holdings/ledger states in one response.
- Added hardening tests for CORS, invalid origin config, required idempotency
  headers, private OpenAPI exclusions, and read transaction behavior.
- Updated legacy Phase 5 assertions: portfolio/performance now succeed and must
  exclude future dates; unscoped full-history routes still return 404.
- Updated dataset/simulation smoke scripts to latest head 0005_learning;
  added Alembic path_separator config to eliminate legacy config warnings.
- Handoff/release findings from Kiran revision 9d939127c704b31986d491913179d1ff68737827:
  tutor router still has mock identity/ownership (must replace before enabling);
  Dockerfile omits Alembic/migrations/curriculum and uses a separate requirements
  file (must package actual backend and lock). No external files/branch changed.
- Real-socket verify_auth.py attempted: localhost bind denied with PermissionError
  [Errno 1] Operation not permitted. This environment cannot prove socket HTTP.
- Next: Phase 10 final isolated end-to-end acceptance; retain socket/data blockers.

## Phase 8 acceptance

- State: complete_local; verified 2026-11-14.
- Implemented authenticated lesson/quiz reads, private server scoring, validation,
  atomic idempotent attempts, persisted per-user/current-version progress,
  latest/best scores, exact 80% pass boundary, and definition-change guard.
- Ingested Kiran's actual five version-1 lesson/quiz/scoring definitions from
  GitHub (CDs, HYSAs, stocks, ETFs, options). Server-only JSON and source blob
  hashes/conversion evidence in backend/data/curriculum/PROVENANCE.json.
  Preserved draft review status; no reviewed-content claim or fixture substitution.
- Migration: 0005_learning adds version-pinned quiz attempts; no new dependencies.
- Checks: pytest -q tests/test_learning.py tests/test_database.py — 29 passed
  (4.56s). Includes no answer keys in public payload, missing/duplicate/unknown
  answers, stale versions, 80% boundary, best/latest, version reset, two-user
  isolation, concurrent retry, injected receipt rollback, migrations/schema drift.
  compileall app/tests/migrations/scripts passed.
- Changed: app/learning.py, app/models.py, app/main.py, 0005_learning migration,
  tests/test_learning.py, data/curriculum, checkpoint, API contract and handoff.
- Still pending: integrated browser acceptance on Kiran branch; content remains
  author draft. Real HTTP/database learning persistence checked in Phase 10.
- Next: Phase 9 hardening, exact CORS configuration and full-suite handoff.

## Phase 7 acceptance

- State: complete_local; verified 2026-11-14.
- Implemented protected portfolio/performance v2 routes; cursor-bounded marking,
  realized/unrealized gains, return percentage, visited-session equity curve.
- Checks: pytest -q tests/test_performance.py tests/test_trading.py — 22 passed
  (5.23s). Reference equity 1020/1010/1015, realized 15.00 after liquidation;
  no-trade returns, multiple pooled purchase lots, negative returns, half-up
  residual allocation, two-user/unauthenticated protection and no-store passed.
- Corrected an initial test expectation for half-up allocation of 1/2 cent;
  implementation correctly allocates that cent, preserving total basis.
- Changed: app/simulations.py, tests/test_performance.py, checkpoint, API contract.
- No new migration/dependencies. Real-socket integration remains final acceptance.
- Next: Phase 8 using Kiran's actual version-1 lesson/quiz/scoring definitions.

## Phase 6 acceptance

- State: complete_local; verified 2026-11-14, Python 3.12.13.
- User authorized completion of Phases 6–10 with per-phase updates.
- Baseline suite rerun before edits: 205 passed (21.14s).
- Implemented owned order submission/listing and transactions; one pending order;
  current-close preflight and next-open execution; integer cash/positions/cost
  allocation; atomic fill/advance/snapshot/receipt; exact retry replay.
- Migration 0004_trading adds orders, positions, transactions, constraints and
  a partial unique index enforcing one pending order. Existing data preserved.
- Checks: pytest -q tests/test_trading.py tests/test_database.py
  tests/test_simulations.py — 84 passed (19.31s). Includes independent buy/sell/
  liquidation reconciliation, gap rejection, oversells/invalid inputs, two-user
  protection on new routes, concurrent retries/writes, injected receipt failure
  rollback, repeated migrations/downgrade/re-upgrade and no schema drift.
- Changed: app/models.py, app/simulations.py, 0004_trading migration,
  tests/test_trading.py, checkpoint, API contract and backend README.
- Real socket HTTP trading acceptance deferred to final smoke; no browser claim.
- Git fetch failed because shell DNS cannot resolve github.com. Connected GitHub
  reads work: confirmed Kiran frontend and authoritative lesson handoff remotely.
  No merge, push, or teammate files changed.
- Carried dependency: project-use historical data rights remain unresolved.
- Next: Phase 7 portfolio/performance endpoints and cost/rounding acceptance.

## Historical Phase 5 acceptance

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
