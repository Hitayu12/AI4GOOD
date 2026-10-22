"""Environment configuration; no secrets or external services are needed yet."""
import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    app_name: str = "AI4Good API"
    database_url: str = "sqlite:///./ai4good.db"


def load_settings() -> Settings:
    name = os.environ.get("AI4GOOD_APP_NAME", "AI4Good API").strip()
    if not name or len(name) > 100:
        raise ValueError("AI4GOOD_APP_NAME must contain 1–100 characters.")
    return Settings(
        app_name=name,
        database_url=os.environ.get("DATABASE_URL", "sqlite:///./ai4good.db"),
    )

