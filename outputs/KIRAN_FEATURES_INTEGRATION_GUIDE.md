# Rutgers AI4Good 2026 — Kiran: Features & Integration
Guide version 2 · Audited 2026-10-21

## Start here

Paste/upload this whole file into an AI coding chat with access to the team's repository, then type **proceed**. One command implements one phase, explains it, checks it, and stops. No completed application or test result is implied by this guide.

You own savings/investment calculators, original lesson/quiz content and experience, simulation/trading/portfolio interfaces, notifications, the AI tutor including its narrow server router, reviews/guidance, integration, deployment/final testing, and demo/presentation. Siddh owns the backend foundations and financial engine. All remaining work stays shared/unassigned.

Your checkpoint is `docs/checkpoints/kiran.md`. Create it during Phase 1. **If no frontend exists, Shared S2 must be selected and completed by the mentor/user first.** Do not quietly absorb frontend foundations. Shared S4 provides authentication UI for final private user flows; it is not needed for fixture-based component tests. These prerequisites are actionable handoffs, not permission to invent completed work.

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

Each **proceed** implements/resumes just the next phase. Phases 3–8 may be complete_local with passing contract fixtures and a named integration handoff. They must be revisited in Phase 9 using the real core backend. Real-user persistence or live AI is never verified by a fixture.

### Phase 1 — Run the frontend and establish its API boundary

Inspect the repository and frontend scripts/design conventions. If Shared S2 is absent, record blocked with the exact S2 requirement and stop here. Otherwise run the app, add/reuse a typed API client and test setup, and implement one small request/error test. Read or initialize the shared contract; do not invent incompatible field names.

Use one configurable base URL. Fixture mode must be explicitly selected for development/tests, visibly labeled, excluded from production, and incapable of bypassing server auth. Future historical price fixtures must not ship to the real simulation browser bundle. Do not create login or global navigation here.

**Local gate:** app starts, focused test and production build pass, exact commands are documented.

### Phase 2 — Savings and investment calculators

Implement tested pure calculation functions and accessible responsive inputs/results with the contract's effective-annual-rate convention, monthly periods, and end-of-month contributions. Show starting amount, monthly contributions, horizon, annual rate, final balance, contributions, and growth. Explain all assumptions, including that a projected annual return is not promised.

Use stable decimal calculations and documented input bounds. Reference checks: 1000 starting, 100/month, zero rate, 12 months → 2200.00 final, 1200.00 new contributions, 0.00 growth; 1000 starting, no contributions, 12% effective annual, 12 months → 1120.00 final. Test zero months/rate, negative allowed investment rate, invalid input, and maximum horizon. Reject negative savings-rate assumptions; investment rates must exceed −100%.

**Local gate:** reference/edge tests pass and keyboard/phone/desktop checks are recorded.

### Phase 3 — Lesson content and quiz experience

Write small original starter lessons on CDs, HYSAs, stocks, ETFs, and options (education only), with at least one quiz per topic. Use consistent content/quiz IDs and immutable versions. Record primary-source links and review status; consult current authoritative educational sources when drafting claims. Draft content may run with a visible review label; mentor fact review is Shared S9 before it is represented as reviewed.

Keep answer keys/explanations in server-only content modules; public question data excludes the key. Agree a loader/schema with Siddh. Connect lesson reading, answer submission, score feedback, retries, and progress. Fixtures may emulate server scoring in tests/dev, but the production browser never decides the trusted score.

**Local gate:** all five topics render, scoring interaction/validation/error tests pass, and the content handoff exists. **Real gate:** Siddh Phase 8 persists attempts and returns matching current-version progress.

### Phase 4 — Historical simulation interface

Integrate dataset metadata, simulation create/list/resume, current simulated date/time, and advance. Show dataset source, real-versus-synthetic status, price-only limitations, and the cursor prominently. Every price/chart request uses the owned simulation endpoint; reject future information rather than fetching it directly.

Handle stale versions, missing/ended datasets, loading/errors, completed simulations, and retry receipts. Never advance time automatically during page load. Reloading an existing simulation retrieves its server state.

**Local gate:** contract fixtures cover these states. **Real gate:** Siddh Phase 5 APIs pass the same flow and the browser's responses contain no future prices.

### Phase 5 — Paper trading interface

Build order entry/review, one-pending-order state, filled/rejected results, orders/transactions, cash, and positions. Explain that a submitted order fills at the next session's open after advance and that a price gap may cause rejection. The UI shows no future execution price.

