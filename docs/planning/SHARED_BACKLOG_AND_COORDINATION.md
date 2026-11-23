# Rutgers AI4Good 2026 — Shared Backlog & Coordination
Guide version 2 · Audited 2026-10-21

## Start here

This file is the mentor/user's menu of unassigned work. Paste/upload it into an AI coding chat with repository access. Type **status** for a read-only assessment, **select S2** to choose an item, then **proceed** to implement that item only. Selection records a choice; it does not begin coding.

Siddh and Kiran each use their own standalone guide. All three carry the same fallback contract. These files are instructions, not evidence that any application work is complete.

## Launch order and ownership

1. Siddh can start backend Phase 1 immediately, including in an empty repository.
2. If no frontend exists, the mentor/user selects Shared S2 and completes its minimal React/TypeScript app. This has no backend dependency.
3. Kiran then starts his Phase 1. His components may use explicit development fixtures until Siddh's endpoints arrive.
4. After Siddh Phase 3, select Shared S4 to provide real authentication UI. Before Kiran Phase 9, S4 and the real core backend must work.
5. Kiran writes the starter lesson/quiz definitions; Siddh serves/scores them in Phase 8. Each can test against agreed fixtures without waiting for the other. Shared S9 reviews factual content before it is called reviewed.
6. Kiran owns the tutor UI and the small protected server router/provider adapter, using Siddh's existing auth/configuration. It has an honest disabled mode without AI credentials.
7. Kiran integrates/verifies/deploys and prepares the final demo. Mascot, broad settings, and polish are optional shared work.

Siddh owns backend foundations, database/migrations/auth, historical ingestion, simulation engine, orders/accounting/P&L/analytics, quiz/progress APIs, and backend testing/debugging.

Kiran owns calculators, original lessons/quizzes and their interface, simulation/trading/portfolio interface and integration, local notifications, tutor/assistant, reviews/guidance, testing/fixes, deployment, and demo/presentation.

Everything else remains shared/unassigned until selected: frontend foundations, dashboard/navigation, authentication UI/session experience, mascot, general settings, root documentation/architecture, CI, and cross-project review. Feature-specific setup, tests, content handoffs, and docs remain the feature owner's responsibility.

## AI coordination rules

- Read repository instructions, relevant code/docs, current changes, and tests. Preserve existing contributor work; do not infer that an unassessed item is not started.
- Track shared selection/owner/date/acceptance in `docs/checkpoints/shared.md`. **select S#** is allowed to update that metadata only; clearly use a proposed owner if none was named. Never assign a teammate or mark their work complete without evidence.
- **proceed** implements/resumes only the selected item. If none is selected, recommend the smallest ready item and wait for selection. Completing one item does not select the next. If the selected item is already complete, another proceed reports that fact and asks for a new selection; do not reimplement it.
- Before implementation, write one observable acceptance target for the selected item and check dependencies. A missing dependency becomes a named handoff, not permission to take over Siddh's/Kiran's scope.
- States: not_started, in_progress, blocked, implemented_unverified, complete_local, complete. Record evidence, commands/results, pending integration, owners, and next action. Resume from actual repository evidence in a new chat.
- Run proportionate checks when tools allow; never invent successful tests/builds/deployments. After reasonable in-scope remedies, record an unresolved tool/dependency failure and stop in the same item. Fixture-tested work can be complete_local only; required real acceptance stays pending.
- Make routine reversible decisions independently. Keep secrets out of source/config examples and do not reset unrelated work. Send external messages, publish, buy services, or change account settings only with applicable user authorization.
- After each item: explain what works, files changed, one concept in plain English, checks actually run, exact run/verify steps, one understanding question, and the next dependency/item. Then stop. Answering the question does not start work.
- **status**, **review**, **explain**, and **help** make no implementation changes. **verify** runs checks only. **status** reports unknowns honestly; **review** identifies prioritized issues with locations and does not silently fix them.

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

## Shared backlog — choose one item

### S1 — Repository and contributor workflow

Inspect the existing layout, add concise setup/architecture notes and a contributor workflow, and establish role-specific checkpoints plus the handoff/decision locations. Use isolated branches/worktrees when supported; never reset or overwrite another contributor's changes. Do not push or open PRs unless authorized by the team's workflow/user.

**Done:** documented commands/paths match the actual repository, each owner can find their area, and an example handoff records dependency, owner, evidence, and next action. S1 can precede other work but is not an artificial blocker to either role.

### S2 — Frontend foundation (first prerequisite if frontend is absent)

Establish or repair one minimal React + TypeScript + Vite + Tailwind app, package scripts/lockfile, global style, accessible control primitives, error boundary, and component-test setup. Follow an existing approved stack instead when present. Include one neutral page so feature components have somewhere to render. No backend required.

**Done:** from a clean install the app starts, one smoke test and production build pass, and Kiran has exact commands plus the component/API-client entry locations. Do not build his assigned features or the full dashboard here.

### S3 — Dashboard and navigation

Add layout/routes to learning, calculators, simulations/trading, portfolio, and tutor. Provide active/focus states and responsive navigation. Link actual features; mark unavailable destinations clearly instead of faking them.

**Dependency:** S2. **Done:** keyboard and phone/desktop navigation reach every implemented feature and handle unavailable ones honestly.

### S4 — Authentication UI/session experience

