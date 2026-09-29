"""Request validation and response shapes for the API.

The heavy payloads (a full decision for one selection) are intentionally typed as
`dict[str, Any]` in places: their shape is documented here and served with live OpenAPI
examples, while the maths that produces them is already covered by the module tests.
"""
from __future__ import annotations

import json
from datetime import date
from typing import Any

from fastapi import HTTPException, Query
from pydantic import BaseModel, Field

from backend.services.decision import Selection

FARM_LAT_RANGE = (11.5, 18.5)
FARM_LON_RANGE = (74.0, 78.5)


class HealthResponse(BaseModel):
    status: str
    api_version: str
    database: str
    db_kind: str
    data_loaded: bool
    tables: dict[str, int] = Field(default_factory=dict)


class TableCounts(BaseModel):
    prices: int
    mandis: int
    farms: int
    farm_distances: int
    params: int
    dataset_meta: int


class MandiRef(BaseModel):
    market: str
    district: str | None = None
    lat: float | None = None
    lon: float | None = None
    source: str | None = None


class M1Response(BaseModel):
    period: int
    min_weeks: int
    eligible: list[str]
    ref_mandi: str | None
    error: str | None
    imputed_warning: str | None
    coverage: dict[str, Any] | None = None
    strengths: dict[str, float] | None = None
    glut_weeks: int | None = None
    spike_weeks: int | None = None
    path_start: float | None = None
    path_end: float | None = None
    series: list[dict[str, Any]] = Field(default_factory=list)
    path: list[dict[str, Any]] = Field(default_factory=list)
    seasonal_index: list[dict[str, Any]] = Field(default_factory=list)


class M2Response(BaseModel):
    rows: list[dict[str, Any]] = Field(default_factory=list)
    count: int
    top: dict[str, Any] | None
    board_top: dict[str, Any] | None
    gap_per_qtl: float | None
    cost_walk: dict[str, float] | None


class M3Response(BaseModel):
    available: bool
    error: str | None = None
    carry_per_qtl_day: float | None = None
    breakeven_day: int | None = None
    best_day: int | None = None
    best_gain_per_qtl: float | None = None
    curve: list[dict[str, Any]] = Field(default_factory=list)
    milp: dict[str, Any] | None = None


class M4Response(BaseModel):
    available: bool
    error: str | None = None
    lots: list[dict[str, Any]] = Field(default_factory=list)
    order: float
    pool_total: float
    dp_surplus: int | None = None
    agg: dict[str, Any] | None = None


class DecisionResponse(BaseModel):
    selection: dict[str, Any]
    params: dict[str, Any]
    provenance: dict[str, Any]
    cards: dict[str, Any]
    m1: M1Response
    m2: M2Response
    m3: M3Response
    m4: M4Response


class ParamsUpdate(BaseModel):
    payload: dict[str, Any] = Field(
        ..., description="Full assumption set in params.yaml shape (nested dict).")


def selection_query(
    crop: str = Query(..., description="Commodity present in the database, e.g. Onion"),
    as_of: date = Query(..., description="Point-in-time cut; the dashboard replays up to here"),
    variety: str = Query("All", description="'All' pools every variety of the crop"),
    window_days: int = Query(14, ge=1, le=60),
    volume: float = Query(200.0, ge=10, le=1000, description="Crop volume in quintals"),
    horizon: int = Query(180, ge=30, le=240, description="Hold-vs-sell horizon in days"),
    conservative: bool = Query(False),
    farm_lat: float = Query(14.30, ge=FARM_LAT_RANGE[0], le=FARM_LAT_RANGE[1]),
    farm_lon: float = Query(76.00, ge=FARM_LON_RANGE[0], le=FARM_LON_RANGE[1]),
    n_farmers: int = Query(25, ge=5, le=60),
    order: float = Query(400.0, ge=50, le=1000, description="Bulk order in quintals"),
    ref_mandi: str | None = Query(None, description="Optional; defaults to the best-observed series"),
    overrides: str | None = Query(
        None,
        description='JSON object of cost overrides, e.g. {"freight.diesel_price": 95.0}',
    ),
) -> tuple[Selection, dict[str, Any]]:
    """FastAPI dependency: validate the query string into a Selection + parsed overrides."""
    parsed: dict[str, Any] = {}
    if overrides:
        try:
            parsed = json.loads(overrides)
        except json.JSONDecodeError as exc:
            raise HTTPException(400, f"overrides is not valid JSON: {exc}") from exc
        if not isinstance(parsed, dict):
            raise HTTPException(400, "overrides must be a JSON object of dotted parameter paths")
    sel = Selection(crop=crop, as_of=as_of, variety=variety, window_days=window_days,
                    volume=volume, horizon=horizon, conservative=conservative,
                    farm_lat=farm_lat, farm_lon=farm_lon, n_farmers=n_farmers,
                    order=order, ref_mandi=ref_mandi)
    return sel, parsed
