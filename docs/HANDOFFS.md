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

## Phase 1–2 acceptance update — Siddh — 2026-11-07
Supersedes the pending runtime/dependency status above. Contract remains shared v2;
migration remains 0001_auth. The dependency lock is committed and its 26 package
versions match the Python 3.12.13 verification environment. pip check passed;
18 tests passed. Fresh temporary SQLite CLI upgrade/repeated upgrade/current/check
passed with no schema drift. Uvicorn startup and actual HTTP health/docs/OpenAPI
checks passed (200), followed by clean shutdown. Localhost smoke testing required
sandbox escalation. Reproduction commands and warning details are in
backend/README.md. No frontend acceptance or auth-route implementation is claimed;
Phase 3 is next. This note has not been sent to teammates.

## Phase 3 authentication — Siddh — implemented_unverified

Contract: shared v2 plus documented Phase 3 bounds in docs/API_CONTRACT.md;
synthetic schema examples: docs/fixtures/auth.json. Reuses migration 0001_auth.
Register/login/me/logout, Argon2id password hashes, hashed expiring/revocable
opaque tokens, current-user dependency, safe errors, and configurable process-local
login throttling are implemented. Frontend should keep tokens in memory and use
Bearer headers over HTTPS outside localhost; shared S4 owns auth UI.

Acceptance blocker: argon2-cffi and email-validator are not installed; PyPI DNS
fails even in escalated commands. requirements.in declares them, but the retained
Phase 1–2 lock does not include them. The current app cannot start until resolved.
Compile checks passed; 27 config/database/error tests passed. Full suite failed
collection in auth and health tests because argon2 is missing. Auth tests and
real HTTP smoke have not passed; no frontend acceptance is claimed.

Owner: Siddh resolves dependencies, regenerates/installs hashed lock, runs full
pytest and scripts/verify_auth.py (temporary DB, two users, restart/logout
persistence). Exact commands/expected output: backend/README.md, Phase 3 section.
Kiran can review shapes now; runtime acceptance remains pending. Next proceed
resumes Phase 3 rather than datasets. No external teammate notification sent.

Phase 3 retry, 2026-11-07: dependencies still absent; escalated piptools resolution
failed again. Direct PyPI checks both inside and outside the sandbox reported
DNS failure (curl exit 6). Acceptance remains pending; no Phase 4 work started.

## Phase 3 final acceptance — Siddh — complete — 2026-11-07

Supersedes Phase 3 pending/blocker notes above. User regenerated the hashed lock
and installed dependencies. Python 3.12.13; all 32 installed locked versions
match; pip check passed. Complete suite: 73 passed, 61 non-failing deprecation
warnings. Actual HTTP smoke passed auth, two users, restart persistence, and
persisted logout against an isolated temporary migrated SQLite database;
localhost sockets required escalation. No additional migration beyond 0001_auth.

Contract and examples remain docs/API_CONTRACT.md and docs/fixtures/auth.json.
Reproduce with backend/README.md Phase 3 commands. Frontend/browser integration
is pending later acceptance; shared S4 owns auth UI. Process-local throttling
requires a single process and explicit proxy trust. Phase 4 historical datasets
is next, not yet started. No external teammate notification sent.

## Phase 4 datasets — Siddh — complete_local — 2026-11-07

Contract: shared v2 plus Phase 4 details in docs/API_CONTRACT.md. Migration:
0002_datasets. Metadata examples: docs/fixtures/datasets.json and instruments.json.
Authenticated GET datasets/instruments exposes no prices. Offline CLI and bounded
manifest schema live in app/datasets.py and backend/data/manifest.schema.json.
Imports are atomic, checksummed, replay-safe, immutable, and use integer prices.

Checks: full suite 149 passed (96 non-failing deprecation warnings). Both synthetic
and real personal-research HTTP smoke flows passed against fresh temporary
migrated databases; verify_datasets.py checks migration/reimport/immutability,
persistence and two-user metadata access. Localhost sockets required escalation.
Reproduction: backend/README.md Phase 4 commands; no live downloads in tests.

Real IBM Oct 14–16 2026 raw OHLCV and per-session split/dividend evidence were
inspected from Alpha Vantage's demo and imported successfully, with NYSE session
hours reviewed. Local evidence is ignored under backend/data/local/. The
provider's personal-use grant does not clear shared-app use. Owner Siddh must
obtain project-use data/terms and no-action evidence before final real-core
acceptance, no later than Phase 10. No restricted prices were placed in shared
fixtures. The committed TEST dataset is explicitly synthetic.

Next proceed may advance to Phase 5 under the guide's complete_local allowance,
carrying that real-data dependency. Kiran can consume metadata/auth shapes;
no browser integration is claimed. This note has not been sent to teammates.

