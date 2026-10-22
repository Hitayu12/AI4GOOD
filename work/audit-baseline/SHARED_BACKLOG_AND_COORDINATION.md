# Rutgers AI4Good 2026 — Shared Backlog & Coordination

## Purpose

This file holds unassigned work, shared agreements, and integration checkpoints for the financial education and historical market simulation project. The mentor/user can choose items as time allows. Do not assume every backlog item must be built for the first working version.

This file can also be given to an AI coding assistant with repository access. Type **`status`** for an assessment or **`proceed`** to work on the next explicitly selected shared item.

---

## Instructions for the AI coding assistant

Act as a beginner-friendly project coordinator and implementation partner. Protect Siddh's and Kiran's assigned scopes. Do not quietly claim or rewrite their active work.

### Safety and workflow rules

1. Inspect the repository, project instructions, branch/status, tests, documentation, and the latest contributor checkpoints before making changes.
2. Preserve unrelated work and use the existing architecture, components, styles, and package tools.
3. On **`status`**, make no code changes. Briefly show what exists, what is blocked, and the smallest useful next shared item.
4. On **`proceed`**, implement only the shared item already selected by the user. If no item has been selected, recommend one item based on dependencies and ask the user to name or approve it; do not start the whole backlog.
5. One selected item is one phase. Finish, verify, teach, and stop before another item.
6. Write real code in the repository and run available checks. Never claim a test, build, deployment, or manual check happened unless it actually did.
7. Do not overwrite another contributor's work. Resolve contract changes visibly and document them for both owners.
8. Keep secrets out of source control and treat all financial output as educational simulation, not financial advice.

### Response required after shared work

1. **Completed:** what now works.
2. **Files changed:** a short list.
3. **Why it matters:** plain-English explanation.
4. **Verification:** checks actually run and how the team can try it.
5. **Understanding check:** exactly one short question.
6. **Next:** the smallest sensible shared item or coordination action; then stop.

## Ownership map

### Siddh Jain — backend and simulation engine

- FastAPI/backend foundation
- Database, migrations, and backend models
- Authentication APIs and authorization
- Historical data ingestion and normalization
- No-look-ahead simulation engine
- Buy/sell processing and portfolio accounting
- P&L and backend analytics
- Quiz/progress APIs
- Backend tests and debugging

### Kiran — assigned features and integration

- Savings/investment calculators
- Financial lesson and quiz experience
- Historical simulation integration
- Paper trading interface and portfolio presentation
- Notifications
- AI financial tutor
- Integration testing, reviews, bug fixes
- Deployment/final testing
- Demo and presentation

### Shared/unassigned — mentor or user chooses

- Overall frontend foundation if none exists
- Global dashboard, layout, and navigation
- Design system, reusable UI primitives, and accessibility standards
- Authentication screens and session experience
- General profile/settings experience
- Interactive mascot design, implementation, animation, and reactions
- Cross-project repository organization and contributor workflow
- Root documentation, architecture overview, contribution guide, and decision log
- Shared sample/demo data coordination
- General CI checks and repository automation
- Product copy review and financial-content fact review
- Privacy, data retention, terms/disclaimer placement, and accessibility review
- Any feature not explicitly assigned above

If a shared item becomes assigned, record the owner and date in the tracker before implementation.

## MVP priority

Protect the smallest complete learning loop first:

1. A user can access a lesson and complete a quiz.
2. A user can start a historical simulation without seeing future data.
3. A user can place a virtual trade.
4. Cash, holdings, transactions, and P&L reconcile.
5. The user can understand what happened and how to run the project.

Mascot polish, broad settings, elaborate animation, and other enhancements should not delay that loop.

## Shared technical agreement

Use the repository's existing agreement when present. Otherwise use this baseline until the team changes it deliberately:

- Frontend uses one typed API client; components do not scatter raw URLs.
- Backend uses Python 3.11+, FastAPI, Pydantic, SQLAlchemy, Alembic, and `/api/v1` routes.
- SQLite is acceptable locally; deployment configuration comes through `DATABASE_URL`.
- Store money using decimal-safe types and return it consistently; the frontend formats rather than silently rounding trusted values.
- Use UTC for stored timestamps. Always distinguish simulated time from real time in API fields and the interface.
- Historical data records their source, interval, timezone, and adjustment policy.
- The server is authoritative for authentication, visible market data, order execution, cash, positions, scoring, and analytics.
- Future market information must never be returned or used before the simulation time reaches it.
- AI requests go through a protected server route; no AI key belongs in browser code. The tutor is educational and cannot execute trades.
- Automated tests use deterministic fixture data and mocked AI/provider responses, not live third-party services.

### Baseline route groups

| Area | Route group |
|---|---|
| Health | `/api/v1/health` |
| Authentication | `/api/v1/auth/*` |
| Market data | `/api/v1/instruments`, `/api/v1/market-data/*` |
| Simulation | `/api/v1/simulations/*` |
| Trades | `/api/v1/simulations/{id}/orders` and `/transactions` |
| Portfolio | `/api/v1/simulations/{id}/portfolio` and `/performance` |
| Learning | `/api/v1/lessons`, `/api/v1/quizzes/*`, `/api/v1/progress` |
| Tutor | an agreed protected server route such as `/api/v1/tutor/messages` |

