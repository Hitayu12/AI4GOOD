# Rutgers AI4Good 2026 — Markdown Audit Report
Date: 2026-10-21 · Result: corrected guides passed final review

## Scope and method

Reviewed the three standalone AI coding guides, not application code. The current AI4Good workspace contained no application files to test.

Two separate AI reviewer agents performed independent read-only audits: one for beginner workflow, ownership, dependencies, and checkpoints; one for API contracts, historical timing, accounting, authentication, and tutor boundaries. The author reconciled their findings, revised the guides, and requested follow-up reviews. This is an independent AI-assisted content audit, not a third-party security certification.

Original snapshots were retained before editing. Corrected guides are present in the current workspace and at the original download locations.

## Findings and fixes

The following 22 rows consolidate overlapping findings from both reviewers and subsequent re-review. All are addressed in guide version 2.

| ID | Original gap | Correction |
|---|---|---|
| A01 | Kiran's first phase assumed an existing frontend while setup remained unassigned. | Explicit Shared S2 prerequisite, fallback stack, independent launch order, and concrete blocked-state handoff. Frontend ownership remains shared. |
| A02 | Real private flows depended on unassigned authentication UI without a handoff. | Shared S4 is explicitly assigned for selection, depends on Siddh Phase 3, and is required before Kiran's real integration gate. |
| A03 | The tutor required a protected server route nobody owned. | Kiran owns the narrow tutor router/provider adapter using Siddh's existing auth/config; no duplicate backend. |
| A04 | Lessons and quizzes assumed someone else supplied definitions; question retrieval, answer keys, and completion policy were undefined. | Kiran supplies five original topic definitions; Siddh serves/scores; private answer keys, question retrieval, immutable versions, 80% pass threshold, best/latest attempts, and review metadata are defined. |
| A05 | Route lists allowed independently compliant but incompatible clients/servers. | Identical embedded contract specifies routes, request/response fields, money/date/percent types, errors, pagination, IDs, auth transport, and canonical repository contract precedence. |
| A06 | An unscoped historical-data endpoint could bypass simulated time. | Only owned simulation-scoped price reads; future-bound rejection, availability timestamps, and direct-request/two-user/response filtering checks. |
| A07 | Next-price execution lacked a pending lifecycle and clear timestamp meaning. | Pending order at session close, next-open fill during atomic advance, explicit simulated submitted/executed times, separate real processing metadata, final-session and rejection behavior. |
| A08 | Decimal safety lacked a storage/rounding/cost-basis policy; sub-cent fills could round to zero cost. | Integer scaled storage, decimal-string wire values, half-up totals, weighted-average cost, partial-sale residual allocation, numeric bounds, and whole-cent import validation. |
| A09 | Mutable or mixed adjusted/raw datasets could change outcomes; an intermediate rewrite inadvertently deferred real historical data. | Immutable dataset versions, source/usage/retrieval manifest, complete session grid, raw-price/no-corporate-action window, and required real historical import/final acceptance. Synthetic fixtures remain separate. |
| A10 | A simple unspecified token flow left logout, expiry, storage, and ownership ambiguous. | Expiring/revocable opaque bearer tokens, hashed token persistence, password hashing, logout endpoint, memory client storage, and server-side ownership checks. |
| A11 | Optional idempotency and UI disabling did not prevent duplicate or stale writes. | Required idempotency keys, request fingerprints, replay/conflict semantics, expected-version checks, atomic writes, and concurrent/rollback regression requirements. |
| A12 | Calculator compounding/rate/contribution/rounding choices had no unique expected answer. | Effective annual rate converted monthly, end-of-month contributions, explicit bounds, zero/negative cases, output rounding, and independent numeric oracles. |
| A13 | Restricting model inputs was treated as enough to prevent historical hindsight. | Active-simulation tutor uses deterministic approved curriculum with zero model calls; general AI is separate, protected, bounded, and honestly unavailable without configuration. |
| A14 | A fresh chat always began Phase 1 despite possible existing progress. | Exact role checkpoint paths, resume from earliest unfinished phase, repository verification before adoption, and explicit final-stop behavior. |
| A15 | Fixtures were allowed but phase gates implied real persistence/integration. | complete_local versus complete states, named real acceptance, and a mandatory real core integration gate that cannot pass on mocks. |
| A16 | Early auth completion required resource ownership tests before those resources existed. | Auth mechanics tested in Phase 3; concrete two-user tests added when each resource route arrives. |
| A17 | Fix failures before stopping could produce endless retries or dishonest completion. | Bounded reasonable remedies, blocked/implemented_unverified states, exact failure evidence, and same-phase resume. |
| A18 | Deployment guidance could place SQLite on disposable storage and implied deployment without access. | Durable storage/supported database, migration/rollback notes, save/restart/reload verification, concrete deployment-ready work before any missing authorization request, and honest blocked live verification. |
| A19 | Shared selection persistence and repeated proceed after completion were undefined. | Selection records owner/date/acceptance at a fixed path without coding; completed selections do not rerun or silently advance. |
| A20 | Notify owners could imply sending messages without authority or proof. | Repository handoff record plus copyable summary; external sending requires user authorization and is never inferred from writing a note. |
| A21 | All shared rows claimed not started despite no repository assessment. | Initial status is not assessed, with evidence required before claiming progress or absence. |
| A22 | Backlog finish conditions, demo timing, and a cross-guide accounting reference were incomplete. | Observable done criteria, five-minute demo, bounded MVP, optional mascot/AI limits, and a reference reconciliation embedded in every standalone guide. |

## Verification actually performed

Both independent reviewers re-read the corrected files. Their final verdicts reported no remaining material contradiction within their respective instruction/workflow and technical-contract audit scopes.

The local document checker completed successfully on Node.js v20.14.0: **20 checks passed**. It checks requirements and consistency; it does not execute future app implementations.

Checks covered:
- one shared contract per guide and byte-identical contract text;
- matching guide versions/dates and sequential phase/backlog numbering;
- explicit owner checkpoints, one-phase command behavior, understanding checks, and partial/blocked states;
- required route groups, scoped data, pending-order timing, idempotency, money rules, and ownership;
- required real historical data, frontend/auth prerequisites, and tutor ownership;
- deterministic simulation tutor mode and honest disabled behavior;
- persisted shared selection and completed-selection guard;
- real core integration/persistent-storage gates;
- standalone numerical reference cases, independently reconciled with arithmetic;
- honest initial backlog status and matching original/current copies.

Shared contract SHA-256, including its BEGIN/END markers and excluding a trailing newline:
`36d4f529c368792d82d1ab52a26efa2c20f44cda35b0a91a818d0180e1deda03`

The checker is retained in the current workspace at `work/audit_guides.mjs`. Re-run from the AI4Good workspace with `node work/audit_guides.mjs`.

## Remaining implementation prerequisites

These are explicit project dependencies, not unresolved guide defects:
- Mentor/user selects S2 if no frontend exists, then S4 once Siddh's auth API is ready.
- Siddh acquires/imports the real historical dataset with documented permitted use.
- Kiran authors the starter content; Shared S9 records its actual review.
- Hosting access/authorization is required for real deployment; AI credentials are required only for live general AI mode.

No application, live API, external market provider, AI service, or deployment was run by this Markdown audit. Passing document checks cannot guarantee that future generated code will meet the instructions; each guide requires implementation-time verification.
