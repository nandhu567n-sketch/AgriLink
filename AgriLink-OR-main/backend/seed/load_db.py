"""ETL: load the cleaned pipeline artifacts into the database.

    python -m backend.seed.load_db                 # create tables if needed, load rows
    python -m backend.seed.load_db --reset         # drop and recreate, then load
    python -m backend.seed.load_db --build-missing # run the pipeline first if artifacts are gone

Reads the artefacts the pipeline already produces (and can rebuild them):
    data/raw/clean.parquet        -> prices
    data/ref/mandis.csv           -> mandis
    data/ref/dist_matrix.parquet  -> farm_distances
    data/ref/params.yaml          -> params
"""
from __future__ import annotations

import argparse
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd
import yaml
from sqlalchemy import insert

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from backend.config import get_settings
from backend.db import Base, get_engine, new_session
from backend.models import (TABLES, DatasetMeta, Farm, FarmDistance, Mandi, ParamSet, Price)
from backend.services.decision import invalidate_caches

CLEAN = ROOT / "data" / "raw" / "clean.parquet"
MANDIS = ROOT / "data" / "ref" / "mandis.csv"
DIST = ROOT / "data" / "ref" / "dist_matrix.parquet"
PARAMS = ROOT / "data" / "ref" / "params.yaml"
SOURCE_CSV = ROOT / "Agriculture_price_dataset.csv"

PIPELINE = [
    ("history", "src.data.load_history"),
    ("clean", "src.data.clean"),
    ("geocode", "src.geo.geocode_mandis"),
    ("distmat", "src.geo.build_dist_matrix"),
]
CHUNK = 2000


def _build_missing() -> None:
    """Run the existing pipeline modules for whichever artefacts are missing."""
    for label, module in PIPELINE:
        needed = {"history": ROOT / "data" / "raw" / "agmarknet_history.parquet",
                  "clean": CLEAN, "geocode": MANDIS, "distmat": DIST}[label]
        if needed.exists():
            print(f"  {label:8} already built -> {needed.name}")
            continue
        print(f"  {label:8} building with python -m {module} ...")
        subprocess.run([sys.executable, "-m", module], cwd=ROOT, check=True)


def _text(value) -> str | None:
    """pandas 3 nullable strings -> plain str or None (never the literal 'nan')."""
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return None
    text = str(value)
    return None if text in ("nan", "None", "<NA>") else text


def _number(value) -> float | None:
    return None if value is None or pd.isna(value) else float(value)


def _price_rows(df: pd.DataFrame) -> list[dict]:
    return [{
        "date": row.date.date() if hasattr(row.date, "date") else row.date,
        "state": str(row.state), "district": str(row.district), "market": str(row.market),
        "commodity": str(row.commodity), "variety": str(row.variety),
        "grade": _text(row.grade), "min_price": _number(row.min_price),
        "max_price": _number(row.max_price), "modal_price": float(row.modal_price),
    } for row in df.itertuples(index=False)]


def _mandi_rows(df: pd.DataFrame) -> list[dict]:
    return [{
        "market": str(r.market), "district": str(r.district),
        "lat": _number(r.lat), "lon": _number(r.lon), "source": _text(r.source),
    } for r in df.itertuples(index=False)]


def _distance_rows(df: pd.DataFrame) -> list[dict]:
    return [{"farm_id": str(r.farm_id), "market": str(r.market),
             "district": str(r.district), "km": float(r.km)} for r in df.itertuples(index=False)]


def _insert_chunked(session, model, rows: list[dict]) -> int:
    for start in range(0, len(rows), CHUNK):
        session.execute(insert(model), rows[start:start + CHUNK])
    return len(rows)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Load AgriLink-OR data into the database")
    parser.add_argument("--reset", action="store_true",
                        help="drop every table first (keeps the database itself)")
    parser.add_argument("--build-missing", action="store_true",
                        help="run the data pipeline for any missing artefact first")
    args = parser.parse_args(argv)

    settings = get_settings()
    print(f"target   : {settings.db_kind}  {settings.database_url}")
    if not args.build_missing and not (CLEAN.exists() and MANDIS.exists() and DIST.exists()):
        print("artefacts missing -- re-run with --build-missing")
        return 1
    if args.build_missing:
        print("pipeline :")
        _build_missing()

    prices = pd.read_parquet(CLEAN)
    mandis = pd.read_csv(MANDIS)
    distances = pd.read_parquet(DIST)
    params = yaml.safe_load(PARAMS.read_text(encoding="utf-8"))

    engine = get_engine()
    if args.reset:
        print("reset    : dropping " + ", ".join(TABLES))
        Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)

    with new_session() as session:
        for model in (Price, Mandi, Farm, FarmDistance, ParamSet, DatasetMeta):
            session.query(model).delete()
        session.commit()

        n_prices = _insert_chunked(session, Price, _price_rows(prices))
        n_mandis = _insert_chunked(session, Mandi, _mandi_rows(mandis))
        n_dist = _insert_chunked(session, FarmDistance, _distance_rows(distances))

        from src.geo.build_dist_matrix import DEFAULT_FARM
        session.execute(insert(Farm), [{
            "farm_id": DEFAULT_FARM["farm_id"], "name": DEFAULT_FARM["name"],
            "lat": float(DEFAULT_FARM["lat"]), "lon": float(DEFAULT_FARM["lon"])}])
        session.execute(insert(ParamSet), [{"name": "default", "payload": params}])
        meta_rows = [
            {"key": "source_file", "value": SOURCE_CSV.name},
            {"key": "source_rows", "value": f"{len(prices):,}"},
            {"key": "mandis", "value": str(len(mandis))},
            {"key": "districts", "value": str(mandis['district'].nunique())},
            {"key": "crops", "value": str(prices['commodity'].nunique())},
            {"key": "coverage_start", "value": f"{prices['date'].min():%Y-%m-%d}"},
            {"key": "coverage_end", "value": f"{prices['date'].max():%Y-%m-%d}"},
            {"key": "loader", "value": "backend.seed.load_db"},
            {"key": "loaded_at", "value": datetime.now(timezone.utc).isoformat(timespec="seconds")},
        ]
        session.execute(insert(DatasetMeta), meta_rows)
        session.commit()

    invalidate_caches()
    print(f"loaded   : prices={n_prices:,} mandis={n_mandis} farm_distances={n_dist} "
          f"params=1 meta={len(meta_rows)}")
    print(f"coverage : {prices['date'].min():%Y-%m-%d} -> {prices['date'].max():%Y-%m-%d} | "
          f"{prices['market'].nunique()} mandis | {prices['commodity'].nunique()} crops")
    print("done. start the API with:  make backend")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
