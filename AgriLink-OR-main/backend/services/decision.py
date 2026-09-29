"""The decision engine: database rows in, one JSON payload out.

This is the backend's only business-logic module. It runs the four pure optimisation
modules from `src/` against the tables loaded into PostgreSQL and assembles everything the
dashboard needs for one selection (crop, variety, as-of date, volume, horizon, costs, farm
location) into a single response.

The maths is unchanged from the original single-file app; only the data source moved from
parquet to the database and the output format from Streamlit widgets to JSON.
"""
from __future__ import annotations

import json
import sys
from dataclasses import asdict, dataclass
from datetime import date
from pathlib import Path

import numpy as np
import pandas as pd
from sqlalchemy.orm import Session

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:  # allow `uvicorn backend.main:app` from any directory
    sys.path.insert(0, str(ROOT))

from backend.config import get_settings
from backend.services import repository as repo
from src.data.farmers import make_lots, to_frame
from src.geo.build_dist_matrix import distances_for
from src.m1_econometrics.stl_bands import (coverage, price_path, seasonal_index,
                                          stl_bands, strengths, weekly_series)
from src.m2_arbitrage.nihr import rank_mandis
from src.m3_milp.breakeven import breakeven_day, carry_cost_per_qtl_day
from src.m3_milp.hold_sell import solve_hold_sell
from src.m4_aggregation.knapsack import aggregate, dp_min_surplus

MAX_DECISION_CACHE = 64
_decision_cache: dict[str, dict] = {}


def invalidate_caches() -> None:
    """Drop cached frames and cached decisions. Called after any database write."""
    _decision_cache.clear()
    repo.invalidate_caches()


@dataclass(frozen=True)
class Selection:
    """Everything the user can choose. Validated by the API layer before it gets here."""

    crop: str
    as_of: date
    variety: str = "All"
    window_days: int = 14
    volume: float = 200.0
    horizon: int = 180
    conservative: bool = False
    farm_lat: float = 14.30
    farm_lon: float = 76.00
    n_farmers: int = 25
    order: float = 400.0
    ref_mandi: str | None = None


# --------------------------------------------------------------------- helpers
def _records(df: pd.DataFrame) -> list[dict]:
    """DataFrame -> JSON-safe list of dicts (NaN becomes null, numpy scalars become numbers)."""
    return json.loads(df.to_json(orient="records", date_format="iso"))


def set_by_path(params: dict, dotted: str, value) -> dict:
    """`storage.loan_interest` -> params["storage"]["loan_interest"] = value."""
    head, _, tail = dotted.partition(".")
    node = params.setdefault(head, {})
    if not isinstance(node, dict) or not tail:
        raise ValueError(f"unknown parameter path: {dotted!r}")
    if tail not in node:
        raise ValueError(f"unknown parameter: {dotted!r}")
    node[tail] = value
    return params


def apply_overrides(params: dict, overrides: dict | None) -> dict:
    """Session overrides of the stored assumption set (what the sidebar sliders used to do)."""
    merged = json.loads(json.dumps(params))
    for key, value in (overrides or {}).items():
        set_by_path(merged, key, value)
    return merged


def view_of(df: pd.DataFrame, crop: str, variety: str | None,
            market: str | None = None, as_of: date | None = None) -> pd.DataFrame:
    """Rows in scope for the current selection, cut point-in-time at `as_of`."""
    m = df["commodity"] == crop
    if variety is not None and variety != "All":
        m &= df["variety"] == variety
    if market:
        m &= df["market"] == market
    if as_of is not None:
        m &= df["date"] <= pd.Timestamp(as_of)
    return df[m]


def latest_prices(df: pd.DataFrame, crop: str, variety: str | None,
                  as_of: date, window_days: int) -> pd.Series:
    """Median board price per mandi over the `window_days` ending at `as_of`.

    A window rather than a single day: mandis skip days, so a single date would discard
    every mandi that did not report that day.
    """
    sub = view_of(df, crop, variety, as_of=as_of)
    cutoff = pd.Timestamp(as_of) - pd.Timedelta(days=window_days)
    in_win = sub[(sub["date"] >= cutoff) & (sub["date"] <= pd.Timestamp(as_of))]
    return in_win.groupby("market")["modal_price"].median().dropna()


def stl_eligible(df: pd.DataFrame, crop: str, variety: str | None,
                 as_of: date) -> list[str]:
    """Mandis whose weekly grid spans two full annual cycles, least-interpolated first."""
    settings = get_settings()
    sub = view_of(df, crop, variety, as_of=as_of)
    scored = []
    for market, group in sub.groupby("market"):
        c = coverage(group)
        if c["weeks"] >= settings.min_weeks:
            scored.append((market, c["imputed_frac"]))
    return [m for m, _ in sorted(scored, key=lambda t: (t[1], t[0]))]


