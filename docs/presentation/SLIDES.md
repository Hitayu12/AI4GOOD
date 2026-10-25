# Presentation Deck — Accessible Financial Literacy & Paper Trading Platform
**Rutgers AI4Good 2026**

---

## Slide 1: Title & Team Roles
# Rutgers AI4Good 2026
### Accessible Financial Literacy & Paper Trading Platform
**A Zero-Lookahead Educational Simulation Environment**

- **Kiran**: Features & Integration (Frontend Architecture, Calculators, Content, Simulation/Trading UI, Notifications, AI Tutor Adapter)
- **Siddh Jain**: Backend Foundations & Financial Engine (FastAPI, SQLite/SQLAlchemy Models, Market Data Ingestion, Auth APIs)

---

## Slide 2: The Problem & Educational Gap
### Why Traditional Trading Apps Fail Students
- **Speculative Hype**: Gamified trading apps encourage immediate options trading and volatile stock-picking without understanding risks.
- **Lookahead Bias in Backtests**: Typical educational simulators expose entire price charts upfront, allowing students to "trade the past" with hindsight knowledge.
- **Accessibility Barriers**: Standard financial charts rely exclusively on red/green colors to indicate performance, excluding color-blind and visually impaired students.
- **Our Solution**: An accessible, zero-lookahead platform combining pure compounding math, server-evaluated quizzes, disciplined next-session market open execution, and safe AI guidance.

---

## Slide 3: Savings & Investment Calculators
### Pure Mathematics & Compounding Realities
- **Effective Annual Rate Formula**:
  \[
  i = (1 + r)^{1/12} - 1
  \]
- **Disciplined Mechanics**: Monthly compounding with end-of-month contribution credits.
- **Transparent Disclosures**: Clear explanations that past index averages do not guarantee future returns; taxes and inflation excluded for educational clarity.
- **Reference Checks**: $1,000 principal + $100/mo @ 0% = $2,200.00; $1,000 principal @ 12% for 12 months = $1,120.00.

---

## Slide 4: Curriculum & Server-Scored Quizzes
### Pedagogy with High Academic Integrity
- **5 Starter Topics**: Certificates of Deposit (CDs), High-Yield Savings Accounts (HYSAs), Equities, ETFs, and Options fundamentals.
- **80.00% Mastery Threshold**: Rigorous pass/fail gating per topic.
- **Public Bundle Key Isolation**: 
  - `serverAnswerKeys.ts` is strictly excluded from client browser bundles.
  - Public quiz schemas expose only questions and options; trusted scores are computed exclusively on the server.

---

## Slide 5: Historical Simulation & Zero Lookahead
### True Chronological Discipline
- **The Curriculum Time Cursor**: The student’s view of the market is anchored to `current_session` (e.g., `2024-01-02`).
- **Zero Future Leakage**: Every OHLC query strictly enforces `session_date <= current_session`.
- **Immutable Sourced Datasets**: Daily OHLC bars from documented historical periods verified free of corporate split distortions.
- **Manual Progression**: Time advances strictly upon user action via idempotent mutation requests (`POST /simulations/{id}/advance`).

---

## Slide 6: Paper Trading & Portfolio Analytics
### Realistic Execution & Accounting Correctness
- **Next-Session OPEN Execution**: Orders placed after market close fill at the next session's opening price, teaching overnight gap risk.
- **Overnight Gap Rejection**: Price spikes exceeding available virtual cash safely reject without breaking state.
- **Weighted-Average Cost Basis**: Proportional cost allocation on partial share liquidations, with complete remainder allocation on the final share.
- **Visited-Only History**: Equity curve charts never include future dates.

---

## Slide 7: Accessibility First (WCAG 2.1 AA)
### Inclusive Financial Education for Everyone
- **WCAG 1.4.1 Non-Color-Only Indicators**:
  - Losses are **never** indicated by red text alone.
  - Multi-channel cues: explicit minus sign (`-`), text label (`"Loss"`), downward arrow glyph (`"▼"`), and ARIA attributes.
- **WCAG 4.1.3 Status Announcements**:
  - `assertive` live regions for urgent order execution rejections.
  - `polite` live regions for background simulation date advancements.
- **Screen Reader Equity Table**: One-click toggle transforms visual SVG equity curves into fully navigable data tables.

---

## Slide 8: AI Tutor Guardrails & Sourced Guidance
### Conversational Assistance Without Cheating
- **Deterministic Curriculum Mode**:
  - When an active simulation context is detected, the AI Tutor strictly makes **0 external LLM calls**.
  - All replies use verified static financial definitions with primary source links (SEC, FINRA, Investor.gov), preventing LLMs from leaking historical market data.
- **Educational AI Mode**:
  - Outside simulations, provides general guidance while disarming prompt injections and refusing personalized trade recommendations.
- **Limitations & Future Work**: Real corporate action processing, multi-asset options execution, and live cloud deployment.