## Phase 5 owned cursor — Siddh — complete — 2026-11-07

Contract: docs/API_CONTRACT.md Phase 5 details; matching synthetic shapes in
fixtures/simulations.json. Migration: 0003_simulations. Create/list/get/advance
and simulation-scoped market-data routes enforce bearer auth and resource
ownership. Cursor is after-close UTC; future filters are rejected and market
SQL is bounded by both session date and availability time. No unscoped price
route, orders, public portfolio, or performance API is implemented yet.

Create/advance require client Idempotency-Key; retry timeouts with the SAME
key/body, never a new key. Receipts are user+route+resource scoped and checked
before stale versions/completion. Mutation/snapshot/receipt commit atomically.
Replays return the exact original response, which may have an older cursor;
use GET to refresh. Versions start at 1; successful advances increment once.

Checks: 205 tests passed, 152 non-failing deprecation warnings; syntax checks
passed. Actual HTTP smoke flows passed for synthetic and real local-research
inputs against fresh temporary migrated DBs, with two users, visited-only data,
full cursor progression, snapshots, saved-response replay, and restart
persistence. Localhost sockets required escalation. Reproduce using
backend/README.md Phase 5 commands. No live downloads in automated tests.

Phase 4 shared-app data-rights dependency remains open (owner Siddh; resolve
before final integration, no later than Phase 10). Real research input is still
ignored/local, not a shipped dataset. Kiran can integrate the owned routes and
label synthetic demos via dataset metadata; browser acceptance is not claimed.
Next phase adds pending orders/fills within the existing atomic advancement.
This note has not been sent to teammates.

## Phase 8 curriculum ingestion — Siddh — 2026-11-14

Consumed Kiran Handoff 002 from the remote kiran branch via connected GitHub.
Actual LESSONS, QUIZZES and SERVER_ANSWER_KEYS are converted without editorial
changes into backend/data/curriculum/kiran-v1.json; blob hashes and artifact hash
are recorded beside it. Five lesson IDs and quiz IDs match his client exactly.
All remain draft. No server scoring keys are exposed through public quiz routes.
Use /api/v1/lessons, /lessons/{id}, /quizzes/{id}, /quizzes/{id}/attempts and
/progress with bearer auth; attempts also require Idempotency-Key.
29 focused learning/database tests passed. Browser integration is pending merge.

## Phases 6–10 backend handoff — Siddh — 2026-11-14

Current reproducible setup, v2 financial/learning schemas, exact checks and merge
findings are consolidated in `docs/BACKEND_MERGE_HANDOFF.md`. Head is
0005_learning; use requirements.lock. Order submission increments version, then
advance fills/rejects with atomic receipts. Portfolio/performance and actual
Kiran curriculum/progress routes are provided. Fixtures match real synthetic
API responses. ALLOWED_ORIGINS explicitly enables the frontend origin.

The final 264-test suite passed. The user subsequently reported PASS for real
Uvicorn HTTP synthetic core acceptance on 2026-11-14; shared-app historical rights
and the permitted historical HTTP run remain pending. In-process synthetic and local-research historical acceptance
cover complete API/database flows and app restarts. Kiran's tutor needs real
backend auth/ownership wiring before mounting, and his Docker packaging needs
the migration/content/lock files. His branch was only read; no external message,
merge, push, browser integration or deployed acceptance was performed.

## Five-symbol yfinance adapter — Siddh — 2026-11-14

User-selected symbols: AAPL, MSFT, NVDA, TSLA, AMZN. Download/validation script and
optional separate data dependencies are prepared; backend README/checkpoint have
copyable commands. Use `verify_backend.py --all-symbols` after download to trade
and restart-test each symbol. 26 offline tests passed, with synthetic data only.
Real download remains unexecuted because optional packages cannot be resolved
in this session. No database was modified, no Yahoo data was added to Git, and
runtime requirements.lock remains unchanged. Record real user-terminal results
before claiming historical five-symbol acceptance.

### Historical acceptance update — all five symbols

The user reported PASS for real Uvicorn HTTP acceptance (`--all-symbols`) on
AAPL, AMZN, MSFT, NVDA and TSLA. The agent validated the generated local snapshot:
20 bars across Jan 13–16 2025, checksum matches, provider evidence present.
This supersedes earlier pending-download/historical-HTTP notes. Manifest retrieval
date is 2026-11-15 UTC. Source-use limitations remain unchanged. Acceptance used
fresh temporary databases; explicitly migrate/import into the intended persistent
app database to make this dataset available to the frontend. See the current
checkpoint and merge handoff for evidence and remaining integration work.