# ------------------------------------------------------------------- provenance
def _provenance(df: pd.DataFrame, crop_mandis: pd.DataFrame, sel_df: pd.DataFrame,
                sel: Selection, n_quoting: int, meta: dict[str, str]) -> dict:
    last = df["date"].max()
    age = (pd.Timestamp.today().normalize() - last).days
    return {
        "rows_total": int(len(df)),
        "markets_total": int(df["market"].nunique()),
        "districts_total": int(df["district"].nunique()),
        "crops_total": int(df["commodity"].nunique()),
        "first_date": f"{df['date'].min():%Y-%m-%d}",
        "latest_date": f"{last:%Y-%m-%d}",
        "age_days": int(age),
        "stale": bool(age > 30),
        "rows_in_view": int(len(sel_df)),
        "markets_in_view": int(sel_df["market"].nunique()),
        "districts_in_view": int(sel_df["district"].nunique()),
        "crop_markets": int(crop_mandis["market"].nunique()),
        "n_quoting": int(n_quoting),
        "quote_window_days": int(sel.window_days),
        "as_of": pd.Timestamp(sel.as_of).strftime("%Y-%m-%d"),
        "crop": sel.crop,
        "variety": sel.variety,
        "source_file": meta.get("source_file"),
        "loaded_at": meta.get("loaded_at"),
        "no_arrivals_column": True,
    }


# ------------------------------------------------------------------------ M1
def _module1(df: pd.DataFrame, sel: Selection) -> dict:
    settings = get_settings()
    variety = None if sel.variety == "All" else sel.variety
    eligible = stl_eligible(df, sel.crop, variety, sel.as_of)
    out: dict = {
        "period": settings.stl_period,
        "min_weeks": settings.min_weeks,
        "eligible": eligible,
        "ref_mandi": sel.ref_mandi if sel.ref_mandi in eligible else None,
        "error": None,
        "imputed_warning": None,
    }
    if not eligible:
        out["error"] = (
            f"**{sel.crop}** has no mandi with two full annual cycles by "
            f"{pd.Timestamp(sel.as_of):%d %b %Y} (needs {settings.min_weeks} weekly points at "
            f"{settings.stl_period}-week seasonality). Tomato, Wheat and Rice are reported in "
            "this dump as a single partial season, so an annual decomposition is not "
            "estimable; hold-vs-sell is disabled rather than fitted to noise. Onion and "
            "Potato do support it."
        )
        return out

    ref_mandi = out["ref_mandi"] or eligible[0]
    out["ref_mandi"] = ref_mandi
    ref_df = view_of(df, sel.crop, sel.variety, ref_mandi, as_of=sel.as_of)
    cov = coverage(ref_df)
    bands = stl_bands(weekly_series(ref_df), period=settings.stl_period)
    path = price_path(bands, days=sel.horizon, use_lower=sel.conservative)
    proj = pd.date_range(bands.index.max(), periods=len(path), freq="D")

    series = pd.DataFrame({
        "date": bands.index.strftime("%Y-%m-%d"),
        "price": bands["price"].round(2).values,
        "trend": np.exp(bands["trend"]).round(2).values,
        "trend_seasonal": np.exp(bands["trend"] + bands["seasonal"]).round(2).values,
        "upper": bands["upper"].round(2).values,
        "lower": bands["lower"].round(2).values,
        "flag": bands["flag"].values,
    })
    seasonal = seasonal_index(bands)
    out.update({
        "coverage": cov,
        "strengths": {k: round(float(v), 4) for k, v in strengths(bands).items()},
        "glut_weeks": int((bands["flag"] == "GLUT").sum()),
        "spike_weeks": int((bands["flag"] == "SPIKE").sum()),
        "series": _records(series),
        "path": [{"date": d.strftime("%Y-%m-%d"), "p": round(float(p), 2)}
                 for d, p in zip(proj, path)],
        "seasonal_index": [{"month": int(m), "index": round(float(v), 4)}
                           for m, v in seasonal.items()],
        "path_start": round(float(path[0]), 2),
        "path_end": round(float(path[-1]), 2),
    })
    if cov["imputed_frac"] > 0.25:
        out["imputed_warning"] = (
            f"{ref_mandi} weekly grid is {cov['imputed_frac']:.0%} interpolated "
            f"({cov['observed']}/{cov['weeks']} weeks reported). Treat bands as soft."
        )
    return out


