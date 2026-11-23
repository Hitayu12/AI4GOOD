# AI4Good backend

**Current state:** Phases 1–3 have passed backend acceptance. Phase 3 was
verified on 2026-11-07 after the user installed the new dependencies: 73 tests
passed, pip check passed, all 32 locked versions matched, and the real HTTP
smoke flow passed including restart persistence and persisted logout.
Phase 4 is now `complete_local`: the full suite has 149 passing tests and both
synthetic and real local-research dataset HTTP checks pass. Shared-app real-data
rights remain pending; see the Phase 4 section. Phase 5 cursor/ownership acceptance
is complete: **205 tests pass**, with synthetic and real local-research HTTP
simulation checks passing. Latest migration: **0003_simulations**.

Python 3.11+; acceptance verified on Python 3.12.13 on 2026-11-07.
Run from the repository root:

```sh
cd backend
python3 -m venv .venv
.venv/bin/python -m pip install --require-hashes -r requirements.lock
.venv/bin/python -m pytest -q
.venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --no-proxy-headers
```

Historical Phase 1–2 result: 18 tests passed in `.venv-local` before Phase 3.
The commands above create a new environment named `.venv`; use `.venv-local`
instead when reproducing checks with the verified existing environment.
In another terminal, `curl http://127.0.0.1:8000/api/v1/health` should return
`{"status":"ok"}`. Open http://127.0.0.1:8000/docs for interactive API docs;
http://127.0.0.1:8000/openapi.json publishes the implemented schema.

The committed requirements.lock pins dependencies with hashes. All 32 locked
package versions matched the verified environment, and pip check found no broken
requirements. Install from this lock; regenerate it only when changing dependencies.
The user regenerated the lock and installed dependencies before Phase 3 verification.

Configuration is read from environment variables at application creation.
`.env.example` documents the optional app name; export variables manually.
No database, credentials, auth bypass, or frontend is required for Phase 1.
See ../docs/API_CONTRACT.md for the interface and Phase 3 bounds. The health
endpoint reports process liveness, not database readiness.


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

Expected current revision: `0003_simulations (head)`. Repeating upgrade head is safe.
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
password hashing, bearer-token issuance, authentication and normalization;
that code has now passed Phase 3 acceptance.
There is no demo seed command. No real users were inserted during verification.
Future financial models must use integer cents and six-place scaled integer
prices; this phase does not introduce financial columns.

Development-only reversal (deletes backend tables and their data):
`.venv/bin/python -m alembic downgrade base`. Do not use on a real user database.

## Phase 1–2 acceptance — 2026-11-07

Verified with Python 3.12.13 and the committed dependency versions:

- `.venv-local/bin/python -m pip check`: no broken requirements.
- `.venv-local/bin/python -m pytest -q`: 18 passed.
- Against a fresh temporary SQLite database, `alembic upgrade head` succeeded
  twice, `alembic current` returned `0001_auth (head)`, and `alembic check`
  returned `No new upgrade operations detected.`
- Uvicorn started and shut down cleanly. Real HTTP requests to
  `/api/v1/health`, `/docs`, and `/openapi.json` returned 200; health returned
  `{"status":"ok"}` and OpenAPI included the health route.
- Tests verified migration reversal/re-upgrade, constraints, rollback, and
  persistence after disposal/reopening, using isolated temporary databases.

Localhost sockets required sandbox escalation for the HTTP smoke check.
Non-failing deprecation warnings remain for Starlette/httpx TestClient and
Alembic's legacy path separator setting. These checks do not claim frontend
integration or any Phase 3 authentication functionality.

## Phase 3: authentication — complete

Implemented routes:

| Route | Successful result |
| --- | --- |
| `POST /api/v1/auth/register` | 201 `{user:{id,email}}` |
| `POST /api/v1/auth/login` | 200 `{access_token,token_type:"bearer",expires_at}` |
| `GET /api/v1/auth/me` | 200 `{id,email}` |
| `POST /api/v1/auth/logout` | Empty 204; revokes the current token only |

