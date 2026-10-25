# Rutgers AI4Good 2026 — Handoffs

## Handoff 001: Shared S2 — Frontend Foundation Prerequisite

- **From**: Kiran (Features & Integration)
- **To**: Shared / User / Mentor
- **Date**: 2026-10-21
- **Status**: completed (2026-10-22)
- **Dependency**: Shared S2 (Frontend foundation)
- **Resolution**:
  Completed in `frontend/` with React 18 + TypeScript + Vite + Tailwind CSS + Vitest + Testing Library. Includes accessible control primitives (`Button`, `Card`, `Input`, `ErrorBoundary`) and neutral workspace container. App starts cleanly, tests pass, and production build succeeds.
- **Unblocks**: Kiran Phase 1 (API Client & Transport Boundary).

## Handoff 002: Lesson & Quiz Schema and Content Definitions

- **From**: Kiran (Features & Integration)
- **To**: Siddh Jain (Backend Foundations & Engine)
- **Date**: 2026-10-22
- **Status**: ready_for_ingestion
- **Dependency**: Siddh Phase 8 (Lesson / Quiz persistence and scoring)
- **Description**:
  Kiran provides 5 original starter lessons (CDs, HYSAs, Stocks, ETFs, Options) with stable immutable IDs, version 1, public quiz question schemas, and server-side answer keys.
- **Artifacts**:
  - Specification & Answer Keys: `docs/content/LESSONS_AND_QUIZZES.md`
  - Frontend Definitions: `frontend/src/features/learning/content/`
- **Contract Rules**:
  - Public quiz endpoint `GET /api/v1/quizzes/{id}` must omit the answer key.
  - Server scoring endpoint `POST /api/v1/quizzes/{id}/attempts` validates that every question is answered once, scores against server answer keys, and passes at 80% or above.
  - Server tracks `latest_score_pct` and `best_score_pct` separately in `GET /api/v1/progress`.
- **Unblocks**: Siddh Phase 8 implementation.

## Handoff 003: AI Tutor FastAPI Router & Provider Adapter
- **From**: Kiran (Features & Integration)
- **To**: Siddh Jain (Backend Foundations & Engine)
- **Date**: 2026-10-22
- **Status**: ready_for_mounting
- **Dependency**: Shared API Contract v2 (POST /api/v1/tutor/messages) & Backend FastAPI App
- **Description**:
  Kiran delivers the narrowly scoped backend AI Tutor router and provider adapter module ready to mount into Siddh's FastAPI application.
- **Artifacts**:
  - Router: `backend/app/routers/tutor.py` (`POST /api/v1/tutor/messages`)
  - Schemas: `backend/app/schemas/tutor.py` (`TutorMessageRequest`, `TutorMessageResponse`, `ApiErrorEnvelope`)
  - Services: `backend/app/services/tutor_service.py` (`CurriculumTutorEngine`, `AiTutorProviderAdapter`, `UserRateLimiter`)
  - Test Suite: `backend/tests/test_tutor.py` (10 test cases covering zero model calls in curriculum mode, bounds, 503 missing credentials, 503 timeout, 429 rate limit, 404 simulation ownership, and injection defense)
  - Dependencies: `backend/requirements.txt`
- **Mounting Instructions for Siddh**:
  - Mount router into FastAPI app: `app.include_router(tutor_router)`
  - Re-export dependency `get_current_user_id` to use Siddh's real bearer token auth dependency (`get_current_user`).
  - Wire `SIMULATION_OWNERSHIP_STORE` to Siddh's SQLAlchemy `Simulation` model to check ownership.
- **Unblocks**: Phase 9 real integration between frontend chat interface and backend FastAPI server.

## Handoff 004: Shared S4 Authentication UI Completed & Backend Integration Gate
- **From**: Kiran (Features & Integration)
- **To**: Siddh Jain (Backend Foundations & Engine)
- **Date**: 2026-10-24
- **Status**: blocked_on_backend_apis
- **Dependency**: Siddh Phase 1–8 Backend Foundations (FastAPI server, SQLite DB, Auth, Simulation, Trading, Portfolio, Learning APIs)
- **Description**:
  Kiran completed the Shared S4 Authentication UI (`frontend/src/components/auth/AuthModal.tsx`), in-memory bearer token management (`Authorization: Bearer <token>`), session sign-in/sign-out header controls, and completed a comprehensive contract review across all 8 frontend features (19 test suites, 214 tests passing, clean production build).
- **Required Backend Endpoints to Unblock Phase 9**:
  - `POST /api/v1/auth/register` & `POST /api/v1/auth/login` (Opaque bearer tokens)
  - `GET /api/v1/auth/me` & `POST /api/v1/auth/logout`
  - `GET /api/v1/datasets`, `POST /api/v1/simulations`, `POST /api/v1/simulations/{id}/advance`
  - `POST /api/v1/simulations/{id}/orders`, `GET /api/v1/simulations/{id}/orders`, `GET /api/v1/simulations/{id}/transactions`
  - `GET /api/v1/simulations/{id}/portfolio`, `GET /api/v1/simulations/{id}/performance`
  - `GET /api/v1/lessons`, `GET /api/v1/lessons/{id}`, `GET /api/v1/quizzes/{id}`, `POST /api/v1/quizzes/{id}/attempts`, `GET /api/v1/progress`
  - Mount Kiran's Tutor router `POST /api/v1/tutor/messages` from `backend/app/routers/tutor.py`
- **Unblock Condition**:
  Once Siddh's FastAPI server is runnable and database migrations are in place, toggling the UI from "Fixtures" to "Live API" will execute end-to-end integration verification against real database storage.