# ------------------------------------------------------------------------ M2
def _module2(df: pd.DataFrame, mandis: pd.DataFrame, sel: Selection, P: dict,
             prices: pd.Series) -> tuple[dict, pd.DataFrame]:
    dist_km = distances_for(sel.farm_lat, sel.farm_lon, mandis)
    rank = rank_mandis(sel.volume, prices, dist_km, P)
    rank = rank.merge(mandis[["market", "district", "lat", "lon", "source"]],
                      on="market", how="left")
    if rank.empty:
        return {"rows": [], "count": 0, "top": None, "board_top": None, "gap_per_qtl": None,
                "cost_walk": None}, rank

    top = rank.iloc[0]
    board_top = rank.loc[rank["board_price"].idxmax()]
    shrink_rate = P["freight"]["transit_shrink_per_km"] * float(top["km"])
    cost_walk = {
        "board_price": round(float(top["board_price"]), 2),
        "transit_loss": round(shrink_rate * float(top["board_price"]), 2),
        "freight": round(float(top["freight"]) / sel.volume, 2),
        "fees": round(float(top["fees"]) / sel.volume, 2),
        "handling": round(float(top["handling"]) / sel.volume, 2),
        "net_per_qtl": round(float(top["net_per_qtl"]), 2),
    }
    return {
        "rows": _records(rank.round(2)),
        "count": int(len(rank)),
        "top": {"market": str(top["market"]), "district": str(top["district"]),
                "km": round(float(top["km"]), 1),
                "board_price": round(float(top["board_price"]), 2),
                "net_per_qtl": round(float(top["net_per_qtl"]), 2),
                "rank_board": int(top["rank_board"]),
                "arbitrage_vs_nearest": round(float(top["arbitrage_vs_nearest"]), 2)},
        "board_top": {"market": str(board_top["market"]),
                      "board_price": round(float(board_top["board_price"]), 2),
                      "net_per_qtl": round(float(board_top["net_per_qtl"]), 2),
                      "rank_board": int(board_top["rank_board"])},
        "gap_per_qtl": round(float(top["net_per_qtl"] - board_top["net_per_qtl"]), 2),
        "cost_walk": cost_walk,
    }, rank


# ------------------------------------------------------------------------ M3
def _module3(P: dict, sel: Selection, path: list[float] | None) -> dict:
    if path is None:
        return {"available": False, "error": f"no {sel.crop} price path", "milp": None}
    s = P["storage"]
    delta_day = s["shrink_per_month"] / 30
    c_day = carry_cost_per_qtl_day(s, float(path[0]))
    be = breakeven_day(path, delta_day, c_day,
                       (s["enwr_fee_total"] + s["sale_fixed_cost"]) / sel.volume)
    milp = solve_hold_sell(sel.volume, np.asarray(path), delta_day, c_day,
                           s["sale_fixed_cost"], sel.volume * 0.1, 3, s["enwr_fee_total"])
    schedule = [{"day": int(day), "qtl_sold": round(float(q), 2),
                 "price": round(float(path[int(day)]), 2),
                 "gross": round(float(q) * float(path[int(day)]), 2)}
                for day, q in milp["schedule"]]
    return {
        "available": True,
        "error": None,
        "carry_per_qtl_day": round(c_day, 4),
        "shrink_per_day": round(delta_day, 6),
        "breakeven_day": be["breakeven_day"],
        "best_day": be["best_day"],
        "best_gain_per_qtl": round(float(be["best_gain_per_qtl"]), 2),
        "curve": [{"t": int(t), "v": round(float(v), 2)} for t, v in zip(be["t"], be["v"])],
        "milp": {"status": milp["status"],
                 "profit": round(float(milp["profit"]), 2) if milp["profit"] is not None else None,
                 "schedule": schedule},
    }


# ------------------------------------------------------------------------ M4
def _module4(mandis: pd.DataFrame, prices: pd.Series, sel: Selection,
             dist_km: pd.Series) -> dict:
    lots = make_lots(mandis, prices, sel.crop, n_farmers=sel.n_farmers, seed=11)
    for lot in lots:
        lot["km"] = float(dist_km.get(lot["market"], np.nan))
    lots = [lot for lot in lots if np.isfinite(lot["km"])]
    if not lots:
        return {"available": False, "error": f"no farmer pool for {sel.crop}", "lots": [],
                "order": sel.order, "pool_total": 0.0, "dp_surplus": None, "agg": None}
    agg = aggregate(lots, sel.order, eps=0.03, max_share=0.4)
    dp = dp_min_surplus([lot["qty"] * lot["count"] for lot in lots], int(sel.order))
    frame = to_frame(lots)
    frame["km"] = [lot["km"] for lot in lots]
    frame["selected"] = frame["id"].isin(set(agg["chosen"]))
    return {
        "available": True,
        "error": None,
        "lots": _records(frame.round(2)),
        "order": sel.order,
        "pool_total": round(sum(lot["qty"] * lot["count"] for lot in lots), 1),
        "dp_surplus": dp,
        "agg": {"status": agg["status"], "total": agg["total"], "surplus": agg["surplus"],
                "chosen": sorted(int(i) for i in agg["chosen"]),
                "chosen_count": len(agg["chosen"]),
                "dp_agrees": dp == agg["surplus"]},
    }


