# Backend learning notes

This document explains the backend as it is implemented. Extend it after each
phase with the new code, concepts, checks, and remaining work. The API contract
is in [API_CONTRACT.md](API_CONTRACT.md); implementation status and acceptance
evidence are in [checkpoints/siddh.md](checkpoints/siddh.md).

## Current position

Phase 5 (owned simulation cursor) has passed backend acceptance: 205 tests and
synthetic plus real local-research HTTP flows pass. Phase 4 remains
`complete_local` for shared-app data rights; that dependency must be resolved
before final integration, no later than Phase 10. Phase 6 orders/accounting is
next and has not started.

## File map

| File under `backend/` | Responsibility |
| --- | --- |
| `app/main.py` | Application factory, startup/shutdown, health route |
| `app/config.py` | Settings and environment-variable loading |
| `app/database.py` | Database engine, session factory, request session dependency |
| `app/models.py` | User and token table definitions |
| `migrations/env.py` | Connects Alembic to configuration and model metadata |
| `migrations/versions/0001_auth.py` | Initial user/token schema migration |
| `alembic.ini` | Migration location and import configuration |
| `requirements.in` | Allowed dependency version ranges |
| `requirements.lock` | Exact dependency versions and artifact hashes |
| `tests/test_health.py` | Health, OpenAPI, and docs checks |
| `tests/test_config.py` | Configuration checks |
| `tests/test_database.py` | Migration, constraint, transaction, persistence checks |
| `pytest.ini` | Test discovery and Python import settings |
| `.env.example` | Example environment settings; not automatically loaded |
| `README.md` | Installation, startup, migration, and verification commands |

## Phase 1 — Backend foundation

### Application creation and HTTP requests

`create_app()` in `app/main.py` builds a FastAPI application. Tests can pass
their own settings to create an isolated application. The module-level
`app = create_app()` is the application served by Uvicorn.

In the command `uvicorn app.main:app`, `app.main` identifies the Python module
and `:app` selects its application object. Uvicorn receives HTTP requests;
FastAPI routes them to the corresponding Python function.

The health route returns:

```json
{"status":"ok"}
```

Its Pydantic `HealthResponse` model requires `status` to be exactly `"ok"`
and forbids extra fields. FastAPI uses the response model for validation and
OpenAPI documentation.

- `/api/v1/health` checks that the process can respond.
- `/docs` serves interactive API documentation.
- `/openapi.json` publishes the machine-readable API schema.

Health is a liveness check: it does not query the database or confirm tables
exist. Successful startup alone does not prove database readiness.

### Configuration

`Settings` is a frozen dataclass: ordinary reassignment of its fields is
disabled after construction. `load_settings()` reads environment variables.

| Variable | Default | Meaning |
| --- | --- | --- |
| `AI4GOOD_APP_NAME` | `AI4Good API` | API title |
| `DATABASE_URL` | `sqlite:///./ai4good.db` | SQLite database location |

The application name is trimmed and must contain 1–100 characters. The relative
database path depends on the working directory, so run commands from `backend/`
or use an absolute SQLite URL. `.env.example` documents settings; automatic
`.env` loading is not enabled.

Tests can directly pass `Settings(database_url="sqlite://")` to use an
in-memory database without using the developer's database file.

### Dependencies

`requirements.in` declares acceptable dependency ranges. The committed
`requirements.lock` records exact versions with hashes for repeatable installs.
Install from the lock; regenerate it when intentionally changing dependencies.
The verified existing environment is `backend/.venv-local`, using Python 3.12.13.
README setup commands create a separate environment named `.venv`.

## Phase 2 — Database and migrations

### Engine, session, and model

| Concept | Meaning |
| --- | --- |
| Engine | Manages database access and connections |
| Session | Tracks reads and changes within a unit of database work |
| Model | Python class describing a database table |
| Migration | Versioned instructions that change the actual database schema |

`Base` in `database.py` is the shared SQLAlchemy declarative base. Models inherit
from it, registering table definitions in its metadata.

`make_engine()` currently supports SQLite only. It configures
`check_same_thread=False` for the application's threading arrangement and a
10-second SQLite lock timeout. In-memory URLs use `StaticPool` so connections
within that engine share the same in-memory database.