Build register/login/logout and protected-route behavior using Siddh's actual bearer-token contract. Store the token in memory by default, clear it on logout/401, and explain reload sign-in behavior. Preserve a redirect to the requested page after login. Do not add an auth bypass.

**Dependency:** S2 + Siddh Phase 3. **Done:** register → login → private route → logout works with real endpoints; invalid/expired sessions and errors have tests. Private route protection on the client is never a substitute for server ownership checks.

### S5 — Design consistency and accessibility

Consolidate existing styles/components and check keyboard flow, focus, labels, contrast, reduced motion, errors, chart alternatives, and phone layouts. Make targeted improvements that preserve current features.

**Dependency:** usable UI flows. **Done:** chosen screens have recorded keyboard/viewport checks and addressed high-impact issues; document the exact screens and limitations.

### S6 — Interactive mascot

Choose a small learning-support purpose and visual direction, implement an accessible static state, then optional reactions/animation with reduced-motion support. It does not provide financial claims or duplicate the tutor.

**Dependency:** S2 and selected visual direction. **Done:** mascot renders without blocking feature use; reactions and reduced-motion behavior are verified.

### S7 — General profile/settings

Choose one real product need first; reuse supported server capabilities. If it needs new backend work, record a separate ownership decision rather than silently expanding Siddh's scope. Minimize personal data.

**Dependency:** selected setting and any required auth/API. **Done:** the selected setting behaves/persists exactly as documented and passes its relevant checks. Do not invent a broad settings suite.

### S8 — CI and quality automation

Add lightweight deterministic checks using the same local backend/frontend commands. Use fixture data and provider mocks, never live keys/network calls for ordinary tests. Add caching only if useful.

**Dependency:** working local scripts. **Done:** checks run on the chosen repository workflow, match local commands, and do not expose secrets. If hosting CI requires authorization, prepare the config and record the unverified remote run separately.

### S9 — Root documentation and content review

Refine README/setup/API links, architecture overview, contribution guide, demo instructions, and honest limitations. Review Kiran's sourced financial lessons for clarity/accuracy with the mentor/user. AI-assisted review must not be labeled human approval.

**Dependency:** actual code/content to document/review. **Done:** tested setup commands match the build; content review records reviewer, date, sources, and version; unreviewed claims remain explicitly marked. This general review does not excuse either role from maintaining feature-specific docs.

### S10 — Cross-project release review

Review authorization, secret handling/logging, tutor exposure, persistent storage, production configuration, migration/rollback behavior, and real integration evidence. Create a reproducible finding for each issue, with owner and acceptance. Fix selected in-scope items; coordinate others explicitly.

**Dependency:** integrated build. **Done:** core release gates below have real evidence, including sourced historical ingestion and every unresolved material issue has an owner plus a release decision. Do not claim a security certification from this checklist.

## Handoff and acceptance checklist

Record findings in `docs/HANDOFFS.md`. A note includes the owner, dependency, contract version, fields/routes affected, reproduction commands, expected/actual result, and remaining acceptance. Prepare copyable summaries rather than sending external messages without authorization.

Before replacing fixtures, confirm base URL/auth behavior, actual OpenAPI, decimal/date types, queued-fill behavior, error envelope, and deterministic demo data.

Core release test against real services:
1. Fresh isolated setup/migrations; register/login through S4.
2. Read a lesson; submit quiz; reload and confirm persisted progress.
3. Run a calculator reference example.
4. Create/resume a simulation on a sourced real historical dataset; confirm source/usage manifest, data window, and only current/past data.
5. Submit a buy: pending with no future fill price; advance and verify fill.
6. Submit a sell; advance; reconcile cash/positions/transactions/P&L.
7. Exercise stale retry, rejected trade, future-date request, and another user's simulation.
8. Trigger an accessible notification.
9. Verify tutor's curriculum mode in simulation and honest AI-disabled state, or separately test configured general AI mode.
10. Save/restart/reload and confirm data survives; logout and confirm denied access.

Record date, environment/commit if available, checks actually run, results, and limitations. Core integration must pass with real APIs/database; optional AI/mascot may be absent with a clear release limitation.

## Ownership tracker template

Populate from actual repository evidence during selection/status assessment. These are initially **not assessed**, not assertions that code is absent.

| Item | Owner | Selected date | State | Dependency/next action | Evidence |
|---|---|---|---|---|---|
| S1 Repository workflow | Unassigned | — | Not assessed | Inspect repository | — |
| S2 Frontend foundation | Unassigned | — | Not assessed | Needed before Kiran if no frontend | — |
| S3 Dashboard/navigation | Unassigned | — | Not assessed | S2 | — |
| S4 Auth UI | Unassigned | — | Not assessed | S2 + Siddh Phase 3 | — |
| S5 Design/accessibility | Unassigned | — | Not assessed | Working screens | — |
| S6 Mascot | Unassigned | — | Not assessed | S2 + selected direction | — |
| S7 Settings | Unassigned | — | Not assessed | Selected product need | — |
| S8 CI | Unassigned | — | Not assessed | Working local checks | — |
| S9 Documentation/content | Unassigned | — | Not assessed | Actual code/content | — |
| S10 Release review | Unassigned | — | Not assessed | Integrated build | — |

To begin: **status**, then **select S#**, then **proceed**. Only one selected item is implemented at a time.
