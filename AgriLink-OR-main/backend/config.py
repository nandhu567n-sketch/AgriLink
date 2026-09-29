"""Runtime configuration, read from the environment with a `.env` fallback.

Everything has a working default so `uvicorn backend.main:app` runs with no setup at all.
The only value that normally needs changing is DATABASE_URL, which points at PostgreSQL.
"""
from __future__ import annotations

import os
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / ".env")


def _floats(raw: str, fallback: tuple[str, ...]) -> list[str]:
    parts = [p.strip() for p in raw.split(",") if p.strip()]
    return parts or list(fallback)


@dataclass(frozen=True)
class Settings:
    database_url: str = "postgresql+psycopg2://agrilink:agrilink@localhost:5432/agrilink"
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    cors_origins: list[str] = field(
        default_factory=lambda: _floats(
            os.getenv("API_CORS_ORIGINS", ""),
            ("http://localhost:8501", "http://127.0.0.1:8501"),
        )
    )
    echo_sql: bool = os.getenv("API_ECHO_SQL", "0") == "1"
    stl_period: int = 52

    @property
    def db_kind(self) -> str:
        url = self.database_url
        if url.startswith("sqlite"):
            return "sqlite"
        if url.startswith("postgresql"):
            return "postgresql"
        return url.split(":", 1)[0]

    @property
    def min_weeks(self) -> int:
        """statsmodels STL needs two complete cycles."""
        return 2 * self.stl_period


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings(database_url=os.getenv("DATABASE_URL", Settings.database_url))