Register/login require an ASCII email address (3–254 characters after trimming,
normalized lowercase) and a password of 12–128 characters (preserved exactly).
Unknown fields and invalid bodies return a safe 422 envelope. Wrong credentials
return generic 401 errors. Passwords use Argon2id; only SHA-256 token digests
are stored. Tokens expire by default after one hour. Registration is not login.

Settings, exported in your shell (automatic `.env` loading remains disabled):

| Variable | Default | Bounds |
| --- | --- | --- |
| `AUTH_TOKEN_TTL_SECONDS` | 3600 | 60–86400 |
| `LOGIN_MAX_ATTEMPTS` | 10 | 1–1000 |
| `LOGIN_WINDOW_SECONDS` | 60 | 1–3600 |

The thread-safe login limiter counts all schema-valid login attempts, including
successful ones, by client address. Full windows return 429 with `Retry-After`.
It is process-local, resets on restart, and caps tracked peers at 10000; new peers
at capacity receive 503. Use one server process. Direct serving should disable
proxy headers as above; a deployed reverse proxy requires explicitly trusted
proxy configuration. Registration throttling is not included in this phase.

Frontend handoff: keep the token in memory and send `Authorization: Bearer
<token>`. Reload may require logging in again. Use HTTPS outside localhost;
never log tokens/passwords or bundle live credentials. Responses use no-store.
The frontend auth UI remains shared S4 work. Synthetic shape examples are in
`../docs/fixtures/auth.json`.

### Reproduce Phase 3 acceptance

Run from `backend/`, using the existing Python 3.12 environment:

```sh
.venv-local/bin/python -m pip install pip-tools
.venv-local/bin/python -m piptools compile --cache-dir /private/tmp/ai4good-pip-tools --generate-hashes --output-file requirements.lock requirements.in
.venv-local/bin/python -m pip install --require-hashes -r requirements.lock
.venv-local/bin/python -m pip check
.venv-local/bin/python -m pytest -q
.venv-local/bin/python scripts/verify_auth.py
```

Expected: a lock containing the new dependencies, no broken requirements, all
tests passing, then `PASS: auth HTTP flow, two users, restart persistence, and
persisted logout.` The smoke script starts real Uvicorn processes against one
temporary migrated SQLite database, uses generated test-only credentials, checks
restart/revocation persistence, and cleans up. It never prints credentials or
uses your configured database. Localhost socket permission may be needed.
The complete suite and this HTTP smoke script passed on 2026-11-07.
The HTTP script required sandbox escalation for localhost socket access.

To serve manually after dependency installation, choose your database and run:

```sh
export DATABASE_URL=sqlite:///./ai4good.db
.venv-local/bin/python -m alembic upgrade head
.venv-local/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --no-proxy-headers
```

Open `/docs`, register, log in, and use its Authorize button with the returned
token to try `/me` and `/logout`. No new migration is needed for Phase 3.

### Initial Phase 3 checks (before dependencies were installed)

- `python -m compileall -q app tests migrations scripts`: passed.
- `.venv-local/bin/python -m pytest -q tests/test_config.py tests/test_database.py tests/test_errors.py`:
  **27 passed**; this is a partial suite, not auth acceptance.
- Full `pytest -q`: collection failed in auth and health tests because `argon2`
  is missing. `email-validator` is also absent.
- Dependency resolution and index checks failed, including escalated attempts;
  direct PyPI connectivity check reported `Could not resolve host: pypi.org`.
- Existing Phase 1–2 lock was retained; no new dependency hashes were invented.

### Final Phase 3 acceptance — 2026-11-07

- User regenerated the hashed requirements.lock and installed dependencies.
- Python 3.12.13; all 32 locked package versions match the installed environment,
  including argon2-cffi 25.1.0 and email-validator 2.3.0.
- `.venv-local/bin/python -m pip check`: no broken requirements.
- `.venv-local/bin/python -m pytest -q`: **73 passed**, 61 non-failing
  Starlette/httpx and Alembic deprecation warnings.
