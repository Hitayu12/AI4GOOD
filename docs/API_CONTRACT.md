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
