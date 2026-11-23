"""
Rutgers AI4Good 2026 — AI Tutor Pydantic Schemas
Phase 8 Contract Definitions
"""

from typing import List, Optional, Literal
from pydantic import BaseModel, Field, constr

class TutorMessageRequest(BaseModel):
    message: str = Field(
        ...,
        min_length=1,
        max_length=2000,
        description="The student's question or concept inquiry (1-2,000 characters).",
        examples=["What is the difference between an ETF and an individual stock?"]
    )
    simulation_id: Optional[str] = Field(
        default=None,
        description="If supplied, pins request to an active simulation, enforcing deterministic curriculum mode with 0 model calls."
    )

class TutorMessageResponse(BaseModel):
    reply: str = Field(
        ...,
        description="Educational explanation or concept guidance."
    )
    mode: Literal["ai", "curriculum"] = Field(
        ...,
        description="Processing mode: 'curriculum' enforces zero LLM inference; 'ai' uses educational provider."
    )
    source_links: List[str] = Field(
        default_factory=list,
        description="Authoritative educational sources (SEC, FINRA, Investor.gov, FDIC)."
    )

class ApiErrorDetail(BaseModel):
    code: str
    message: str
    field: Optional[str] = None

class ApiErrorEnvelope(BaseModel):
    error: ApiErrorDetail
