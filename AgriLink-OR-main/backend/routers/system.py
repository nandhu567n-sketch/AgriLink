"""System endpoints: health check and database contents."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from backend import __version__
from backend.config import get_settings
from backend.db import get_db
from backend.schemas import HealthResponse
from backend.services import repository as repo
from backend.services.decision import build_meta

router = APIRouter(tags=["system"])


@router.get("/health", response_model=HealthResponse,
            summary="Is the API up, and is the database loaded?")
def health(session: Session = Depends(get_db)) -> HealthResponse:
    settings = get_settings()
    tables: dict[str, int] = {}
    loaded = False
    try:
        session.execute(text("SELECT 1"))
        tables = repo.table_counts(session)
        loaded = repo.is_loaded(session)
    except SQLAlchemyError as exc:
        return HealthResponse(status="degraded", api_version=__version__,
                              database=settings.database_url.rsplit("@", 1)[-1],
                              db_kind=settings.db_kind, data_loaded=False)
    return HealthResponse(status="ok" if loaded else "empty",
                          api_version=__version__,
                          database=settings.database_url.rsplit("@", 1)[-1],
                          db_kind=settings.db_kind, data_loaded=loaded, tables=tables)


@router.get("/meta", summary="Crops, varieties, date range, assumptions and provenance")
def meta(session: Session = Depends(get_db)) -> dict:
    """Everything the frontend needs to build its selectors before any decision is made."""
    if not repo.is_loaded(session):
        raise HTTPException(503, "database is empty -- run: python -m backend.seed.load_db")
    return build_meta(session)