- `.venv-local/bin/python scripts/verify_auth.py`: **PASS** for real HTTP auth,
  two-user separation, restart persistence, and persisted logout. Initial socket
  binding was sandbox-blocked; the escalated rerun passed.
- No production/developer database was used by tests or the smoke script.
  Frontend/browser integration remains a later acceptance step. Phase 4 is next.

## Phase 4: versioned historical datasets — complete_local

The offline CSV importer validates provenance, exact prices, OHLC relationships,
integer volume, ordered rows, and a complete declared symbol/session grid.
It atomically inserts and seals each dataset. Identical reimports are safe;
changed data or metadata requires a new dataset ID and incremented version.
SQLite triggers prevent later edits, deletions, or extra bars on sealed datasets.
Application startup never auto-imports or downloads data.

From `backend/`, after dependency installation:

```sh
# Explicitly choose your local database; this creates no user accounts.
export DATABASE_URL=sqlite:///./ai4good.db
.venv-local/bin/python -m alembic upgrade head
.venv-local/bin/python -m app.datasets --csv data/fixtures/accounting.csv --manifest data/fixtures/accounting.manifest.json
.venv-local/bin/python -m app.datasets --inspect synthetic-accounting-v1
```

Expected: JSON with `result: "imported"`, `bar_count: 4`; repeating the import
returns `result: "unchanged"`. Inspection returns the stored manifest and its
SHA-256 fingerprint. CLI failures return exit 1 with a clear message; no stack
trace or raw database error is printed. Inspecting an absent ID fails clearly.

The CSV header must be exactly:

```csv
symbol,session_date,open,high,low,close,volume
```

Rows are sorted by session_date then symbol. Prices are parsed with Decimal,
must be whole cents between 0.01 and 1000000 USD, and are stored as six-place
scaled integers (`100.12` becomes `100120000`). Fractional cents, nonfinite
values, exponent notation, invalid bounds, and missing/duplicate bars are
rejected without rounding. Volume is a nonnegative signed-64-bit integer.

The manifest includes source/terms, retrieval date, immutable ID/version, CSV
checksum, raw/unadjusted USD policy, ordered instruments and exact UTC sessions,
calendar notes, action review, and limitations. Schema and limits are published
in `data/manifest.schema.json` and `../docs/API_CONTRACT.md`. The importer checks
these declarations; the operator must verify the underlying source, calendar,
and rights. A checksum detects a content change, not a false provenance claim.

### Reference fixture for later accounting phases

`data/fixtures/accounting.csv` is explicitly synthetic, symbol `TEST`:

| Session | Open | Close | Intended later check |
| --- | --- | --- | --- |
| 2026-01-05 | 100.00 | 100.00 | Starting cursor; submit buy 2 |
| 2026-01-06 | 100.00 | 110.00 | Buy fills; submit sell 1 |
| 2026-01-07 | 120.00 | 90.00 | Sell fills; submit final sell |
| 2026-01-08 | 95.00 | 95.00 | Final sale fills |

With initial cash 1000.00, these sessions support the contract's later equity
checks of 1020.00, 1010.00, and 1015.00. Trading/accounting logic is not part of
Phase 4. Fixture open/close times are 14:30/21:00 UTC, with an explicit no-action
assumption. This is not a sourced market dataset.

### Metadata APIs and frontend handoff

Authenticated users can call `/api/v1/datasets` and
`/api/v1/instruments?dataset_id=synthetic-accounting-v1`. They return only the
contract's metadata/instrument shapes. Missing tokens return 401, absent dataset
IDs return 404, and invalid query inputs return 422. Matching frontend fixtures
are in `../docs/fixtures/`. No unscoped full-history price endpoint is provided.

### Real-data evidence and remaining release dependency

A three-session IBM raw OHLCV extract (2026-10-14 through 2026-10-16) was read
from the Alpha Vantage public demo on 2026-11-07. The raw open/high/low/close and
volume were copied without rounding or using adjusted close. Every selected
price is already an exact whole cent. The separate dividend/split fields report
0.0000 and 1.0 for every selected session. NYSE calendar/hours were reviewed;
09:30–16:00 New York is 13:30–20:00 UTC for this window.