Each new connection runs `PRAGMA foreign_keys=ON`. SQLite needs this setting to
enforce relationships such as a token referencing an existing user.

Creating an engine does not create tables and generally does not open a database
connection until needed.

### Startup, shutdown, and transactions

The FastAPI lifespan function performs this sequence:

1. Create an engine using the configured database URL.
2. Store a session factory in `app.state.sessions`.
3. Yield control while the application serves requests.
4. Dispose of the engine's connection pool during shutdown.

The session factory uses `expire_on_commit=False`, keeping loaded attributes
available after commit without automatically expiring them.

`get_session()` is ready for future routes to use as a FastAPI dependency. It
opens a session, yields it to the route, and closes it afterward. Routes must
explicitly commit successful mutations. Closing a session rolls back pending,
uncommitted transaction work.

```python
session.add(user)
session.commit()
```

Adding an object tracks the change; committing makes the transaction durable.
The current health route does not use a database session.

### User storage

`User` maps to the `users` table:

| Column | Meaning |
| --- | --- |
| `id` | UUID string, generated by the ORM when inserting |
| `email` | Unique email address |
| `password_hash` | Stored password hash |

Database constraints require an email length of 3–254 characters, lowercase
email without outer whitespace, and a nonempty password hash. These constraints
reject invalid stored values; they do not normalize inputs or validate a full
email format. Phase 3 adds request validation and normalization.

Password hashing is not implemented yet. A column named `password_hash` only
provides storage; the database's nonempty constraint cannot prove a value is a
secure hash.

### Token storage

`AuthToken` maps to `auth_tokens`:

| Column | Meaning |
| --- | --- |
| `token_hash` | 64-character lowercase hexadecimal SHA-256 digest |
| `user_id` | Owning user |
| `created_at` | Creation time as UTC Unix seconds |
| `expires_at` | Expiration time as UTC Unix seconds |
| `revoked_at` | Revocation time, or null |

The schema requires an existing owner, expiration after creation, nonnegative
creation time, and revocation no earlier than creation. Integer timestamps avoid
SQLite timezone-stripping behavior. Indexes support owner and expiration lookups.

`ondelete="CASCADE"` means deleting a user removes that user's token rows.
Only token hashes will be stored; token generation, hash computation, expiry
checks, and revocation behavior arrive in Phase 3. Storage constraints alone do
not authenticate requests.

### Why migrations are separate from models

Models describe the schema the code expects. Editing a model does not update
an existing database. Alembic applies explicit schema changes and records the
database's migration revision.

`0001_auth` is the first migration (`down_revision = None`). Its `upgrade()`
creates the user/token tables, constraints, and indexes. Its `downgrade()` drops
those tables and their data; use reversal only on disposable development data.

`migrations/env.py` loads the database URL and registers the models. Tests can
override the URL through Alembic configuration to isolate their databases.

| Command | Purpose |
| --- | --- |
| `alembic upgrade head` | Apply missing migrations to the latest revision |
| `alembic current` | Show the database's current revision |
| `alembic check` | Check for model/schema differences requiring a migration |

Repeating `upgrade head` is safe when the database is already current. Future
schema changes should use new migrations. Application startup does not run them.

## Acceptance evidence — 2026-11-07

The following checks were actually run:

- Python 3.12.13; all 26 installed locked package versions matched the lockfile.
- `pip check`: no broken requirements.
- `pytest -q`: **18 passed**, including parameterized invalid-input cases.
- Fresh temporary SQLite database: upgrade and repeated upgrade succeeded.
- `alembic current`: `0001_auth (head)`.
- `alembic check`: `No new upgrade operations detected.`
- Uvicorn started and shut down cleanly. Actual HTTP requests to health, docs,
  and OpenAPI returned 200. Health payload and published health route verified.

Tests cover configuration, response shape, docs, migration reversal/re-upgrade,
model/schema consistency, email/token constraints, foreign keys, duplicate email,
rollback, cascading deletion, and persistence after engine disposal and reopening.
Database tests use isolated temporary files instead of the developer's database.

