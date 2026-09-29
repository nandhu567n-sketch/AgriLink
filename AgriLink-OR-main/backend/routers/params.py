"""Assumption-set endpoints.

The sliders in the UI send per-request overrides; these endpoints manage the *stored*
default set that `params.yaml` seeded the database with.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.db import get_db
from backend.schemas import ParamsUpdate
from backend.services import repository as repo
from backend.services.decision import invalidate_caches

router = APIRouter(prefix="/params", tags=["params"])


@router.get("", summary="The current assumption set")
def read(session: Session = Depends(get_db)) -> dict:
    return repo.get_params(session)


@router.put("", summary="Replace the stored assumption set (writes to the database)")
def replace(update: ParamsUpdate, session: Session = Depends(get_db)) -> dict:
    for section in ("freight", "handling", "market", "storage"):
        if section not in update.payload:
            raise HTTPException(422, f"payload is missing the {section!r} section")
    saved = repo.save_params(session, update.payload)
    invalidate_caches()
    return {"status": "saved", "params": saved}