Sources:

- [Raw IBM daily data](https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=IBM&apikey=demo)
- [IBM dividend/split evidence](https://www.alphavantage.co/query?function=TIME_SERIES_DAILY_ADJUSTED&symbol=IBM&apikey=demo)
- [Alpha Vantage documentation](https://www.alphavantage.co/documentation/#daily)
- [Usage terms](https://www.alphavantage.co/terms_of_service/)
- [NYSE calendar and hours](https://www.nyse.com/trade/hours-calendars)

The raw-data/action extracts, normalized CSV, manifest, and inspected import are
local-only under ignored `data/local/`; no restricted prices are in shared
fixtures. They are explicitly labeled for individual research. Alpha Vantage's
personal-use grant does not clear this dataset for the team's shared app.
The sourced local import gate passed, but project-use data acceptance remains
pending: obtain appropriately licensed raw data and no-action evidence before
final real-core integration/release, no later than Phase 10. Automated tests
never download live data. No provider key or paid service was added.

### Phase 4 verification

```sh
.venv-local/bin/python -m pytest -q
.venv-local/bin/python scripts/verify_datasets.py
# Optional: uses the existing local-only real sample, not shipped fixtures.
.venv-local/bin/python scripts/verify_datasets.py --csv data/local/ibm.csv --manifest data/local/ibm.manifest.json
```

Actual results: **149 passed**; real HTTP smoke checks passed for both synthetic
and real local-research inputs. Each smoke run uses a fresh temporary migrated
database, repeated upgrades/imports, manifest inspection, SQL immutability,
reopening/persistence, two authenticated users, and metadata-only HTTP checks.
Phase 4 introduced revision `0002_datasets`; current head is now
`0003_simulations`. Alembic check reports no new operations.
Localhost socket permission required escalation. Existing 96 non-failing
Starlette/httpx and Alembic deprecation warnings remain. No new dependencies.

## Phase 5: owned simulation cursor — complete

Simulations pin an immutable dataset and start after the chosen session's close.
Every create/get/list/advance/market request is authenticated; individual
simulation resources also enforce ownership. Foreign and absent IDs both return
404. No order execution or portfolio/performance routes are implemented yet.

| Route | Result |
| --- | --- |
| `POST /api/v1/simulations` | 201 Simulation; requires Idempotency-Key |
| `GET /api/v1/simulations` | Current user's `{items:[Simulation]}` |
| `GET /api/v1/simulations/{id}` | Owned Simulation |
| `POST /api/v1/simulations/{id}/advance` | Next session; requires Idempotency-Key |
| `GET /api/v1/simulations/{id}/market-data/{symbol}` | Visible bars only; optional `from`/`to` |

Create body example, using the imported synthetic fixture:

```json
{"dataset_id":"synthetic-accounting-v1","start_session":"2026-01-05","end_session":"2026-01-08","initial_cash":"1000.00"}
```

Initial version is 1. Advance with `{"expected_version":1}` using a new key for
that new action; this moves to Jan 6 at 21:00:00Z and increments version to 2.
Advance responses have `order_results: []` in Phase 5. Start=end creates a
completed simulation; successful last-day advancement also completes it.
Fresh end-of-range advances and stale versions return 409.

The header key is 1–128 ASCII letters/digits/underscores/dots/colons/hyphens,
starting with a letter or digit; UUIDs are recommended. On timeout, retry the
same key and body. Replays return the exact saved response, including an earlier
cursor, even after newer advances. GET the simulation for current state.
Reusing a key with a different valid body returns 409. Keys are scoped by user,
route, and resource. SQLite serializes writes, and mutation/snapshot/receipt
commit atomically. No auth response is stored as a receipt.

Cash input must be a two-place decimal string greater than zero and at most
1000000000.00 USD. Dates must be actual selected dataset sessions in order.
Version is a strict integer 1–1000000000; a user can have at most 100 simulations.
Each starts with integer cash and one equity snapshot; advancement adds exactly
one snapshot per visited session. Cash remains unchanged until Phase 6 adds
accounting. These internal snapshots are not an implemented performance API.

Market data defaults to start..current_session within the selected window.
For example, `?from=2026-01-05&to=2026-01-05` is visible initially;
`?to=2026-01-06` returns 422 until Jan 6 has been reached. The SQL query checks
both session date and availability time. Unknown/extra filters are rejected;
there is no full-history endpoint. Missing data fails safely and rolls back
an advance instead of silently skipping a session. Future session dates shown
as metadata do not make those sessions' prices visible.

To serve manually, follow the setup/import commands above, run migrations to
`0003_simulations`, and start Uvicorn. In `/docs`, register/login and Authorize,
then create a simulation with a key, read its visible bars, and advance with the
current version. Synthetic API examples: `../docs/fixtures/simulations.json`.
Clients should label synthetic simulations using their dataset metadata.

### Reproduce Phase 5 acceptance

Run from `backend/` using the existing verified environment:

```sh
.venv-local/bin/python -m pytest -q
.venv-local/bin/python scripts/verify_simulations.py
# Optional existing local-only real source sample:
.venv-local/bin/python scripts/verify_simulations.py --csv data/local/ibm.csv --manifest data/local/ibm.manifest.json
```

Actual results on Python 3.12.13: **205 passed**, 152 non-failing existing
Starlette/httpx/Alembic deprecation warnings. Both real HTTP flows printed
`PASS` for simulation cursor, ownership, no future bars, replay, snapshots, and
restart persistence. They run fresh/repeated migrations and schema checks in
temporary databases, import the chosen source, create two generated test users,
visit every session, verify price/time filtering, restart the server, and replay
saved responses. No developer database or live download is used. Localhost
sockets required escalation in the coding sandbox. Syntax checks also passed.

Phase 5 backend acceptance is complete. Shared-app historical-data rights from
Phase 4 and later browser integration remain pending. Next is Phase 6 orders
and accounting; no new dependencies were added in this phase.

## Phase 6 — orders and accounting

Migration head is `0004_trading`. After `python -m alembic upgrade head`, use the
owned simulation `/orders` POST/GET and `/transactions` GET routes. A submitted
order is pending; use its returned simulation.version in the next advance.
Advance fills at the next open or rejects a cash gap atomically. Prices and
cash remain fixed-point integers internally. OpenAPI documents exact schemas.
Verification: `.venv-local/bin/python -m pytest -q tests/test_trading.py tests/test_database.py tests/test_simulations.py`
passed 84 tests on 2026-11-14. Portfolio/performance arrive in Phase 7.

## Phases 7–10 — portfolio, learning, hardening and acceptance

Portfolio/performance and actual Kiran lesson/quiz/progress APIs are implemented.
Migration head is now **0005_learning**; all earlier head references above are
historical records. Use the existing hashed lock; no dependencies were added.
`ALLOWED_ORIGINS` is a comma-separated list of explicit frontend origins, empty
by default; no automatic .env loading. Example: `http://localhost:5173`.

The authoritative current setup, contract details, merge dependencies and exact
verification commands are in `../docs/BACKEND_MERGE_HANDOFF.md`. Response examples
are in `../docs/fixtures`. Private curriculum scoring keys in `data/curriculum`
must be packaged with the server and excluded from browser/static assets.

```sh
.venv-local/bin/python -m pytest -q
.venv-local/bin/python scripts/verify_backend.py
# Restricted-session fallback, explicitly not real-socket HTTP acceptance:
.venv-local/bin/python scripts/verify_backend.py --transport asgi
```

The smoke script uses fresh temporary storage and generated users; it migrates,
imports opt-in data, checks actual curriculum/progress, buys/sells/P&L, two-user
ownership, no-future-data, replay and persistence across server/app restarts.
Pass `--csv PATH --manifest PATH` for a sourced historical window of at least
three sessions. `--write-fixtures DIR` exports synthetic response examples only.

Current acceptance limitations: localhost bind is denied in this coding session;
the full in-process API/database acceptance passes. Existing local IBM input is
personal research only, so shared-app historical rights remain a release gate.
See the checkpoint for exact per-phase commands/results and current status.

### Phase 10 acceptance update — 2026-11-14

The user ran `.venv-local/bin/python scripts/verify_backend.py` from their
terminal and reported PASS for real Uvicorn HTTP, fresh migrations/import, actual
curriculum/scoring/progress, buy/sell/P&L, ownership/no-future data, receipts and
restart persistence on the synthetic accounting reference. This clears the
synthetic socket-acceptance blocker above. Shared-app historical data rights and
the corresponding real historical HTTP run remain pending.

## User-selected yfinance dataset — AAPL, MSFT, NVDA, TSLA, AMZN

`download_yfinance.py` explicitly downloads these five symbols, sorted only for
canonical storage (not ranked by market cap). Initial window: January 13–16,
2025; the yfinance end argument is January 17, exclusive. It requires the complete
common exchange calendar, USD/New York metadata, all OHLCV bars, zero reported
dividends/splits and no reported capital gains. Missing data/actions fail rather
than silently shrinking the symbol universe or dates.

Use a separate optional data environment to preserve the locked server environment.
From `repo/backend`:

```sh
python3.12 -m venv .venv-data
.venv-data/bin/python -m pip install --require-hashes -r requirements.lock
.venv-data/bin/python -m pip install -r requirements-data.in
.venv-data/bin/python scripts/download_yfinance.py
.venv-local/bin/python scripts/verify_backend.py --all-symbols \
  --csv data/local/yfinance-five-20250113-v1/prices.csv \
  --manifest data/local/yfinance-five-20250113-v1/manifest.json
```

The last command repeats the full real HTTP/database/restart acceptance flow for
**each** selected symbol. Generated data, manifest, provider values, request flags
and dependency versions are under ignored `data/local/yfinance-five-20250113-v1/`.
The downloader validates against the existing backend importer and publishes the
snapshot only after complete validation; existing snapshots are never overwritten.
It does not modify any application database. After acceptance, explicitly import
into your chosen migrated local database to make the dataset visible to the app:

```sh
.venv-local/bin/python -m alembic upgrade head
.venv-local/bin/python -m app.datasets \
  --csv data/local/yfinance-five-20250113-v1/prices.csv \
  --manifest data/local/yfinance-five-20250113-v1/manifest.json
```

The optional downloader requests `auto_adjust=False`, `back_adjust=False`,
`repair=False`, `rounding=False`, `actions=True`. Yahoo float32 representation
noise is converted to an exact cent only within half a float32 ULP; genuine
fractional cents and precision too coarse to distinguish cents are rejected.
Original values and conversion policy are preserved. The server CSV validator
still requires exact whole cents without rounding. Yahoo historical OHLC can
already incorporate split adjustments; no stronger exchange-original-price claim
is made by setting auto_adjust=False.

Source references: [yfinance history options](https://ranaroussi.github.io/yfinance/reference/yfinance.price_history.html),
[yfinance usage notice](https://github.com/ranaroussi/yfinance),
[Yahoo terms](https://legal.yahoo.com/us/en/yahoo/terms/otos/index.html).
The manifest records that downloading via yfinance does not establish shared-app
redistribution rights. This local educational research integration does not by
itself close that separate release dependency.

Latest verification after adding the adapter: **290 tests passed** (47.83s),
one existing TestClient deprecation warning; compilation passed. The actual
yfinance download is pending execution in the user terminal.

### Historical acceptance update — all five symbols

The user reported PASS for real Uvicorn HTTP acceptance (`--all-symbols`) on
AAPL, AMZN, MSFT, NVDA and TSLA. The agent validated the generated local snapshot:
20 bars across Jan 13–16 2025, checksum matches, provider evidence present.
This supersedes earlier pending-download/historical-HTTP notes. Manifest retrieval
date is 2026-11-15 UTC. Source-use limitations remain unchanged. Acceptance used
fresh temporary databases; explicitly migrate/import into the intended persistent
app database to make this dataset available to the frontend. See the current
checkpoint and merge handoff for evidence and remaining integration work.