The localhost HTTP check required sandbox escalation because socket operations
were initially blocked. Non-failing warnings remain for Starlette/httpx TestClient
and Alembic's legacy path separator. A fresh dependency download was not repeated.
No frontend integration acceptance is claimed.

### Reproduce the basic checks

From the repository root, using the existing verified environment:

```sh
cd backend
.venv-local/bin/python -m pip check
.venv-local/bin/python -m pytest -q
.venv-local/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Expected: no broken requirements, 18 passing tests, and a running server.
In another terminal:

```sh
curl http://127.0.0.1:8000/api/v1/health
```

Expected: `{"status":"ok"}`. Open `http://127.0.0.1:8000/docs` for the API UI.
Use README migration commands with an explicitly chosen disposable database for
migration experiments. Do not downgrade a database containing data you need.

## Phase 3 — Authentication APIs (complete)

The authentication implementation has passed its acceptance gate. Password
hashing and email validation use the installed, locked dependencies. The initial
PyPI DNS blocker and its resolution are recorded below; no placeholder password
hasher or auth bypass was introduced.

### New files and connections

| File | Purpose |
| --- | --- |
| `app/auth.py` | Credential models, auth routes, token checks, login limiter |
| `app/errors.py` | Consistent safe error responses |
| `tests/test_auth.py` | HTTP, storage, ownership, expiry, throttle, and fixture acceptance tests |
| `tests/test_errors.py` | Validation and unexpected-error sanitization tests |
| `scripts/verify_auth.py` | Real-server smoke flow using temporary data |
| `docs/fixtures/auth.json` | Synthetic frontend schema examples |

`main.py` now mounts the auth router. Startup also creates a password hasher,
a dummy password hash, and a login limiter. `config.py` supplies bounded settings.
The existing user/token tables support this phase without a new migration.

### Registration: turning a request into a user

`POST /api/v1/auth/register` accepts exactly `email` and `password`.

1. Pydantic rejects missing/unknown fields, non-string values, and invalid bounds.
2. The email is trimmed, lowercased, syntax-checked without DNS, and restricted
   to a plain ASCII address of 3–254 characters.
3. The password must have 12–128 characters and is preserved exactly, including
   whitespace. `SecretStr` masks it in ordinary model representations; it does
   not encrypt data or replace hashing.
4. Argon2id computes a salted password hash.
5. SQLAlchemy inserts and commits the user. The unique email constraint also
   protects against duplicate concurrent registration.
6. The response model returns only `{user:{id,email}}`, never the stored hash.

A normalized duplicate returns 409 `email_registered`; registration does not
log the user in. No claim of email ownership is made: mailbox verification is
not implemented.

### Login: proving knowledge of a password

`POST /api/v1/auth/login` uses the same validation and normalization rules.
Before checking credentials, the process-local limiter counts the attempt for
that server-observed client address.

The route looks up the normalized email and verifies the submitted password
against its stored hash. For an unknown user, it verifies against a dummy hash
so an unknown-account path still performs expensive password work. Both unknown
email and incorrect password return the same generic 401 message. This reduces
one timing difference; it is not a claim of perfect timing indistinguishability.

A successful login can rehash a password whose parameters need upgrading. It
then generates a token using `secrets.token_urlsafe(32)`: 32 random bytes become
43 URL-safe characters. The raw bearer secret is returned once. The database
stores only its SHA-256 digest, owner, creation time, and expiration time.

Password hashes and token hashes have different roles. A password needs a slow,
salted hash because people may choose guessable passwords. A token is generated
with high randomness; a fast cryptographic digest allows indexed lookup without
storing the original secret.

The response is `{access_token,token_type:"bearer",expires_at}`. Expiry is a UTC
timestamp ending in Z; default lifetime is one hour.

### Protected routes: identifying the caller

The client sends `Authorization: Bearer <token>`.

`require_auth()` checks token shape, hashes the presented token, and loads a
matching record only if it has not expired, has not been revoked, and was not
created in the future. It then resolves the owning user. Missing or invalid
tokens receive 401 with `WWW-Authenticate: Bearer`.

