# Rutgers AI4Good 2026 — Siddh Jain: Backend
Guide version 2 · Audited 2026-10-21

## Start here

Paste/upload this whole file into an AI coding chat with access to the team's repository, then type **proceed**. One command implements one phase, explains it, checks it, and stops. No completed application or test result is implied by this guide.

You own Python/FastAPI setup, database/migrations, auth APIs, historical data ingestion, no-look-ahead simulation, virtual orders, cash/positions, P&L/analytics, quiz/progress APIs, and backend tests/debugging. Kiran owns his interfaces/content and the tutor router. All remaining project work stays shared/unassigned.

Your checkpoint is `docs/checkpoints/siddh.md`. Create it during Phase 1. You can start in an empty repository without waiting for the frontend. Use deterministic fixture content if Kiran's lesson definitions have not arrived; keep that handoff visible.

## AI working rules

- Read repository instructions, relevant code/docs, current changes, and tests before editing. Preserve other contributors' work. If repository access or execution tools are unavailable, say so and provide the smallest action needed; never invent files, results, or completed phases.
- **proceed** authorizes one phase only. Resume the earliest unfinished phase from repository evidence; a new chat does not restart Phase 1. Existing work may satisfy a phase only after inspection/verification. If adopting an already implemented phase, report its evidence and stop at that phase.
- An answer to the learning question, **explain**, **status**, **review**, or **verify** does not start a phase. After the final phase, report completion and wait; do not invent more work.
- Make ordinary reversible implementation decisions independently. Ask only for a missing choice that prevents safe, compatible work. Do not buy services, publish, message teammates, or change account settings without applicable user authorization.
- Work directly in the repository, follow its tools, and add targeted tests proportional to the change. Run them when possible. Diagnose failures; use a few reasonable remedies, then record an external blocker instead of looping indefinitely. Never suppress failing checks or reset user work.
- Maintain this role's checkpoint with phase, state, changed files, commands/results, pending integration, dependencies/owners, and next action. States: not_started, in_progress, blocked, implemented_unverified, complete_local, complete.
- Missing tools or failing local acceptance means blocked/implemented_unverified: the next **proceed** resumes that phase. Where a phase explicitly permits fixtures, passing local checks may yield complete_local and the next **proceed** advances; record real-integration acceptance separately. Only evidence from the real system yields complete. Final core integration cannot pass on fixtures.
- Use feature-specific checkpoint files; avoid both chats rewriting the same status file. Update shared contracts/handoffs only as needed. Never claim a teammate was notified merely because a note was written.
- Before adding dependencies, reuse working conventions; keep secrets in ignored local configuration and placeholders in examples. Do not expose tokens or private data in checkpoints, logs, screenshots, or demos.

### Stop-and-teach response after every phase

Keep the handoff to roughly 250 words, plus necessary commands:
1. What works, current phase/state, and any remaining acceptance.
2. Changed files and one plain-English explanation of a new idea.
3. Checks actually run, their results, and exact local run/verify commands with expected visible output.
4. One short understanding question about the change. Briefly correct misunderstandings when answered; answering is optional.
5. The next phase/dependency and: **Type proceed when you are ready.**

Useful commands: **status** (read-only progress), **explain <topic>** (teach from this code), **review** (find issues without edits), **verify** (run checks, no next-phase implementation), **help** (show commands).

<!-- BEGIN SHARED CONTRACT v2 -->
## Shared contract — v2

This fallback is identical in all three guides. Use an existing documented, team-approved repository contract if present; record differences rather than replacing working code. Otherwise the first implementation chat creates `docs/API_CONTRACT.md` from this block. That repository file then controls implementation. A breaking change requires a documented decision and updates to schemas, affected clients, fixtures, tests, and handoff notes.

### Stack and ownership

- Default frontend: React + TypeScript + Vite + Tailwind; default backend: Python 3.11+, FastAPI/Pydantic, SQLAlchemy/Alembic, pytest. Reuse the established dependency manager and lockfiles.
- Local database: SQLite. Store cash/cost totals as integer USD cents and price values as scaled integers with six decimal places; use Decimal for arithmetic and round monetary totals half-up to cents. SQLite NUMERIC alone is not the fixed-precision guarantee.
- Siddh owns backend foundations, auth, market data, simulation, trading, analytics, and learning APIs. Kiran owns calculator/learning/trading interfaces, original lesson/quiz definitions, notifications, and the tutor's narrow backend router/provider adapter plus UI. Kiran reuses Siddh's auth/configuration and does not rewrite those foundations.
- Shared/unassigned: frontend bootstrap, global dashboard/navigation, authentication UI/session experience, mascot, general settings, root documentation, and CI. Feature-specific docs/tests remain with each feature owner.
- MVP trading is USD cash, whole-share long-only stocks/ETFs, no borrowing, shorts, options execution, deposits/withdrawals, dividends, fees, or news. Options are lesson content only. Include a small sourced historical OHLCV dataset over a documented window without corporate actions; preserve source, license/usage terms, retrieval date, symbol universe, and raw/unadjusted price policy. Use synthetic fixtures for deterministic tests and label any synthetic demo as synthetic. Corporate-action processing requires a separate extension; real historical ingestion is a required deliverable.

