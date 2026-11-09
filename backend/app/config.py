"""Environment configuration; no secrets or external services are needed yet."""
import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    app_name: str = "AI4Good API"
    database_url: str = "sqlite:///./ai4good.db"
    auth_token_ttl_seconds: int = 3600
    login_max_attempts: int = 10
    login_window_seconds: int = 60

    def __post_init__(self):
        bounds = {
            "auth_token_ttl_seconds": (60, 86400),
            "login_max_attempts": (1, 1000),
            "login_window_seconds": (1, 3600),
        }
        for name, (minimum, maximum) in bounds.items():
            value = getattr(self, name)
            if type(value) is not int or not minimum <= value <= maximum:
                raise ValueError(f"{name} must be an integer from {minimum} to {maximum}.")


def load_settings() -> Settings:
    name = os.environ.get("AI4GOOD_APP_NAME", "AI4Good API").strip()
    if not name or len(name) > 100:
        raise ValueError("AI4GOOD_APP_NAME must contain 1–100 characters.")
    return Settings(
        app_name=name,
        database_url=os.environ.get("DATABASE_URL", "sqlite:///./ai4good.db"),
        auth_token_ttl_seconds=int(os.environ.get("AUTH_TOKEN_TTL_SECONDS", "3600")),
        login_max_attempts=int(os.environ.get("LOGIN_MAX_ATTEMPTS", "10")),
        login_window_seconds=int(os.environ.get("LOGIN_WINDOW_SECONDS", "60")),
    )