Generate one idempotency key per deliberate action and retain it across retries; refetch state after stale/conflicting responses. Disable duplicate submissions while pending, but rely on the server for actual guarantees. Display server validation/rejection details and refresh portfolio after advance.

**Local gate:** pending, filled, gap rejection, oversell, duplicate retry, stale state, and server-error tests pass. **Real gate:** Siddh Phase 6 transactions/cash/holdings reconcile through a buy and a sell.

### Phase 6 — Portfolio and performance

Display the backend's cash, positions, realized/unrealized P&L, total equity/return, and visited-session equity curve. Keep chart arithmetic out of trusted accounting. Reuse existing chart tools and include text summaries; losses must not rely on color alone.

**Local gate:** fixtures match the shared contract's reference reconciliation, including empty positions, losses, and unavailable data. **Real gate:** values match the live analytics response and no future equity points appear.

### Phase 7 — In-app notifications

Provide accessible, unobtrusive feedback for order pending/fill/rejection, simulation advancement, quiz completion, and recoverable failures. Important failures remain visible in the affected view. Avoid duplicate announcements on rerender/retry and avoid exposing private content.

**Local gate:** notification triggers, deduplication, dismissal, and keyboard/announcement behavior pass. No push/email service is needed.

### Phase 8 — Tutor server route and interface

Add the narrowly scoped tutor router/provider adapter to the existing FastAPI backend using Siddh's auth/config/test patterns; do not create another server or rewrite his models. If foundations are absent, build/test the adapter independently, mark complete_local, and retain a real auth/router integration blocker for Phase 9.

Implement the contract's educational AI mode, deterministic curriculum mode for active historical simulations, auth/ownership, input bounds, per-user rate limit, provider timeout, redacted failures, source links, and disabled UI when credentials are unavailable. Never expose keys to the browser. Use server-fetched authorized context; ignore forged client context and treat retrieved/user text as data. Test malicious prompts and unsafe trade requests as well as normal requests. No search or trading tool is attached.

**Local gate:** mocked requests plus no-key/timeout/rate-limit/other-user/malicious-input tests pass; curriculum mode is verified to make zero model calls. **Real gate:** protected router works with actual auth. Live AI is a separate optional check requiring configured credentials; record unavailable honestly.

### Phase 9 — Real integration, reviews, and bug fixes

First replace fixture mode for all core paths with Siddh's real APIs and Shared S4 auth UI. Verify lesson/progress persistence, create/resume simulation, pending order/advance/fill, transaction history, P&L, and notifications. Revisit every complete_local item; no pending core integration can be hidden by a green component suite.

Run the available tests, type check, lint, and production build. Review correctness, accessibility, secret exposure, client/server contract drift, and responsive states. Add regressions for actual bugs. Fix Kiran-owned defects; record Siddh/shared defects with reproduction and owner rather than quietly changing their implementations.

**Gate:** core flows pass with the real API and database. Missing S4, backend endpoints, or required content keeps this phase blocked. AI may remain visibly disabled; do not claim its live response was tested.

### Phase 10 — Deployment and persistence

Prepare concrete deployment configuration, migration/start commands, environment examples, explicit CORS origins, production settings, durable database/storage, and rollback notes. Verify the build/config locally first. Use already authorized targets when available; otherwise stop with deployment-ready artifacts and the smallest missing host/credential/authorization action.

Deploy when authorized, then test the core flow on the real URL, one error path, two-user separation, and save/restart/reload persistence. Never seed over real users or store SQLite on disposable server storage. Record URL, environment/commit when available, commands/results, and honest limitations.

**Gate:** actual deployed verification passes. Without a real deployment, record implemented_unverified/blocked and resume here on proceed; do not invent a reachable URL or silently skip to Phase 11.

### Phase 11 — Five-minute demo and presentation

Create a concise five-minute demo script and speaking notes: problem, lesson/quiz, calculator, historical simulation, queued trade/advance, portfolio result, notifications, and tutor only if enabled. Credit contributors and state the data source and model limitations, clearly identifying any synthetic test/demo data. Capture screenshots or a recording of the actual build as a backup; label any development mock.

Rehearse with deterministic isolated demo data, include an error/rejection example, and record observed results. Fix high-impact in-scope final bugs and list other limitations.

**Gate:** a teammate can follow the documented steps against the actual release within roughly five minutes; note any rehearsal that could not be performed.

After Phase 11, stop. Future work requires a new explicit request.
