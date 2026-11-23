# Backend merge handoff — 2026-11-14

Backend Phases 6–9 are locally verified. Phase 10 technical acceptance passed:
the user reported real Uvicorn HTTP passes for the synthetic reference and for
**all five historical tickers: AAPL, AMZN, MSFT, NVDA, TSLA**. The agent also
validated the resulting 20-bar CSV/manifest. Shared-app historical source-use
rights remain unresolved as recorded in the manifest. Browser integration and
deployment remain separate gates; neither is claimed complete.

## Authoritative paths and current schema

Work in `AI4Good/repo`, branch `siddh`. The outer `AI4Good/backend` and
`AI4Good/docs` directories are old copies, not the repository.

- Application: `backend/app/main.py`, FastAPI `app.main:app`.
- Exact contract: `docs/API_CONTRACT.md` and generated `/openapi.json`.
- Database head: `0005_learning` (adds `0004_trading`, `0005_learning` after
  `0003_simulations`). Migrations are explicit; startup never migrates/seeds.
- Dependencies: `backend/requirements.in` and hashed `requirements.lock`.
- Actual Kiran content: `backend/data/curriculum/kiran-v1.json`. It contains
  private scoring keys and must stay server-only. Its provenance records Kiran
  revision `9d939127c704b31986d491913179d1ff68737827` and source blob hashes.
- API response examples: `docs/fixtures/{orders,transactions,portfolio,
  performance,lessons,lesson,quiz,quiz-attempt,progress}.json`. All financial
  examples use the explicitly synthetic accounting fixture; IDs are examples.
- Per-phase results/history: `docs/checkpoints/siddh.md`.

## Verified behavior

Latest backend suite: **290 passed** (47.83s), one existing TestClient deprecation
warning. Compilation, dependency consistency, migration repeat/downgrade/schema
checks and response-fixture validation passed.

Authenticated owned order submission/listing, transactions, portfolio and
performance; atomic pending-next-open fills/rejections, current-close preflight,
weighted-average basis with half-up cent allocation, snapshot equity and returns.
Successful order submission increments the simulation version; advance must use
that returned version. One pending order per simulation; no partial fills or
cancellation. All accepted writes atomically persist their idempotency receipt.
Retry the same body/key after an uncertain response, including after completion.

Actual draft lessons/quizzes for CDs, HYSAs, stocks, ETFs and options; server-only
answer keys, server scoring, exact 80% passing threshold, current-version
best/latest progress and persisted deduplicated attempts. Auth is required for
all learning routes. Draft status is preserved; no human-reviewed claim.

GET requests use one real SQLite read snapshot across token/cursor/holdings reads.
CORS is disabled unless explicit ALLOWED_ORIGINS are configured. No wildcard or
cookie credentials; bearer and Idempotency-Key headers are allowed.

## Reproduce locally

From `repo/backend`, use Python 3.12 (verified 3.12.13):

```sh
python3.12 -m venv .venv-local
.venv-local/bin/python -m pip install --require-hashes -r requirements.lock
.venv-local/bin/python -m pip check
.venv-local/bin/python -m pytest -q
.venv-local/bin/python scripts/verify_backend.py
```

The last command defaults to **real Uvicorn HTTP**, creates a fresh temporary
SQLite database, applies/repeats migrations, checks schema drift, explicitly
imports/reimports reference data, creates two isolated users with generated
passwords, exercises learning/buy/sell/P&L, restarts the server and verifies
persistence and logout. No developer database or real user is modified, no
credentials are printed. Requires localhost socket permission. In a restricted
session `--transport asgi` exercises the same API/database flow with fresh app
lifecycles, but is not real-socket HTTP acceptance.

For permitted historical data, run the same script with:

```sh
.venv-local/bin/python scripts/verify_backend.py --csv /path/to/history.csv --manifest /path/to/history.manifest.json
```

The historical window needs at least three common sessions for buy and sell
fills. Its manifest must accurately record raw OHLCV, terms, checksum, session
calendar and no-action evidence. Import validates declarations; it cannot grant
rights or authenticate provenance. Existing ignored IBM data is individual
research only and must not be added to shared artifacts or deployed.

For manual serving, choose a persistent database location and migrate it first:

```sh
export DATABASE_URL=sqlite:///./ai4good.db
export ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
.venv-local/bin/python -m alembic upgrade head
.venv-local/bin/python -m app.datasets --csv data/fixtures/accounting.csv --manifest data/fixtures/accounting.manifest.json
.venv-local/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --no-proxy-headers
```

