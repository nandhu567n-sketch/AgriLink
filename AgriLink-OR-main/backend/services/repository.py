"""Repository layer: the only place SQL is written.

Every read returns a plain pandas DataFrame with exactly the column names the pure
modules in `src/` already expect, so the decision modules need no knowledge of the
database or of pandas-vs-SQLAlchemy differences.
"""
from __future__ import annotations

import copy

import pandas as pd
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from backend.models import DatasetMeta, Farm, FarmDistance, Mandi, ParamSet, Price

PRICE_COLUMNS = ["date", "state", "district", "market", "commodity", "variety",
                 "grade", "min_price", "max_price", "modal_price"]
MANDI_COLUMNS = ["market", "district", "lat", "lon", "source"]

# Process-local caches. The fact table is read-only while the API serves, and the MILP is
# slow enough that recomputing an identical decision on every request would be wasteful.
_cache: dict[str, pd.DataFrame] = {}


def invalidate_caches() -> None:
    _cache.clear()


def read_prices(session: Session) -> pd.DataFrame:
    if "prices" not in _cache:
        stmt = select(*(getattr(Price, c) for c in PRICE_COLUMNS))
        frame = pd.DataFrame(session.execute(stmt).all(), columns=PRICE_COLUMNS)
        # SQLAlchemy hands back datetime.date objects, so the column arrives as object dtype.
        # Coerce it to datetime64 to match what the parquet path in `src/` produces -- the
        # modules slice, resample and compare this column, and all of those need real dates.
        frame["date"] = pd.to_datetime(frame["date"])
        _cache["prices"] = frame
    return _cache["prices"]


def read_mandis(session: Session, require_coordinates: bool = True) -> pd.DataFrame:
    key = "mandis_geo" if require_coordinates else "mandis"
    if key not in _cache:
        stmt = select(*(getattr(Mandi, c) for c in MANDI_COLUMNS))
        if require_coordinates:
            stmt = stmt.where(Mandi.lat.isnot(None), Mandi.lon.isnot(None))
        _cache[key] = pd.DataFrame(session.execute(stmt).all(), columns=MANDI_COLUMNS)
    return _cache[key]


def read_farms(session: Session) -> pd.DataFrame:
    if "farms" not in _cache:
        _cache["farms"] = pd.DataFrame(
            session.execute(select(Farm.farm_id, Farm.name, Farm.lat, Farm.lon)).all(),
            columns=["farm_id", "name", "lat", "lon"],
        )
    return _cache["farms"]


def read_farm_distances(session: Session) -> pd.DataFrame:
    if "farm_distances" not in _cache:
        _cache["farm_distances"] = pd.DataFrame(
            session.execute(
                select(FarmDistance.farm_id, FarmDistance.market,
                       FarmDistance.district, FarmDistance.km)
            ).all(),
            columns=["farm_id", "market", "district", "km"],
        )
    return _cache["farm_distances"]


def get_params(session: Session) -> dict:
    """Assumption set stored in the database, falling back to params.yaml if absent."""
    row = session.get(ParamSet, "default")
    if row is None:
        from src.common.params import load_params
        return load_params()
    return copy.deepcopy(row.payload)


def save_params(session: Session, payload: dict) -> dict:
    session.merge(ParamSet(name="default", payload=payload))
    session.commit()
    invalidate_caches()
    return get_params(session)


def get_dataset_meta(session: Session) -> dict[str, str]:
    if "dataset_meta" not in _cache:
        rows = session.execute(select(DatasetMeta.key, DatasetMeta.value)).all()
        _cache["dataset_meta"] = {k: v for k, v in rows}
    return _cache["dataset_meta"]


def table_counts(session: Session) -> dict[str, int]:
    counts: dict[str, int] = {}
    for label, model in (("prices", Price), ("mandis", Mandi), ("farms", Farm),
                         ("farm_distances", FarmDistance), ("params", ParamSet),
                         ("dataset_meta", DatasetMeta)):
        counts[label] = int(session.execute(select(func.count()).select_from(model)).scalar_one())
    return counts


def is_loaded(session: Session) -> bool:
    return int(session.execute(select(func.count()).select_from(Price)).scalar_one()) > 0