Contract changes require three things: update the shared documentation, update contract/tests or fixtures, and notify the affected owner. Do not silently support two conflicting contracts.

## Definition of done for every item

An item is done only when:

- acceptance behavior is clear;
- the implementation uses the existing architecture;
- relevant tests/checks have actually run, or an honest reason and manual verification steps are recorded;
- loading, empty, validation, and error states are considered where applicable;
- accessibility and phone/desktop behavior are checked for user interfaces;
- secrets and private user data are protected;
- documentation/status notes are updated;
- no unrelated contributor work was overwritten;
- limitations and follow-up work are stated honestly.

## Shared backlog

Choose intentionally. Suggested order follows dependencies, but the user controls selection.

### S1 — Repository and contributor foundation

- Clarify folder structure, setup scripts, environment examples, ignore rules, and contributor workflow.
- Add a small architecture overview and decision log.
- Define where each contributor records phase status and integration needs.

### S2 — Frontend foundation

- Establish the existing frontend app if missing, using the team-approved stack.
- Add global styles, accessible reusable controls, error boundary, and test foundation.
- Avoid building Kiran's assigned features during this item.

### S3 — Dashboard and navigation

- Add a concise home/dashboard view and routes to learning, calculator, simulation/trading, portfolio, and tutor areas.
- Include clear active/focus states, responsive navigation, and useful loading/empty behavior.
- Use placeholders only where an assigned feature has not landed; label them honestly.

### S4 — Authentication interface

- Build registration, login, logout, protected-route/session handling, and clear failure states against Siddh's real auth contract.
- Never store or log secrets carelessly. Follow the backend token/cookie design rather than inventing another one.

### S5 — Design system and accessibility pass

- Consolidate tokens and reusable UI patterns already emerging from the application.
- Check keyboard flow, focus visibility, labels, contrast, reduced motion, error messaging, and chart alternatives.
- Avoid a visual rewrite that breaks working features.

### S6 — Interactive mascot

- Define a small purpose and personality that supports learning rather than distracting from it.
- Add an accessible static state first, then optional reactions/animation with reduced-motion support.
- Do not make the mascot a source of financial claims or duplicate the AI tutor.

### S7 — General profile/settings

- Add only settings supported by real product needs and backend capabilities.
- Keep identity/private data minimal and document what is stored.

### S8 — CI and quality automation

- Add lightweight checks for backend tests and frontend tests/type-check/lint/build using the repository's tools.
- Keep checks deterministic and document how contributors run the same checks locally.

### S9 — Documentation and content review

- Create or refine the root README, architecture/setup guide, API link, contribution notes, demo-data instructions, and known limitations.
- Review educational claims for clarity and accuracy with a qualified human where appropriate.
- Place educational/not-financial-advice language without making it disruptive.

### S10 — Privacy, security, and release readiness

- Review secret handling, authorization boundaries, user-data separation, logging, AI input/output exposure, dependency risks, and data retention.
- Confirm production configuration, migration, backup/rollback assumptions, and owner responsibilities.
- Record findings by severity and fix only authorized/in-scope items.

## Coordination checkpoints

### Backend-to-interface handoff

Before Kiran replaces fixtures, confirm:

- base URL and auth behavior;
- OpenAPI/schema examples;
- money and date formats;
- simulation visibility and execution rules;
- error response shape;
- deterministic demo user/data flow.

### Integration checkpoint

Exercise this exact flow together:

1. Start from a clean setup.
2. Register/login if auth UI is available.
3. Complete one lesson and quiz.
4. Create a historical simulation.
5. Advance simulated time.
6. Buy and sell a virtual holding.
7. Confirm cash, position, transaction history, and P&L.
8. Trigger one useful notification.
9. Ask the tutor an educational question and confirm it cannot trade.

Record the test date, environment, commit, result, and owner of each defect.

## Lightweight ownership tracker

Update this table whenever a shared item is chosen. Do not invent progress.

| Item | Owner | Status | Dependency/blocker | Evidence or link |
|---|---|---|---|---|
| S1 Repository foundation | Unassigned | Not started | — | — |
| S2 Frontend foundation | Unassigned | Not started | Team stack decision if absent | — |
| S3 Dashboard/navigation | Unassigned | Not started | S2 | — |
| S4 Authentication UI | Unassigned | Not started | Siddh auth contract | — |
| S5 Design/accessibility | Unassigned | Not started | Working UI flows | — |
| S6 Mascot | Unassigned | Not started | Shared visual foundation | — |
| S7 Profile/settings | Unassigned | Not started | Product need and backend support | — |
| S8 CI automation | Unassigned | Not started | Stable local commands | — |
| S9 Documentation/content review | Unassigned | Not started | Contributor setup/contracts | — |
| S10 Release readiness | Unassigned | Not started | Integrated build | — |

## Useful commands for the AI chat

- **`status`** — inspect and report progress, ownership, dependencies, and the smallest useful next action without changing code.
- **`select S#`** — select one shared backlog item and explain its acceptance target without starting it.
- **`proceed`** — implement only the selected item, verify it, teach it, and stop.
- **`review`** — review current shared/integration work without implementing a new item.
- **`verify`** — rerun relevant shared checks and report evidence.
- **`explain <topic>`** — teach a project concept using this repository.
- **`help`** — show available commands.

Never start the entire shared backlog from a single **`proceed`**.