### Transport and authentication

All paths below include the prefix once. JSON uses snake_case, opaque string IDs, YYYY-MM-DD session dates, and ISO-8601 UTC timestamps ending in Z. All money and percent results are decimal strings with two places; prices have six places. Counts, quantities, and versions are integers. Reject NaN, infinity, invalid enums, unknown fields, and values outside documented bounds.

- Errors use `{"error":{"code":"insufficient_cash","message":"Not enough virtual cash.","field":"quantity"}}`; field is optional. Normalize validation errors to the same envelope. Use 401 unauthenticated, 404 absent/not-owned resource, 409 conflict/stale state, 422 validation/domain rejection, 503 unavailable dependency. Do not include stack traces or secrets.
- `POST /api/v1/auth/register` takes `{email,password}` and returns `{user:{id,email}}` (201). `POST /api/v1/auth/login` takes the same fields and returns `{access_token,token_type:"bearer",expires_at}`. `GET /api/v1/auth/me` returns `{id,email}`. `POST /api/v1/auth/logout` revokes the current token (204).
- Baseline auth is an expiring random opaque bearer token: persist only its cryptographic hash, validate expiry/revocation server-side, hash passwords with a maintained password-hashing library, and use generic login failures. Never return a password hash.
- Protected requests send `Authorization: Bearer <token>` over HTTPS outside localhost. Frontend default token storage is memory; reload may require login again. Shared S4 owns login/logout UI. Never add a demo auth bypass.
- Every user-owned simulation, order, transaction, portfolio, progress, and tutor request enforces ownership on the server. Tests use two users as each resource is introduced.

### Minimum API shapes

First implementation publishes exact Pydantic/OpenAPI schemas and matching frontend fixtures. Fields below are required unless marked optional. Lists return `{items:[...]}`; dataset fixtures remain small and bounded for MVP. Use the same field names everywhere.