# ------------------------------------------------------------------ orchestrator
def build_meta(session: Session) -> dict:
    """Static description of what is in the database, for the frontend's selectors."""
    df = repo.read_prices(session)
    mandis = repo.read_mandis(session, require_coordinates=False)
    farms = repo.read_farms(session)
    distances = repo.read_farm_distances(session)
    meta = repo.get_dataset_meta(session)
    varieties: dict[str, list[str]] = {}
    for commodity, group in df.groupby("commodity"):
        varieties[str(commodity)] = sorted(str(v) for v in group["variety"].unique())
    return {
        "crops": sorted(str(c) for c in df["commodity"].unique()),
        "varieties": varieties,
        "date_min": f"{df['date'].min():%Y-%m-%d}",
        "date_max": f"{df['date'].max():%Y-%m-%d}",
        "rows_total": int(len(df)),
        "markets_total": int(df["market"].nunique()),
        "districts_total": int(df["district"].nunique()),
        "crops_total": int(df["commodity"].nunique()),
        "districts": sorted(str(d) for d in df["district"].unique()),
        "mandis_geo": int(mandis["lat"].notna().sum()),
        "mandis_centroid": int((mandis["source"] == "district_fallback").sum()),
        "farms": _records(farms),
        "default_farm": (_records(farms)[0] if len(farms) else None),
        "distance_rows": int(len(distances)),
        "distance_max_km": round(float(distances["km"].max()), 1) if len(distances) else None,
        "params": repo.get_params(session),
        "dataset": meta,
        "stl_period": get_settings().stl_period,
        "min_weeks": get_settings().min_weeks,
        "defaults": {"window_days": 14, "volume": 200.0, "horizon": 180, "n_farmers": 25,
                     "order": 400.0, "variety": "All", "conservative": False},
    }


def build_decision(session: Session, sel: Selection,
                   overrides: dict | None = None) -> dict:
    """The one endpoint the dashboard calls: everything for one selection."""
    key = json.dumps({"sel": asdict(sel), "ov": overrides or {}},
                     sort_keys=True, default=str)
    if key in _decision_cache:
        return _decision_cache[key]

    P = apply_overrides(repo.get_params(session), overrides)
    df = repo.read_prices(session)
    mandis = repo.read_mandis(session)
    meta = repo.get_dataset_meta(session)

    sel_df = view_of(df, sel.crop, sel.variety, as_of=sel.as_of)
    crop_mandis = df[(df["commodity"] == sel.crop) & (df["date"] <= pd.Timestamp(sel.as_of))]
    prices = latest_prices(df, sel.crop, None if sel.variety == "All" else sel.variety,
                           sel.as_of, sel.window_days)

    m1 = _module1(df, sel)
    m2, _ = _module2(df, mandis, sel, P, prices)
    # A thin crop has no annual decomposition, so M1 returns early with no price path.
    # M3 then reports `available: false` rather than fitting hold-vs-sell to noise.
    path_rows = m1.get("path") or []
    m3 = _module3(P, sel, [row["p"] for row in path_rows] or None)
    dist_km = distances_for(sel.farm_lat, sel.farm_lon, mandis)
    m4 = _module4(mandis, prices, sel, dist_km)

    payload = {
        "selection": {**asdict(sel), "as_of": pd.Timestamp(sel.as_of).strftime("%Y-%m-%d")},
        "params": P,
        "provenance": _provenance(df, crop_mandis, sel_df, sel, len(prices), meta),
        "cards": {"sell_at": m2["top"], "hold": m3, "bulk_order": m4.get("agg"),
                  "m1_error": m1["error"]},
        "m1": m1,
        "m2": m2,
        "m3": m3,
        "m4": m4,
    }
    if len(_decision_cache) >= MAX_DECISION_CACHE:
        _decision_cache.pop(next(iter(_decision_cache)))
    _decision_cache[key] = payload
    return payload
