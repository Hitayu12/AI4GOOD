"""
Rutgers AI4Good 2026 — AI Tutor FastAPI Router
POST /api/v1/tutor/messages
Phase 8 Specification & Contract Enforcement
"""

from typing import Dict, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Header
from fastapi.responses import JSONResponse

from app.schemas.tutor import (
    TutorMessageRequest,
    TutorMessageResponse,
    ApiErrorEnvelope,
    ApiErrorDetail,
)
from app.services.tutor_service import (
    CurriculumTutorEngine,
    AiTutorProviderAdapter,
    UserRateLimiter,
    TutorUnavailableException,
    RateLimitExceededException,
    SimulationNotFoundException,
)

router = APIRouter(prefix="/api/v1/tutor", tags=["tutor"])

# Singleton instances for service and rate limiter
curriculum_engine = CurriculumTutorEngine()
ai_provider = AiTutorProviderAdapter(api_key=None)  # None by default -> triggers honest 503 unless configured
rate_limiter = UserRateLimiter(max_requests=10, window_seconds=60.0)

# Mock database of simulation ownership for verification
SIMULATION_OWNERSHIP_STORE: Dict[str, str] = {
    "sim_test_001": "usr_kiran_001",
    "sim_test_002": "usr_kiran_001",
    "sim_other_user": "usr_other_999",
}

def get_current_user_id(authorization: Optional[str] = Header(None)) -> str:
    """
    Extracts current authenticated user id from Authorization header.
    In production, this reuses Siddh's token verification dependency.
    """
    if not authorization or not authorization.startswith("Bearer "):
        # Default mock user for testing if no bearer provided
        return "usr_kiran_001"
    token = authorization.split("Bearer ", 1)[1].strip()
    if token == "token_user_other":
        return "usr_other_999"
    return "usr_kiran_001"


@router.post(
    "/messages",
    response_model=TutorMessageResponse,
    responses={
        404: {"model": ApiErrorEnvelope, "description": "Simulation not found or not owned"},
        422: {"model": ApiErrorEnvelope, "description": "Message bounds validation error"},
        429: {"model": ApiErrorEnvelope, "description": "Rate limit exceeded"},
        503: {"model": ApiErrorEnvelope, "description": "Tutor provider unavailable"},
    },
)
async def post_tutor_message(
    payload: TutorMessageRequest,
    current_user_id: str = Depends(get_current_user_id),
):
    """
    Handles student messages to the financial literacy tutor.
    - If `simulation_id` is supplied: enlists Deterministic Curriculum Mode (0 model calls).
    - If `simulation_id` is omitted: routes to General Educational AI Mode.
    """
    # 1. Enforce Per-User Rate Limiting
    try:
        rate_limiter.check_and_record(current_user_id)
    except RateLimitExceededException as e:
        return JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content={"error": {"code": e.code, "message": e.message}},
        )

    # 2. Simulation Context & Ownership Verification
    if payload.simulation_id:
        owner_id = SIMULATION_OWNERSHIP_STORE.get(payload.simulation_id)
        if not owner_id or owner_id != current_user_id:
            return JSONResponse(
                status_code=status.HTTP_404_NOT_FOUND,
                content={
                    "error": {
                        "code": "simulation_not_found",
                        "message": "Simulation not found or access denied.",
                    }
                },
            )

        # Deterministic Curriculum Mode: STRICT ZERO LLM INFERENCE
        reply, sources = curriculum_engine.answer_query(payload.message)
        return TutorMessageResponse(
            reply=reply,
            mode="curriculum",
            source_links=sources,
        )

    # 3. General Educational AI Mode
    try:
        reply, sources = ai_provider.generate_response(payload.message)
        return TutorMessageResponse(
            reply=reply,
            mode="ai",
            source_links=sources,
        )
    except TutorUnavailableException as e:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"error": {"code": e.code, "message": e.message}},
        )
