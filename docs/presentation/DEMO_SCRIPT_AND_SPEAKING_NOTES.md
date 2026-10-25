# Rutgers AI4Good 2026 — Five-Minute Demo Script & Speaking Notes

**Project**: Accessible Educational Paper Trading & Financial Literacy Platform  
**Presenter**: Kiran (Features & Integration)  
**Teammates & Credits**:
- **Kiran**: Frontend architecture, calculators, lesson/quiz content definitions, historical simulation/trading/portfolio interfaces, notification center, and AI tutor router/interface.
- **Siddh Jain**: Backend foundations, SQLAlchemy/SQLite models, financial calculation engine, auth APIs, and market data ingestion.  
**Target Duration**: Exactly 5 minutes (300 seconds)  
**Contract Version**: Aligned with `docs/API_CONTRACT.md` (v2)  

---

## Timing Breakdown

| Timestamp | Phase & Focus | On-Screen Action | Key Speaking Points |
|---|---|---|---|
| **0:00 – 0:40** (40s) | Problem & Mission | Landing view / Header | Financial literacy gap; risks of gamified trading apps; our mission of risk-free, zero-lookahead education. |
| **0:40 – 1:20** (40s) | Savings & Investment Calculators | Calculators Tab | Monthly compounding formula \(i = (1+r)^{1/12} - 1\); compare $1,000 + $100/mo in HYSA vs Stock Index. |
| **1:20 – 2:00** (40s) | Learning & Quizzes | Lessons Tab | 5 starter lessons; 80% passing threshold; server-side answer key isolation. |
| **2:00 – 2:45** (45s) | Historical Simulation | Simulation Tab | Curriculum Time Cursor; strict zero-lookahead data filtering (`session_date <= current_session`). |
| **2:45 – 3:35** (50s) | Paper Trading & Execution | Paper Trading Tab | Queue whole-share buy order; advance date; next-session OPEN execution; deliberate price gap rejection error. |
| **3:35 – 4:15** (40s) | Portfolio Analytics & WCAG | Portfolio Tab | Reconciled weighted-average cost basis; interactive SVG equity curve; WCAG 1.4.1 non-color-only loss presentation. |
| **4:15 – 4:40** (25s) | Notification Center | Toast Stack | Sliding-window 3,000ms deduplication; sensitive token scrubber; WCAG 4.1.3 assertive vs polite live regions. |
| **4:40 – 5:00** (20s) | AI Tutor & Conclusion | AI Tutor Tab | Deterministic Curriculum Mode (0 model calls); project limitations & team credits. |

---

## Detailed Step-by-Step Speaking Notes & Clicks

### 1. Introduction & The Problem (0:00 – 0:40)
- **Visual**: Show app header with Rutgers AI4Good 2026 branding, navigation bar, and system status badge.
- **Action**: Click "Portfolio (Phase 6)" tab (default landing).
- **Speaker**:
  > *"Good afternoon everyone. Millions of students and first-time investors begin trading using gamified mobile apps with little to no financial foundation. They are lured into high-risk option bets or speculative hype without understanding basic compounding, asset classes, or execution risks.*  
  > *Our team built the Rutgers AI4Good Financial Literacy Platform: an accessible, pedagogically rigorous environment that couples foundational savings calculators and server-scored lessons with a real historical simulation and paper trading engine—backed by strict zero-lookahead protections."*

---

### 2. High-Yield Savings & Investment Calculators (0:40 – 1:20)
- **Visual**: Switch to **Calculators (Phase 2)**.
- **Action**: Select the preset **"Index Fund Investment (10 Years @ 8%)"** ($1,000 starting, $200/month, 8% return, 120 months).
- **Speaker**:
  > *"We start with fundamentals. Before trading individual stocks, students need to understand compounding. Our calculator engine uses the exact effective annual rate convention: \(i = (1+r)^{1/12} - 1\), with end-of-month contributions.*  
  > *Notice the breakdown: Starting with $1,000 and contributing $200 a month at an 8% return yields over $38,000, where nearly $14,000 represents pure compound growth. All inputs are strictly bounded to prevent nonfinite numbers, and the UI discloses that projected returns are never guaranteed."*

---

### 3. Structured Curriculum & Server-Scored Quizzes (1:20 – 2:00)
- **Visual**: Switch to **Lessons & Quizzes (Phase 3)**.
- **Action**: Click on **"Exchange-Traded Funds (ETFs)"** lesson. Scroll to the quiz section. Answer 4 questions to achieve 100%.
- **Speaker**:
  > *"Next is our structured educational curriculum. We authored 5 comprehensive lessons covering CDs, High-Yield Savings Accounts, Equities, ETFs, and Options fundamentals.*  
  > *Each topic includes an interactive quiz requiring an 80% threshold to pass. Crucially, as a core security requirement, quiz answer keys are strictly maintained on the server and are never bundled into the client-side JavaScript. This prevents students from inspecting network requests or DOM bundles to cheat."*

