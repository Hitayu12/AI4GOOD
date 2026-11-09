"""Opaque bearer authentication. Never log credentials or token values."""
from dataclasses import dataclass
from datetime import datetime, timezone
from hashlib import sha256
import math
import secrets
from threading import Lock
import time
from time import monotonic
from typing import Annotated, Literal

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError
from email_validator import EmailNotValidError, validate_email
from fastapi import APIRouter, Depends, Request, Response
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, ConfigDict, Field, SecretStr, field_validator
from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_session
from app.errors import APIError, ErrorResponse
from app.models import AuthToken, User


class Credentials(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    email: str = Field(min_length=3, max_length=254, description=(
        "ASCII email address, 3–254 characters after trimming; stored lowercase. "
        "Display-name syntax is not accepted. No deliverability lookup is performed."),
        json_schema_extra={"format": "email"})
    password: SecretStr = Field(min_length=12, max_length=128,
                               description="12–128 characters, preserved exactly; never trimmed.")

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, value):
        if not isinstance(value, str):
            raise ValueError("Email must be text.")
        value = value.strip()
        if not value.isascii() or "<" in value or ">" in value or not 3 <= len(value) <= 254:
            raise ValueError("Invalid email.")
        value = value.lower()
        try:
            return validate_email(value, check_deliverability=False,
                                  allow_smtputf8=False).normalized.lower()
        except EmailNotValidError:
            raise ValueError("Invalid email.") from None


class PublicUser(BaseModel):
    model_config = ConfigDict(extra="forbid", from_attributes=True)
    id: str
    email: str


class RegistrationResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    user: PublicUser


class LoginResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    access_token: str = Field(min_length=43, max_length=43, pattern=r"^[A-Za-z0-9_-]{43}$",
                             description="Opaque bearer secret. Keep in memory; never log it.")
    token_type: Literal["bearer"] = "bearer"
    expires_at: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$",
                            description="Token expiry in UTC, ending in Z.")


class LoginLimiter:
    """Bounded, thread-safe per-peer fixed windows for this single-process MVP."""
    def __init__(self, limit: int, window: int):
        self.limit, self.window = limit, window
        self._lock = Lock()
        self._buckets: dict[str, tuple[float, int]] = {}

    def check(self, peer: str) -> None:
        now = monotonic()
        with self._lock:
            self._buckets = {key: value for key, value in self._buckets.items()
                             if now - value[0] < self.window}
            started, count = self._buckets.get(peer, (now, 0))
            if count >= self.limit:
                raise APIError(429, "login_rate_limited", "Too many login attempts. Try again later.",
                               headers={"Retry-After": str(max(1, math.ceil(self.window - (now - started))))})
            if peer not in self._buckets and len(self._buckets) >= 10000:
                raise APIError(503, "auth_unavailable", "Authentication is temporarily unavailable.")
            self._buckets[peer] = (started, count + 1)


def token_digest(raw_token: str) -> str:
    return sha256(raw_token.encode("ascii")).hexdigest()


def unauthorized() -> APIError:
    return APIError(401, "unauthenticated", "Authentication required.",
                    headers={"WWW-Authenticate": "Bearer"})


@dataclass(frozen=True)
class AuthContext:
    user: User
    token: AuthToken


bearer = HTTPBearer(auto_error=False, scheme_name="BearerToken")
DatabaseSession = Annotated[Session, Depends(get_session)]


def require_auth(session: DatabaseSession,
                 credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)]) -> AuthContext:
    if credentials is None:
        raise unauthorized()
    raw = credentials.credentials
    # Issued tokens are exactly 43 URL-safe ASCII characters (32 random bytes).
    if len(raw) != 43 or any(c not in "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_" for c in raw):
        raise unauthorized()
    now = int(time.time())
    token = session.scalar(select(AuthToken).where(
        AuthToken.token_hash == token_digest(raw), AuthToken.expires_at > now,
        AuthToken.created_at <= now, AuthToken.revoked_at.is_(None)))
    if token is None:
        raise unauthorized()
    user = session.get(User, token.user_id)
    if user is None:
        raise unauthorized()
    return AuthContext(user=user, token=token)


def get_current_user(auth: Annotated[AuthContext, Depends(require_auth)]) -> User:
    """Reusable dependency for future owned-resource routes."""
    return auth.user


router = APIRouter(prefix="/api/v1/auth", tags=["auth"], responses={
    422: {"model": ErrorResponse}, 500: {"model": ErrorResponse}})


@router.post("/register", status_code=201, response_model=RegistrationResponse,
             responses={409: {"model": ErrorResponse}})
def register(body: Credentials, request: Request, response: Response, session: DatabaseSession):
    response.headers["Cache-Control"] = "no-store"
    user = User(email=body.email,
                password_hash=request.app.state.password_hasher.hash(body.password.get_secret_value()))
    session.add(user)
    try:
        session.commit()
    except IntegrityError:
        session.rollback()
        if session.scalar(select(User.id).where(User.email == body.email)) is not None:
            raise APIError(409, "email_registered", "Email is already registered.", "email") from None
        raise
    return RegistrationResponse(user=PublicUser.model_validate(user))


@router.post("/login", response_model=LoginResponse, responses={
    401: {"model": ErrorResponse}, 429: {"model": ErrorResponse}, 503: {"model": ErrorResponse}})
def login(body: Credentials, request: Request, response: Response, session: DatabaseSession):
    response.headers["Cache-Control"] = "no-store"
    # Do not trust client-supplied X-Forwarded-For. Configure trusted proxies at serving time.
    request.app.state.login_limiter.check(request.client.host if request.client else "unknown")
    user = session.scalar(select(User).where(User.email == body.email))
    hasher: PasswordHasher = request.app.state.password_hasher
    stored = user.password_hash if user else request.app.state.dummy_password_hash
    try:
        hasher.verify(stored, body.password.get_secret_value())
    except (VerificationError, InvalidHashError):
        raise APIError(401, "invalid_credentials", "Invalid email or password.",
                       headers={"WWW-Authenticate": "Bearer"}) from None
    if user is None:
        raise APIError(401, "invalid_credentials", "Invalid email or password.",
                       headers={"WWW-Authenticate": "Bearer"})
    if hasher.check_needs_rehash(user.password_hash):
        user.password_hash = hasher.hash(body.password.get_secret_value())
    raw = secrets.token_urlsafe(32)
    now = int(time.time())
    expires = now + request.app.state.settings.auth_token_ttl_seconds
    session.add(AuthToken(token_hash=token_digest(raw), user_id=user.id,
                          created_at=now, expires_at=expires))
    session.commit()
    return LoginResponse(access_token=raw,
                         expires_at=datetime.fromtimestamp(expires, timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"))


@router.get("/me", response_model=PublicUser, responses={401: {"model": ErrorResponse}})
def me(response: Response, user: Annotated[User, Depends(get_current_user)]):
    response.headers["Cache-Control"] = "no-store"
    return PublicUser.model_validate(user)


@router.post("/logout", status_code=204, response_class=Response,
             responses={401: {"model": ErrorResponse}})
def logout(auth: Annotated[AuthContext, Depends(require_auth)], session: DatabaseSession):
    # Conditional update preserves the first revocation timestamp under concurrent logout.
    session.execute(update(AuthToken).where(AuthToken.token_hash == auth.token.token_hash,
                                            AuthToken.revoked_at.is_(None)).values(
        revoked_at=max(int(time.time()), auth.token.created_at)))
    session.commit()
    return Response(status_code=204, headers={"Cache-Control": "no-store"})