| Method and path | Request → response |
|---|---|
| GET /api/v1/health | → {status:"ok"} |
| GET /api/v1/datasets | → {items:[{id,label,source,synthetic,session_dates,symbols}]} (metadata only; no prices) |
| GET /api/v1/instruments?dataset_id=... | → {items:[{symbol,name}]} |
| POST /api/v1/simulations | {dataset_id,start_session,end_session,initial_cash} → Simulation (201) |
| GET /api/v1/simulations | → {items:[Simulation]} (current user's simulations) |
| GET /api/v1/simulations/{id} | → Simulation |
| GET /api/v1/simulations/{id}/market-data/{symbol} | optional from/to session filters → {items:[{session_date,available_at,open,high,low,close,volume}]} |
| POST /api/v1/simulations/{id}/advance | {expected_version} → {simulation:Simulation,order_results:[Order]} |
| POST /api/v1/simulations/{id}/orders | {symbol,side:"buy" or "sell",quantity,expected_version} → {order:Order,simulation:Simulation} (201) |
| GET /api/v1/simulations/{id}/orders | → {items:[Order]} |
| GET /api/v1/simulations/{id}/transactions | → {items:[{id,order_id,symbol,side,quantity,price,gross_amount,session_date,executed_at}]} |
| GET /api/v1/simulations/{id}/portfolio | → {as_of_session,cash,positions:[{symbol,quantity,cost_basis,market_price,market_value,unrealized_pnl}],realized_pnl,unrealized_pnl,total_equity} |
| GET /api/v1/simulations/{id}/performance | → {initial_cash,total_return_pct,equity_curve:[{session_date,total_equity}]} |
| GET /api/v1/lessons | → {items:[{id,version,title,topic}]} |
| GET /api/v1/lessons/{id} | → {id,version,title,topic,body,source_links,review_status,quiz_id} |
| GET /api/v1/quizzes/{id} | → {id,version,lesson_id,questions:[{id,prompt,options:[{id,text}]}]} (no answer key) |
| POST /api/v1/quizzes/{id}/attempts | {quiz_version,answers:[{question_id,option_id}]} → {attempt_id,correct,total,score_pct,passed,feedback:[{question_id,correct,explanation}]} |
| GET /api/v1/progress | → {items:[{lesson_id,quiz_version,attempt_count,best_score_pct,latest_score_pct,completed}]} |
| POST /api/v1/tutor/messages | {message,simulation_id?} → {reply,mode:"ai" or "curriculum",source_links} |

`Simulation` = {id,dataset_id,symbols,start_session,end_session,current_session,current_time,initial_cash,status:"active" or "completed",version}. `Order` = {id,symbol,side,quantity,status:"pending" or "filled" or "rejected",submitted_at,executed_at:null or timestamp,execution_price:null or price,rejection_code:null or string}. Order submitted_at is the simulated current_time at submission; executed_at is the simulated next-session open, never wall-clock processing time. If real processing timestamps are stored, name them created_at/processed_at and label them separately. Document all bounds in OpenAPI before clients rely on them. For this MVP, starting cash is > 0 and ≤ 1000000000.00 USD, each order quantity is 1–1000000 whole shares, and imported prices are 0.010000–1000000.000000 USD and exact multiples of 0.010000 (whole cents for MVP; reject fractional-cent data rather than silently rounding it); reject out-of-range values so scaled integers cannot overflow.

Simulation creation, advance, orders, and quiz submission require a client-generated `Idempotency-Key`. Scope keys by user + route + resource; atomically save a request fingerprint and response. Same key/payload replays the original response; reused key/different payload returns 409. Check receipts before stale-version checks. Never auto-retry with a new key after a timeout. Sensitive auth responses are never idempotency receipts.

### Historical simulation and accounting

- Pin each simulation to an immutable, versioned dataset, fixed symbol universe, and complete common session calendar. MVP real-data windows must have verified no corporate actions, and synthetic fixtures must declare that assumption. Reject incomplete symbol/session grids and unsupported ranges; never silently mix raw and adjusted prices.
- A cursor is after the selected session's close. `current_time` is that close expressed in UTC. Every OHLC bar has `available_at` at its close; data/chart/portfolio APIs expose only values available by the owned cursor. Reject future range bounds with 422. No unscoped full-history price endpoint or frontend-bundled future-price fixture exists in real mode.
- Submission validates symbol/quantity, current holdings for sells, and cash using the latest visible close; this is only an early check. An order submitted after session T closes is pending with null execution fields. Allow only one pending order per simulation for MVP. A successful advance moves to the next common session, fills at that session's open, then exposes its close/current portfolio. No future price/result is returned before this advance completes.
- Serialize order/advance writes with an atomic transaction and compare `expected_version`. Increment version on each accepted simulation mutation; stale concurrent writes return 409. Recheck cash/holdings at the fill price; a gap beyond available cash rejects the order without changing cash/positions. No partial fills or cancellation in MVP.
- Reject unknown symbols, non-integer/non-positive quantities, oversells, and orders at the final session. No pending order may remain when status becomes completed. Missing data or unexpected processing failure rolls back the entire advance. Repeated end-of-range advances return a documented 409.
- Choose weighted-average cost. Allocate proportional remaining cost basis to a partial sale, round half-up to cents, and allocate the entire remainder on the final sale. Realized P&L = sale proceeds minus allocated cost; unrealized P&L = current marked value minus remaining cost. Total equity = cash + sum(position market values). Return percent = 100 × (equity − initial cash) / initial cash. Initial cash must be positive; no extra cash flows. Equity history contains only visited sessions.
- Reference reconciliation (zero fees): initial cash 1000.00; buy 2 at next open 100.00, mark close 110.00 → cash 800.00, equity 1020.00. Sell 1 at next open 120.00, mark close 90.00 → cash 920.00, realized 20.00, unrealized −10.00, equity 1010.00. Sell final share at 95.00 → cash/equity 1015.00, cumulative realized 15.00. Define matching fixture sessions explicitly.
- Never claim this bounded educational model is a realistic or broadly bias-free market backtest; disclose the selected universe/window and omitted corporate actions, fees, and dividends. Test all app-controlled no-look-ahead paths, including direct requests, alternate users, analytics, error bodies, and serialized payloads.

### Lessons, calculators, notifications, tutor

- Kiran supplies short original lessons and immutable quiz definitions for CDs, HYSAs, stocks, ETFs, and options (education only), with stable IDs, source links, review status, and a private server answer key. Siddh loads/serves/scores them; if unavailable he uses clearly marked test fixtures behind the same schema. Never put real answer keys in the production browser bundle.
- A quiz attempt answers every question exactly once; reject missing, duplicate, or unknown questions/options and stale versions. Score on the server. Pass at 80% or above; completed means the best attempt passed the current version. Track latest and best separately. Reading alone does not mark completion.
- Calculator baseline: monthly periods, end-of-month contributions. For effective annual rate r (input percent / 100), monthly i = (1+r)^(1/12) − 1; balance_next = balance × (1+i) + monthly_contribution. Support zero months/rate. Annual input percent is bounded to −99.99% through 100%; savings assumptions must be nonnegative. Starting amount is 0–1000000000 and monthly contributions 0–1000000; reject nonfinite inputs. Bound horizon to 0–600 whole months, use decimal-safe calculations, round output to cents, and disclose that taxes, inflation, fees, and guarantees are excluded.
- Notifications are local in-app feedback for MVP, with accessible announcements and duplicate suppression. No push/email or new notification backend is required.
- Kiran owns `POST /api/v1/tutor/messages` in the existing backend, reusing auth/config. Limit message to 2,000 characters, set provider timeout and per-user request limits, redact logs, and return 503 with `tutor_unavailable` if AI mode lacks configuration. No browser secret, search, trading tools, or trust in client-supplied portfolio context.
- A language model can know later historical outcomes even with restricted inputs. When a simulation_id is supplied, enforce owned access and use approved deterministic concept explanations (`mode:"curriculum"`), without calling a model. In a historical simulation screen always send that ID. General AI mode is outside simulation context, uses approved lesson context, and declines personalized trade instructions and future-outcome requests; it cannot claim strict knowledge isolation.
- Automated tests mock providers. Missing credentials must show an honest disabled state; an explicitly labeled development mock is never evidence of a live AI test.

### Handoff and release

Record handoffs in `docs/HANDOFFS.md` with owner, dependency, schema/version, reproduction steps, checks, and pending acceptance. Prepare a copyable summary; send external messages only if the user authorizes them.

Release requires real core API integration: auth, lesson/quiz persistence, simulation advance, queued buy/sell, reconciled portfolio, ownership checks, and no future data. Keep fixture results separate. Optional AI may remain disabled with a clear limitation. Use a durable volume for SQLite with a single-writer deployment, or a supported hosted database with verified migrations; a DATABASE_URL by itself does not preserve data. Verify save/restart/reload persistence. Demo seeds never reset real user records.
<!-- END SHARED CONTRACT v2 -->

## Your sequential phases

Each **proceed** implements/resumes just the next phase. A phase includes its own tests, concise documentation, and checkpoint. Preserve already working equivalents.

### Phase 1 — Backend foundation and contract

Inspect the repository; create/repair the minimal FastAPI app, configuration, dependency lock, health endpoint, and a health test. Initialize the repository API contract from the shared block if absent; publish schemas incrementally before their consumers need them. Add exact install/start/test commands and safe environment examples. Use `backend/` if no layout exists; do not create a second backend.

**Local gate:** the health test runs and the API/docs can start; record the actual commands and versions. If a runtime is unavailable, remain implemented_unverified. No frontend prerequisite.

### Phase 2 — Database and repeatable migrations

Add database/session handling, initial user/auth models, Alembic migration, constraints, and isolated database tests. Introduce further models through later migrations when their phase arrives. Use integer money storage/scales from the contract. Keep demo seeding opt-in, repeatable, isolated from real users, and free of hardcoded production passwords.

**Local gate:** migration from an empty test database succeeds; schema constraints and persistence pass. Tests never use a developer's personal database.

### Phase 3 — Auth APIs

Implement the contract's register/login/me/logout flow, password hashing, expiring/revocable opaque tokens, and auth dependency. Set explicit password/input bounds, normalize emails consistently, and keep login failures generic. Add configurable login throttling. Document frontend auth transport without building S4's UI.

**Local gate:** registration, duplicate email, invalid login, expired/revoked token, absent token, logout, and current-user tests pass. Test authorization dependencies now; add two-user resource tests as the real resource routes arrive.

### Phase 4 — Versioned historical datasets

Create a validated historical OHLCV CSV import command and immutable manifest with source/usage terms, retrieval date, raw/unadjusted policy, currency, symbols, session dates, UTC open/close times, version/checksum, and limitations. Import at least one small legitimately sourced real historical dataset over a window verified free of corporate actions. Do not fabricate a source or silently substitute adjusted closes for raw OHLC. Also create a separate synthetic fixture for exact accounting tests. Production user routes serve metadata only at this phase; do not expose full price history.

Validate finite positive prices; high ≥ open/close, low ≤ open/close, low ≤ high; nonnegative integer volume; unique dataset/symbol/session; ordered dates; complete symbol/session grid. Reject invalid inputs clearly. Identical reimports are safe; changed data requires a new dataset ID/version, never modification of a running simulation's dataset. Keep live downloads outside automated tests.

**Local gate:** valid import, duplicate/changed import, malformed OHLC, fractional-cent/zero-rounded-price rejection, missing bar, and manifest/provenance tests pass. **Real-data gate:** the sourced historical dataset imports successfully and its manifest can be inspected. If source access/input is unavailable, mark complete_local with that explicit dependency and resolve it before Phase 10; synthetic tests do not satisfy historical ingestion.

### Phase 5 — Cursor and no-look-ahead engine

Implement owned simulation create/list/get/advance, version checks, allowed date bounds, and simulation-scoped market-data routes. Starting session is visible after its close; start=end creates an already completed simulation. Refuse unsupported sessions rather than silently adjusting dates. Add initial portfolio state and one equity snapshot per visited session. Implement advance receipt/atomicity even before orders are added.

**Local gate:** deterministic advancement; future-filter rejection; final-session behavior; immutable dataset pinning; two-user access; concurrent/stale advancement; and every response's time filter pass. Test direct HTTP requests, not only internal helpers.

### Phase 6 — Orders and accounting

Add the contract's one-pending-order lifecycle, idempotency receipts, atomic advance/fill, cash/positions/transactions, and order listing. Submission checks symbol, integer quantity, holdings for sells, and affordability at the latest visible close for early rejection; execution rechecks at the next open. Return pending with no future execution fields. Unexpected errors roll back the entire mutation.

**Local gate:** buy/sell, gap-price cash rejection, oversell, invalid input, duplicate key replay, key/payload conflict, stale/concurrent writes, final-session rejection, and rollback tests pass. A rejected fill leaves cash/holdings unchanged. Two-user tests cover every new route.

### Phase 7 — P&L and performance

Implement weighted-average cost allocation, realized/unrealized P&L, equity, percent return, and visited-session equity history per the contract. Use known independent examples and partial-sale rounding residuals.

Use the reference reconciliation in the shared contract and define fixture sessions with the specified opens/closes.

**Local gate:** these values, no-trade return, total liquidation, rounding/remainder, and no-future-equity tests pass.

### Phase 8 — Lesson, quiz, and progress APIs

Load Kiran's stable versioned definitions or explicitly labeled test fixtures. Implement lesson/quiz retrieval, private server-only answer keys, idempotent attempts, server scoring, current-version best/latest progress, and user separation. Never accept a client-computed score or expose the key before submission. Review-status metadata must survive retrieval.

**Local gate:** correct/incorrect answers, 80% boundary, missing/duplicate/unknown answers, stale versions, retry deduplication, persistence, and two-user tests pass. If production content is pending, mark complete_local with a Kiran content handoff; do not claim reviewed curriculum exists.

### Phase 9 — Hardening and API handoff

Run backend checks, configure explicit allowed frontend origins and safe errors/logging, verify OpenAPI matches fixtures, and exercise the HTTP flow without needing a frontend. Record real-integration issues for Kiran using reproducible requests. Recheck accounting, auth boundaries, time filtering, transactions, and token redaction.

**Local gate:** complete backend suite and documented clean start pass. Frontend absence is a pending integration check, not a reason to invent UI work or claim a browser test.

### Phase 10 — Final backend acceptance

From a fresh isolated database run migrations and opt-in demo seed, then exercise auth → learning attempt/progress → simulation → pending buy → advance/fill → pending sell → advance/fill → P&L. Reopen the database and verify persistence. Check logout, a second user, invalid order, and future-data requests. Replace learning fixtures with Kiran's actual definitions when available, and verify the same core flow also runs on the sourced real historical dataset (prices/results will differ from synthetic reference tests).

**Final gate:** all backend core checks pass against real HTTP/database behavior; record exact environment and limitations. If historical data, content, or a required tool is missing, remain at this phase with a named blocker. Kiran owns deployment and browser integration; provide the backend configuration/migration handoff.

After Phase 10, stop. Future work requires a new explicit request.