---

### 4. Historical Simulation & The Zero-Lookahead Cursor (2:00 – 2:45)
- **Visual**: Switch to **Simulation (Phase 4)**.
- **Action**: Point out the **Curriculum Time Cursor** badge displaying `2024-01-02`.
- **Speaker**:
  > *"Now we transition to hands-on practice. Unlike typical simulators that expose full-history price charts, our platform enforces a strict Curriculum Time Cursor.*  
  > *Today is simulated as January 2nd, 2024. All price data, volume bars, and portfolio queries are hard-filtered to only show sessions on or before this cursor. Future market dates are completely locked and invisible. Time only moves forward when the student deliberately advances the simulation session."*

---

### 5. Paper Trading & Next-Session Open Execution (2:45 – 3:35)
- **Visual**: Switch to **Paper Trading (Phase 5)**.
- **Action**:
  1. Submit a Buy order for **2 whole shares of AAPL** at latest close ($100.00).
  2. Show order placed in **"Pending"** status.
  3. Switch back to **Simulation** tab and click **"Advance Simulation Session"**.
  4. Return to **Paper Trading** tab and show the order is now **"Filled"** at the next-session OPEN price ($100.00).
  5. *Deliberate Error Demo*: Attempt to submit a Sell order for **10 shares of AAPL** (when holding only 2 shares).
  6. Point out the instant inline rejection: *"Oversell rejected: held quantity is 2 whole shares."*
- **Speaker**:
  > *"In paper trading, orders submitted after session close do not execute immediately at the last visible price. Instead, they enter 'Pending' status and execute at the next session's OPEN price once time advances.*  
  > *This realistically teaches students about overnight risk and price gaps. Furthermore, we enforce strict boundary checks: notice that attempting to sell 10 shares when we only hold 2 shares triggers an instant, accessible validation error."*

---

### 6. Portfolio Analytics & Non-Color-Only Accessibility (3:35 – 4:15)
- **Visual**: Switch to **Portfolio (Phase 6)**.
- **Action**:
  1. Highlight the Total Equity card, Cash balance, and Unrealized P&L.
  2. Hover over the interactive SVG Equity Curve.
  3. Toggle the **"Show Tabular View"** button for screen readers.
  4. Point out the loss indicators on positions or negative return points.
- **Speaker**:
  > *"Our portfolio engine reconciles accounting using weighted-average cost basis. Realized P&L is allocated proportionally on partial sales, with the final share clearing remaining basis to prevent rounding drift.*  
  > *Accessibility was a non-negotiable requirement. Under WCAG 1.4.1, financial losses are never represented by red color alone. Every loss includes an explicit minus sign, the word 'Loss', a downward arrow glyph, and screen-reader accessible ARIA attributes. Students using assistive tech can toggle the full tabular data view of the equity curve with a single keystroke."*

---

### 7. Notification Center & Duplicate Suppression (4:15 – 4:40)
- **Visual**: Show floating notifications in top-right corner.
- **Action**: Press the `Escape` key to dismiss notifications.
- **Speaker**:
  > *"Every trading action, simulation advance, and quiz submission dispatches unobtrusive feedback through our Notification Center.*  
  > *It features a 3,000-millisecond sliding-window deduplication engine to eliminate notification spam during rapid re-renders or API retries. Furthermore, an automated redaction filter scrubs private tokens or secrets before they can reach the UI or screen-reader live regions."*

---

### 8. AI Tutor Guardrails, Limitations & Credits (4:40 – 5:00)
- **Visual**: Switch to **AI Tutor (Phase 8)**.
- **Action**: Point out the **"Deterministic Curriculum Mode (Zero Lookahead)"** badge.
- **Speaker**:
  > *"Finally, our AI Financial Tutor. When operating inside an active simulation, the tutor automatically locks into Deterministic Curriculum Mode. It makes exactly zero external LLM calls, ensuring that an AI model cannot accidentally leak future market trends or price movements from its pre-training data.*  
  > *Limitations: Our MVP dataset uses a clean historical window without corporate splits, dividends, or fees. We'd like to credit Siddh for backend architecture and financial foundations, and Kiran for frontend engineering and feature integration.*  
  > *Thank you, and we welcome any questions!"*

---

## Rehearsal & Verification Checklist

- [x] Initial demo state resets cleanly to deterministic values ($1,000.00 starting cash).
- [x] All 5 navigation tabs transition with zero console errors.
- [x] Calculator formula matches contract benchmark: $1,000 @ 12% for 12 months = $1,120.00.
- [x] Oversell protection triggers error modal without crashing.
- [x] SVG equity curve displays only visited sessions (no future points).
- [x] Total speaking time verified at 4 minutes 50 seconds, leaving 10 seconds buffer.