That opt-in seed imports only clearly synthetic reference data. It is repeatable,
does not seed/reset users, and needs no hardcoded password. For the frontend set
`VITE_USE_FIXTURES=false` and `VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1`.
Use explicit trusted proxy settings for production, HTTPS, durable SQLite storage
and one writer process. Stopping/restarting must preserve the same database file.

## Required merge integration work

These findings come from read-only inspection of Kiran revision
`9d939127c704b31986d491913179d1ff68737827`; his branch was not modified.

1. **Tutor auth/ownership adapter (Kiran integration, Siddh dependency provided).**
   `backend/app/routers/tutor.py` currently returns a mock user without a bearer
   token and checks a hardcoded SIMULATION_OWNERSHIP_STORE. Before mounting the
   router, replace those with `app.auth.get_current_user`, DatabaseSession and
   `app.simulations.owned_simulation`. Then include the router in our existing
   `create_app`, preserve bounded message schemas, and test missing/invalid auth
   (401), another user's simulation (404), own simulation curriculum mode with
   zero provider calls, and honest 503 when general AI is unconfigured. Do not
   mount the current mock-auth router unchanged. Tutor is not mounted here.
2. **Backend Docker packaging (Kiran deployment).** His Dockerfile copies only
   `backend/app` and installs `requirements.txt`. Use the hashed lock and include
   `alembic.ini`, `migrations/` and `data/curriculum/`; the app loads that content
   at startup. Run `alembic upgrade head` as an explicit deployment step, import
   the selected permitted dataset explicitly, retain the durable `/data` volume,
   and verify restart persistence. The backend requires no new dependencies.
3. **Real client integration (Kiran).** His client defaults to fixtures. Switch
   fixtures off, configure base URL/origin, and verify all live v2 flows. Retain
   idempotency keys across uncertain retries: current client methods generate a
   new key each invocation. Resolve any shared-doc merge conflicts by preserving
   this backend's exact contract/checkpoint and his content/integration history.
4. **Release evidence (Siddh + Kiran).** Synthetic socket acceptance passed in
   the user's terminal (user-reported 2026-11-14). Repeat with a
   shared-app-permitted historical dataset. Then run the browser integration gate. Content remains draft until
   explicitly reviewed. No live tutor/provider or deployed URL is claimed.

No merge, push, deployment or external teammate messages were performed here.

## Selected yfinance integration — 2026-11-14

The user selected AAPL, MSFT, NVDA, TSLA and AMZN explicitly. Added
`backend/scripts/download_yfinance.py`, isolated optional `requirements-data.in`,
and `verify_backend.py --all-symbols`. Canonical storage is symbol-sorted; no
market-cap ranking is claimed. Default window is Jan 13–16 2025 (end-exclusive
Jan 17). Full terminal commands are in the backend README and checkpoint.

The downloader validates provider metadata, the common exchange calendar, action
fields, precision and the existing import schema, preserving provider values and
versions in an ignored local snapshot. It never modifies a database or overwrites
an existing snapshot. The runtime dependency lock is unchanged. A separate data
venv installs optional network tooling plus the runtime lock for schema validation.

26 offline boundary/acceptance tests passed, including complete in-process
buy/sell/accounting/restart flows for each of the five symbols using explicitly
synthetic test prices. Real Yahoo download has not run successfully here:
yfinance/calendar packages are absent and pip could not resolve yfinance.
No real five-symbol dataset or acceptance result is claimed. Source usage limits
remain in generated manifests; local download does not establish redistribution
rights. Run the documented download and real HTTP --all-symbols command in the
user terminal, then explicitly import into the chosen local application database.

## Historical acceptance result — supersedes pending-download notes above

The user reported PASS for real Uvicorn HTTP `verify_backend.py --all-symbols`
on AAPL, AMZN, MSFT, NVDA and TSLA, including each full core/restart flow.
The agent validated the existing local CSV/manifest: five symbols, four sessions,
20 bars; checksum a2011cf3fb3e323ee25d9bba51f3e58e418db8031e97e4031027684241cfe1f1.
Manifest retrieval date is 2026-11-15 UTC; provider versions are yfinance 1.8.0,
exchange-calendars 4.13.3 and pandas 3.1.1. Snapshot remains ignored/local.
No developer database was populated by acceptance; explicitly migrate/import
into the intended application database next. Source restrictions remain intact.
