"""Phase 1 application factory and health contract."""
from typing import Literal

from fastapi import FastAPI
from pydantic import BaseModel, ConfigDict

from app.config import Settings, load_settings


class HealthResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    status: Literal["ok"]


def create_app(settings: Settings | None = None) -> FastAPI:
    config = settings if settings is not None else load_settings()
    app = FastAPI(title=config.app_name, version="0.1.0")

    @app.get("/api/v1/health", response_model=HealthResponse, tags=["health"])
    def health() -> HealthResponse:
        return HealthResponse(status="ok")

    return app


app = create_app()

