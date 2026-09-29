"""Decision endpoints.

`/api/decision` is what the dashboard calls on every interaction: one request returns the
three decision cards plus the full M1-M4 detail. The per-module routes slice the same
computation, which makes each module independently inspectable (and is what a future
mobile client or a scheduled backtest would call).
"""
from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend.db import get_db
from backend.schemas import (DecisionResponse, M1Response, M2Response, M3Response,
                             M4Response, selection_query)
from backend.services import repository as repo
from backend.services.decision import Selection, build_decision

router = APIRouter(tags=["decision"])

SelectionDep = Annotated[tuple[Selection, dict[str, Any]], Depends(selection_query)]


def _require_data(session: Session) -> None:
    if not repo.is_loaded(session):
        raise HTTPException(503, "database is empty -- run: python -m backend.seed.load_db")


def _validate_against_db(session: Session, sel: Selection) -> None:
    """A crop or variety the database has never heard of is a client error, not a crash."""
    df = repo.read_prices(session)
    crops = set(df["commodity"].unique())
    if sel.crop not in crops:
        raise HTTPException(400, f"unknown crop {sel.crop!r}; database has {sorted(crops)}")
    if sel.variety != "All":
        known = set(df[df["commodity"] == sel.crop]["variety"].unique())
        if sel.variety not in known:
            raise HTTPException(400, f"unknown variety {sel.variety!r} for {sel.crop}")
    first, last = df["date"].min().date(), df["date"].max().date()
    if not first <= sel.as_of <= last:
        raise HTTPException(400, f"as_of must be between {first} and {last}")


@router.get("/decision", response_model=DecisionResponse,
            summary="Three decision cards + full M1-M4 detail for one selection")
def decision(dep: SelectionDep, session: Session = Depends(get_db)) -> DecisionResponse:
    sel, overrides = dep
    _require_data(session)
    _validate_against_db(session, sel)
    return DecisionResponse(**build_decision(session, sel, overrides))


@router.get("/m1", response_model=M1Response,
            summary="M1 seasonal decomposition, bands, flags and the price path")
def m1(dep: SelectionDep, session: Session = Depends(get_db)) -> M1Response:
    sel, overrides = dep
    _require_data(session)
    _validate_against_db(session, sel)
    return M1Response(**build_decision(session, sel, overrides)["m1"])


@router.get("/m2", response_model=M2Response,
            summary="M2 net-in-hand ranking of mandis")
def m2(dep: SelectionDep, session: Session = Depends(get_db)) -> M2Response:
    sel, overrides = dep
    _require_data(session)
    _validate_against_db(session, sel)
    return M2Response(**build_decision(session, sel, overrides)["m2"])


@router.get("/m3", response_model=M3Response,
            summary="M3 break-even scan, value curve and multi-tranche MILP")
def m3(dep: SelectionDep, session: Session = Depends(get_db)) -> M3Response:
    sel, overrides = dep
    _require_data(session)
    _validate_against_db(session, sel)
    return M3Response(**build_decision(session, sel, overrides)["m3"])


@router.get("/m4", response_model=M4Response,
            summary="M4 farmer lots, bounded knapsack and the DP cross-check")
def m4(dep: SelectionDep, session: Session = Depends(get_db)) -> M4Response:
    sel, overrides = dep
    _require_data(session)
    _validate_against_db(session, sel)
    return M4Response(**build_decision(session, sel, overrides)["m4"])


@router.get("/eligible-mandis", summary="Mandis with two full annual cycles, best-observed first")
def eligible_mandis(crop: str = Query(...), as_of: str = Query(...),
                    variety: str = Query("All"),
                    session: Session = Depends(get_db)) -> dict:
    """Cheap call for populating the reference-mandi selector without a full decision."""
    from datetime import date as _date
    from backend.services.decision import stl_eligible, view_of
    _require_data(session)
    sel = Selection(crop=crop, as_of=_date.fromisoformat(as_of), variety=variety)
    _validate_against_db(session, sel)
    df = repo.read_prices(session)
    return {"crop": crop, "as_of": as_of, "variety": variety,
            "eligible": stl_eligible(df, crop, None if variety == "All" else variety, sel.as_of)}
