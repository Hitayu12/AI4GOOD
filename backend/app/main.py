"""Application factory, database lifespan, health, and authentication routes."""
from typing import Literal
from contextlib import asynccontextmanager

from fastapi import FastAPI
from argon2 import PasswordHasher
import secrets
from pydantic import BaseModel, ConfigDict

from app.config import Settings, load_settings
from app.database import make_engine, session_factory
from app.auth import LoginLimiter, router as auth_router
from app.errors import install_error_handlers
from app.datasets import router as dataset_router
from app.simulations import router as simulation_router


class HealthResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    status: Literal["ok"]


def create_app(settings: Settings | None = None) -> FastAPI:
    config = settings if settings is not None else load_settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        engine = make_engine(config.database_url)
        app.state.engine = engine
        app.state.sessions = session_factory(engine)
        try:
            app.state.settings = config
            app.state.password_hasher = PasswordHasher()
            app.state.dummy_password_hash = app.state.password_hasher.hash(secrets.token_urlsafe(32))
            app.state.login_limiter = LoginLimiter(config.login_max_attempts, config.login_window_seconds)
            yield
        finally:
            engine.dispose()

    app = FastAPI(title=config.app_name, version="0.1.0", lifespan=lifespan)
    install_error_handlers(app)
    app.include_router(auth_router)
    app.include_router(dataset_router)
    app.include_router(simulation_router)

    @app.get("/api/v1/health", response_model=HealthResponse, tags=["health"])
    def health() -> HealthResponse:
        return HealthResponse(status="ok")

    return app


app = create_app()