`get_current_user()` exposes that user as a reusable FastAPI dependency.
`GET /api/v1/auth/me` uses it to return the caller's own `{id,email}`.
Future resource routes must additionally check that a requested simulation or
other resource belongs to this user; authentication alone does not establish
resource ownership.

### Logout and persistence

`POST /api/v1/auth/logout` marks the current token revoked and commits that
change. It returns an empty 204. Other tokens, including another session for the
same user, remain valid. Reusing a revoked token, including for repeated logout,
returns 401. Conditional updates preserve the first revocation timestamp.

Users, token hashes, expiration, and revocation are persisted in SQLite. The
tests and real HTTP smoke script verified that login state and logout survive
an application restart.

### Throttling, errors, and frontend transport

Defaults are 10 schema-valid login attempts per client address per fixed
60-second window, including successful attempts. A lock serializes limiter
updates between threads. Excess attempts return 429 `login_rate_limited` with
`Retry-After`. Expired peer entries are discarded; storage is capped at 10000
active peers and new peers at capacity receive 503.

The limiter is in memory, per process, and resets on restart. It is not a
shared distributed limit. Direct local serving should disable proxy headers;
deployment needs explicit trusted-proxy configuration. Registration throttling
is not implemented.

`errors.py` converts validation and application errors into
`{"error":{"code":"...","message":"...","field":"..."}}`, with optional
`field`. It avoids returning Pydantic input/context values, raw exception text,
and stack traces. Auth responses and error responses use `Cache-Control:
no-store`. Never log credentials or Authorization headers.

The frontend should keep bearer tokens in memory, send them in the Authorization
header, and use HTTPS outside localhost. Reload may require login again. The
login/logout UI remains shared S4 work. Auth responses are not persisted as
idempotency receipts.

### Checks and remaining acceptance

Initial checks before dependency installation (historical):

- Syntax compilation of application, tests, migrations, and smoke script passed.
- Configuration, database, and safe-error tests: **27 passed**.
- Full suite: collection failed in auth and health tests because Argon2 is absent.
- Dependency resolution failed, including outside the sandbox. PyPI hostname
  resolution failed. Email-validator is also absent.
- The prior lockfile was preserved; it does not yet lock the added dependencies.

Auth tests are written for registration, duplicates, password bounds/hashing,
login failures, expiry boundaries, missing/malformed/revoked tokens, two users,
independent sessions, restart persistence, rehashing, safe errors, throttling,
and OpenAPI/fixture consistency. These tests subsequently passed as part of the
complete 73-test suite.

To reproduce final acceptance, follow the Phase 3 commands in
[backend/README.md](../backend/README.md) to regenerate the hashed lock, install,
run the complete suite, and run `scripts/verify_auth.py`. Expected smoke output:

```text
PASS: auth HTTP flow, two users, restart persistence, and persisted logout.
```

These checks have now passed. The checkpoint can advance to Phase 4, versioned
historical datasets, on the next proceed.

The first retry was still blocked by PyPI DNS. The user then successfully
regenerated the hashed lock and installed dependencies in their terminal.
Final verification on 2026-11-07 established:

- Python 3.12.13; all 32 installed locked package versions match.
- Argon2-cffi 25.1.0 and email-validator 2.3.0 are installed.
- `pip check`: no broken requirements.
- Full suite: **73 passed**, with 61 non-failing deprecation warnings.
- Real HTTP smoke: **PASS** for authentication, two users, restart persistence,
  and persisted logout. Localhost sockets required sandbox escalation.

The smoke script created a temporary migrated database, registered and logged in
two generated test users, restarted the server to check persisted sessions,
logged out one token, then restarted again to check that revocation persisted
while the second user's token remained valid. No developer database was used.
Frontend/browser integration is still a later acceptance step.

References consulted for the implementation:
[Argon2-cffi password hashing](https://argon2-cffi.readthedocs.io/en/stable/howto.html)
and [Pydantic network validation](https://docs.pydantic.dev/latest/api/networks/).

Understanding check: Why does the database store a token's hash instead of the
raw token that the frontend sends?

## Phase 4 — Versioned historical datasets (complete_local)

This phase supplies the data foundation. It does not implement simulations,
order fills, portfolios, or analytics. Prices stay inside the backend until
Phase 5 can enforce an owned simulation's time cursor.

### New files and database objects

| File | Responsibility |
| --- | --- |
| `app/datasets.py` | Manifest validation, CSV import, admin inspection, metadata routes |
| `migrations/versions/0002_datasets.py` | Four new tables and immutability triggers |
| `data/manifest.schema.json` | Exact administrator manifest JSON schema |
| `data/fixtures/accounting.csv` | Four explicitly synthetic reference bars |
| `data/fixtures/accounting.manifest.json` | Fixture provenance, schedule, and checksum |
| `tests/test_datasets.py` | Offline validation, storage, CLI, and HTTP acceptance |
| `scripts/verify_datasets.py` | Real-server acceptance with isolated temporary data |
| `docs/fixtures/datasets.json`, `instruments.json` | Metadata-only frontend response examples |

`models.py` defines the new tables. `main.py` mounts the dataset router. No new
Python dependencies were needed. Phase 4 introduced `0002_datasets`; current
head is now `0003_simulations`.

### What OHLCV means

Each bar describes one symbol over one session:

- Open: the session's opening price.
- High and low: the highest and lowest prices during that session.
- Close: the session's closing price.
- Volume: the number of shares reported traded.

The importer requires high to be at least open and close, low to be at most
open and close, and low not to exceed high. It rejects a malformed bar instead
of repairing it.

The exact CSV header is:

```csv
symbol,session_date,open,high,low,close,volume
```

Rows must be sorted by session date, then symbol. Dates and symbols must be
listed in the manifest, with exactly one row for every pair. If a manifest lists
2 symbols and 4 sessions, it needs 8 bars. A missing bar is an error, not a reason
to silently remove a trading day or change the symbol universe.

### Why prices are integers

CSV prices are read with Decimal, never binary floating point. Only exact whole
cents are supported for this MVP, although storage reserves six decimal places:

```text
100.120000 USD → 100120000 stored units
```

Prices must be between 0.010000 and 1000000.000000 USD. Fractional cents, NaN,
infinity, exponents, overly precise values, and invalid ranges are rejected.
A price such as 0.004 is rejected, not rounded to zero. Database constraints
also require integer storage and valid price steps/OHLC relationships. Volume
must be a nonnegative signed-64-bit integer.

### The manifest is the dataset's identity and provenance

`DatasetManifest` requires an ID/version, label, source, terms, retrieval date,
USD/raw-unadjusted policy, CSV checksum, instruments, exact UTC session schedule,
calendar notes, corporate-action review, and limitations. Real datasets need
source/terms URLs and a `verified_none` action review with evidence URLs.
Synthetic data must declare `assumed_none` instead.

The importer validates the declaration's structure. It cannot prove that a URL
supports a claim or that a license permits a particular use. The importing
operator must review that evidence. Similarly, a complete grid means complete
relative to the declared calendar; the operator must verify that calendar against
the exchange. Session times must be ordered on the stated UTC date.

A SHA-256 checksum binds the manifest to the exact CSV bytes. A second checksum
fingerprints the canonicalized manifest. Canonicalization removes differences
such as JSON indentation; changing actual metadata still changes the fingerprint.
Checksums detect changes, not false claims about source authenticity.

### Atomic import and sealing

The import performs these steps:

1. Bound file sizes and validate manifest/CSV completely before writing.
2. Start a SQLite `BEGIN IMMEDIATE` transaction to serialize import writers.
3. Look up the dataset ID. Identical content returns `unchanged`; different
   content under the same ID is rejected.
4. Insert the dataset, instruments, sessions, and all bars.
5. Seal the dataset and commit the entire transaction.

Unexpected failure rolls everything back, including the parent dataset record.
Two simultaneous identical imports produce one `imported` and one `unchanged`.
Changed data requires a new dataset ID and incremented version.

The tables are:

| Table | Stored information |
| --- | --- |
| `datasets` | Canonical manifest, fingerprint, sealed status |
| `dataset_instruments` | Dataset-specific symbols/names |
| `dataset_sessions` | Dates and UTC open/close timestamps |
| `market_bars` | Dataset/symbol/date keys, scaled prices, volume |

Foreign keys ensure every bar belongs to a declared instrument and session.
SQLite triggers block edits/deletions on sealed datasets, child-row updates,
and additional child rows after sealing. They also prevent replacing a sealed
parent with `INSERT OR REPLACE`. This gives Phase 5 a stable dataset to pin a
simulation to. Database administrators can still change database schema; these
are application integrity protections, not protection against an administrator.

### Public metadata versus private prices

Both new routes require the existing bearer authentication dependency:

- `GET /api/v1/datasets` returns IDs, labels, source names, synthetic flags,
  session dates, and symbols.
- `GET /api/v1/instruments?dataset_id=...` returns symbol/name pairs.

Reference datasets are shared, so two authenticated users see the same catalog.
They are not user-owned simulation resources. No route returns unscoped full
price history. Administrative manifest inspection is an offline CLI operation.

The manifest/CSV limits are 128000/5000000 bytes, with at most 100 datasets,
25 symbols, and 366 sessions per dataset. These bounds keep the MVP catalog small.

### Synthetic reference versus real evidence

The committed `TEST` fixture uses sessions 2026-01-05 through 2026-01-08. Its
opens are 100, 100, 120, 95 and closes are 100, 110, 90, 95. Those values support
the later accounting reference: buy two, sell one, then liquidate. They are
invented test prices, not a real backtest.

Separately, a real IBM extract for 2026-10-14 through 2026-10-16 was obtained by
reading the Alpha Vantage public daily demo on 2026-11-07. Raw OHLCV fields were
copied exactly and only padded with trailing zeroes; adjusted close was not used.
All selected prices were already exact whole cents. The provider's dividend and
split fields were checked for each selected session: 0.0000 and 1.0. NYSE hours
and dates were reviewed, including the New York/UTC offset.

The CSV, manifest, selected source/action evidence, and inspection result live
only under ignored `backend/data/local/`. Alpha Vantage's personal-use grant does
not clear that extract for the shared app. Therefore state is `complete_local`,
not a claim of release-ready historical data. Siddh must obtain raw data with
suitable project rights and no-action evidence before final real-core integration,
no later than Phase 10. No restricted raw-price fixture was added for frontend use.

Source references:
[raw daily data](https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=IBM&apikey=demo),
[action evidence](https://www.alphavantage.co/query?function=TIME_SERIES_DAILY_ADJUSTED&symbol=IBM&apikey=demo),
[provider documentation](https://www.alphavantage.co/documentation/#daily),
[terms](https://www.alphavantage.co/terms_of_service/), and
[NYSE calendar/hours](https://www.nyse.com/trade/hours-calendars).

### What was verified

- Full suite: **149 passed**, with 96 existing non-failing deprecation warnings.
- Fresh/repeated migration to `0002_datasets`; no Alembic schema drift.
- CSV bounds, exact scaling, malformed OHLC, fractional cents, zero-rounded
  prices, invalid volumes, missing/duplicate/out-of-order bars, and provenance.
- Replay/conflict, concurrent import, failure rollback, SQL constraints,
  immutability, and persistence after reopening.
- Authenticated metadata-only HTTP behavior for two users and matching fixtures.
- Real Uvicorn smoke flows for synthetic and real local-research inputs passed
  using fresh temporary migrated databases. Socket access required escalation.

Reproduction commands and expected outputs are in the Phase 4 section of
[backend/README.md](../backend/README.md). Automated tests make no live downloads.
No personal/developer database was used for automated acceptance.

Understanding check: Why should correcting a historical bar create a new dataset
ID/version instead of editing the bar inside an existing dataset?

Next phase: owned simulations, version checks, a time cursor, and simulation-scoped
market data that cannot reveal future bars.

## Phase 5 — Owned simulation cursor (complete)

This phase adds a user's simulated timeline and prevents price reads beyond it.
It does not add trading yet. Cash and equity snapshots provide the starting
state for later accounting and analytics.

### Files and tables

| File | Purpose |
| --- | --- |
| `app/simulations.py` | Request/response schemas, ownership, cursor, replay, and bounded market routes |
| `app/models.py` | Simulation, equity snapshot, and receipt models |
| `migrations/versions/0003_simulations.py` | Three new tables with ownership/FK/cash/version constraints |
| `tests/test_simulations.py` | Direct HTTP, concurrent writes, failure rollback, restart, and no-look-ahead tests |
| `scripts/verify_simulations.py` | Real Uvicorn acceptance against isolated synthetic or real local input |
| `docs/fixtures/simulations.json` | Synthetic response shapes with only an initially visible example bar |

`main.py` mounts the new router and makes the engine available for explicit
write transactions. `verify_datasets.py` now expects the latest migration head.
No dependencies were added and earlier phase work was preserved.

The new tables are:

- `simulations`: owner, dataset ID/fingerprint, selected range, cursor/time,
  integer initial/current cash, status, and version.
- `equity_snapshots`: one unique row per simulation/visited session, with total
  equity in integer cents. These are internal until performance APIs arrive.
- `idempotency_receipts`: owner/route/resource/key, request fingerprint, original
  HTTP status, and original JSON body. Credentials and auth responses are absent.

### What the cursor means

A cursor is a boundary for information the simulation is allowed to reveal.
It is after a session's close. In the synthetic fixture, starting on Jan 5 means
`current_time = 2026-01-05T21:00:00Z`. Jan 5's entire bar is visible, because its
close has occurred. Jan 6's open, high, low, close, and volume remain hidden.

One successful advance moves to the next declared session's close. It does not
use today's real date, skip a missing day, or accept a client-supplied clock.
The last selected session completes the simulation. If start=end, it is already
completed at creation. New end-of-range advances return 409.

The selected end date and dataset calendar are known metadata. Displaying a
future session date is different from displaying that future session's prices.

### Creating and pinning a simulation

Create accepts exactly:

```json
{"dataset_id":"synthetic-accounting-v1","start_session":"2026-01-05","end_session":"2026-01-08","initial_cash":"1000.00"}
```

Both dates must exist in the dataset; weekends/unsupported dates are rejected,
not adjusted. Cash is an exact two-place string, >0 and <=1000000000.00 USD.
Unknown body fields are forbidden, including attempts to choose an owner or
supply a current cursor. The user comes from the bearer authentication dependency.

Inside a locked transaction, the route checks a replay receipt, validates the
sealed dataset and start-session grid, enforces the 100-simulations-per-user
limit, and inserts a simulation at version 1. It also inserts initial cash and
one equity snapshot for that start session. No future snapshots are precomputed.

The simulation stores its immutable dataset ID and manifest fingerprint.
Its fixed universe and schedule come from that pinned manifest. Importing a
new version does not change existing simulations. A fingerprint mismatch fails
safely rather than switching source data underneath the user.

### Ownership is separate from authentication

Authentication identifies the caller. Ownership decides whether that caller can
use a specific simulation. `owned_simulation()` queries by both simulation ID
and authenticated user ID. A foreign ID and an absent ID return the same 404.
List queries are also filtered by user.

These checks apply to get, advance, and market data. Knowing another user's ID,
using their resource path with your own token, or guessing a future range does
not grant access. The date-filter policy is applied after ownership is checked.

### Reading market data without looking ahead

The route is:

```text
GET /api/v1/simulations/{id}/market-data/{symbol}?from=YYYY-MM-DD&to=YYYY-MM-DD
```

Both query parameters are optional; defaults are selected start..current session.
Each explicit bound must be a declared visible session in that selected window.
Future bounds return 422 without any prices. Extra override fields such as
`current_time` or `dataset_id` are rejected.

The SQL query includes the pinned dataset, requested symbol, lower/upper dates,
and `session.close_at <= simulation.current_time`. That close is returned as
`available_at`. Filtering happens before serialization, and completeness and
manifest timing are checked again before returning a response. Required missing
or corrupted data returns 503, not a partial result or a silently skipped day.

Older dataset history outside the selected simulation window is not returned.
There is still no unscoped full-history price endpoint. Portfolio/performance
routes are not present yet, so they cannot provide an alternate future-data path.

### Why version checks and receipts solve different problems

A version protects against two different actions writing from the same stale
state. Advance accepts `{"expected_version":1}`; if another action has already
moved the version to 2, a fresh request with version 1 receives 409.

An idempotency key protects against retrying the same action after an uncertain
network result. The server might have committed an advance while the response
was lost. That retry still contains expected_version 1, even though the server
is now at version 2. Therefore the receipt must be checked BEFORE the stale
version rule. A matching receipt returns the original response exactly.

Keys are scoped by user, route, and resource. A UUID is recommended; bounds are
1–128 letters/digits/underscores/dots/colons/hyphens, beginning with a letter or
digit. The validated JSON body is canonicalized and hashed. Same key/different
valid body is 409; no new mutation occurs. Same key/same body returns the saved
body/status byte for byte, including after later advances or server restart.

A replay can return an older cursor. That is the original action's result, not
a current-state refresh. Use GET to refresh; never generate a new key merely
because a request timed out. Each genuinely new action gets its own new key.

### Atomic advance and failure behavior

Authentication uses its existing read session. `simulation_write()` opens a
separate connection and issues SQLite `BEGIN IMMEDIATE` before reading receipts
and versions. This serializes competing writers at the database level.

An accepted advance:

1. Loads the owned simulation and checks for a matching receipt.
2. Validates the version and active status.
3. Finds the next session from the pinned manifest, then checks its actual grid.
4. Moves the cursor, increments version, and updates completion status.
5. Adds one visited-session equity snapshot and a saved response receipt.
6. Commits all changes together before the response is delivered.

Unexpected failure rolls back cursor, version, snapshot, and receipt. The tests
inject a failure while saving the receipt and prove that retrying afterward
works once. Concurrent requests with different keys/version 1 produce one
success and one stale conflict. With the same key/body, both receive the same
success response and only one advance occurs.

Database operational errors produce a safe 503; unexpected failures use the
generic 500 envelope. Error bodies do not include raw exception text or future
prices. Successful simulation responses also use no-store.

### Cash and equity at this stage

Initial cash and each visited equity snapshot are stored in integer cents.
Without trades, cash and equity remain unchanged; the 1000.00 reference stays
100000 cents on every visited session. No positions, orders, fills, transactions,
P&L calculations, or public portfolio/performance routes are implemented yet.

Advance returns the contract shape `{simulation,order_results:[]}`. The Order
response schema is declared for compatibility, but no orders are processed.
Phase 6 will extend this same atomic advancement path with next-session fills.

### Acceptance and pending integration

Verified on Python 3.12.13:

- Full suite: **205 passed**, 152 non-failing existing deprecation warnings.
- Fresh/repeated migration to `0003_simulations`, with no Alembic schema drift.
- Deterministic advancement; start=end and final-session behavior; selected
  windows; strict cash/date/version/key bounds; fixed dataset pinning.
- Direct HTTP ownership/no-future tests, malformed override attempts, safe errors,
  current-time availability checks, and matching OpenAPI/fixtures.
- Concurrent create/advance, same-key replay, cross-user/route/resource key scopes,
  receipt-first stale handling, and injected create/advance rollback.
- Restart persistence of cursor, cash, snapshots, and exact saved responses.
- Real HTTP smoke scripts passed for both synthetic and existing IBM local-research
  inputs, using fresh temporary databases and generated users. Socket access
  required sandbox escalation. Automated tests make no live downloads.

Run the Phase 5 commands in [backend/README.md](../backend/README.md) to reproduce.
The synthetic demo should be labeled using the dataset's metadata. The existing
IBM sample remains local personal research; Phase 4's suitable shared-app data
rights dependency must be resolved before final real-core integration, no later
than Phase 10. No browser integration or shared-app data approval is claimed.

Understanding check: Why should an advance retry check its idempotency receipt
before checking whether expected_version is stale?

Next: Phase 6 — one pending order, next-session execution, cash, positions,
transactions, and atomic accounting.
