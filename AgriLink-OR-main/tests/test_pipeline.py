"""Regression tests for the real-data pipeline (Karnataka slice of the Agmarknet dump).

These lock in the three bugs that would otherwise silently corrupt every number in the
dashboard: US-vs-day-first date parsing, the state filter, and crop/variety pooling.
"""
import sys
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from src.common.params import load_params
from src.data.farmers import make_lots
from src.data.load_history import parse_dates, read_source
from src.geo.geocode_mandis import base_name
from src.m1_econometrics.stl_bands import (coverage, price_path, stl_bands,
                                          weekly_series)
from src.m2_arbitrage.nihr import haversine_km, rank_mandis

CLEAN = ROOT / "data" / "raw" / "clean.parquet"
MANDIS = ROOT / "data" / "ref" / "mandis.csv"

pytestmark = pytest.mark.skipif(
    not CLEAN.exists(), reason="run `make history clean` first")


@pytest.fixture(scope="module")
def clean_df():
    return pd.read_parquet(CLEAN)


# --------------------------------------------------------------- ingest layer
def test_us_dates_are_not_read_day_first():
    """`6/13/2023` is 13 June, not 6 March. Day-first inference would mangle every
    ambiguous date in the dump (e.g. `9/8/2024` -> Aug 9 instead of Sep 8)."""
    got = parse_dates(pd.Series(["6/13/2023", "1/1/2024", "9/8/2024", "12/31/2024"]))
    assert got.dt.strftime("%Y-%m-%d").tolist() == [
        "2023-06-13", "2024-01-01", "2024-09-08", "2024-12-31"]
    assert parse_dates(pd.Series(["6/13/2023"])).notna().all()


def test_day_first_sources_still_parse():
    """Other Agmarknet exports use dd/mm/yyyy; the fallback chain must keep them working."""
    got = parse_dates(pd.Series(["13/06/2023", "01/01/2024"]))
    assert got.dt.strftime("%Y-%m-%d").tolist() == ["2023-06-13", "2024-01-01"]


def test_read_source_renames_the_real_header(tmp_path):
    """A file with the dump's exact header must satisfy read_source's column check."""
    raw = pd.DataFrame({
        "STATE": ["Karnataka"], "District Name": ["davangere"], "Market Name": ["Davangere"],
        "Commodity": ["Onion"], "Variety": ["Local"], "Grade": ["FAQ"],
        "Min_Price": [1500], "Max_Price": [2500], "Modal_Price": [2000],
        "Price Date": ["6/13/2023"],
    })
    p = tmp_path / "slice.csv"
    raw.to_csv(p, index=False)
    out = read_source(p)
    assert {"state", "district", "market", "commodity", "variety", "grade",
            "min_price", "max_price", "modal_price", "date"} <= set(out.columns)
    # read_source only normalises headers; load_history owns date parsing.
    assert out["date"].iloc[0] == "6/13/2023"
    assert parse_dates(out["date"]).iloc[0] == pd.Timestamp("2023-06-13")


def test_read_source_rejects_an_unrecognisable_header(tmp_path):
    p = tmp_path / "bad.csv"
    pd.DataFrame({"foo": [1], "bar": [2]}).to_csv(p, index=False)
    with pytest.raises(ValueError, match="missing required columns"):
        read_source(p)


# ---------------------------------------------------------------- clean layer
def test_only_karnataka_survives(clean_df):
    assert set(clean_df["state"].unique()) == {"Karnataka"}


def test_clean_contract(clean_df):
    for c in ["date", "state", "district", "market", "commodity", "variety",
              "modal_price"]:
        assert c in clean_df.columns, c
    assert clean_df["date"].notna().all()
    assert (clean_df["modal_price"] > 0).all()
    assert clean_df["date"].is_monotonic_increasing
    # one row per market-day-commodity-variety
    key = ["date", "market", "commodity", "variety"]
    assert not clean_df.duplicated(key).any()


def test_default_crop_in_params_actually_exists(clean_df):
    """params.yaml shipped with crop: Maize, which this dump has no rows for."""
    crop = load_params()["crop"]
    assert crop in set(clean_df["commodity"].unique()), (
        f"params.yaml crop {crop!r} is absent from the Karnataka slice")


def test_min_max_bracket_modal(clean_df):
    d = clean_df.dropna(subset=["min_price", "max_price"])
    assert (d["min_price"] <= d["modal_price"]).mean() > 0.95
    assert (d["modal_price"] <= d["max_price"]).mean() > 0.95


def test_rs_per_kg_unit_errors_are_dropped(clean_df):
    """The feed sometimes quotes Rs/kg, landing ~10x low (Shimoga onion at Rs 14 against
    a Rs 2,000 median). Such a quote would span x464 in one series and poison the STL."""
    med = clean_df.groupby(["market", "commodity"])["modal_price"].transform("median")
    assert (clean_df["modal_price"] >= 0.10 * med).all()
    shim = clean_df[(clean_df["market"] == "Shimoga") & (clean_df["commodity"] == "Onion")]
    assert shim["modal_price"].min() >= 1000, shim["modal_price"].min()


def test_genuine_upward_spikes_survive(clean_df):
    """Unit errors are one-directional. Real high prices (tomato at Rs 13,000/qtl in
    Karnataka) must not be clipped, or the guard would delete genuine signal."""
    tomato = clean_df[clean_df["commodity"] == "Tomato"]["modal_price"]
    assert tomato.max() > 5000, tomato.max()


# --------------------------------------------------------------- module 1
def test_stl_works_on_real_onion_history(clean_df):
    g = clean_df[(clean_df["commodity"] == "Onion") & (clean_df["market"] == "Davangere")]
    assert coverage(g)["weeks"] >= 104
    out = stl_bands(weekly_series(g), period=52)
    assert {"trend", "seasonal", "lower", "upper", "flag"} <= set(out.columns)
    assert (out["lower"] <= out["price"]).mean() > 0.8
    assert len(price_path(out, days=180)) == 181


def test_stl_eligible_mandi_series_have_sane_dispersion(clean_df):
    """Guards the class of bug the Rs/kg guard exists to prevent: one mandi whose weekly
    series spans orders of magnitude, which would drive a nonsense price path."""
    for crop in ["Onion", "Potato"]:
        sub = clean_df[clean_df["commodity"] == crop]
        for m, g in sub.groupby("market"):
            if coverage(g)["weeks"] < 104:
                continue
            s = weekly_series(g)
            assert s.max() / s.min() < 20, (crop, m, s.min(), s.max())


def test_stl_refuses_a_short_series():
    short = pd.Series(np.linspace(100, 200, 30), index=pd.date_range("2024-01-01", periods=30, freq="W"))
    with pytest.raises(ValueError, match="104 weekly points"):
        stl_bands(short, period=52)


def test_coverage_reports_imputation(clean_df):
    g = clean_df[(clean_df["commodity"] == "Onion") & (clean_df["market"] == "Davangere")]
    c = coverage(g)
    assert c["observed"] <= c["weeks"]
    assert 0.0 <= c["imputed_frac"] < 1.0


# --------------------------------------------------------------- module 2
def test_rank_mandis_empty_overlap_does_not_raise():
    """Thin crops used to crash the whole app here instead of showing 'no quotes'."""
    out = rank_mandis(200, pd.Series(dtype=float), pd.Series(dtype=float), load_params())
    assert out.empty
    assert "net_per_qtl" in out.columns


def test_rank_mandis_ranks_by_net_not_board(clean_df):
    P = load_params()
    g = clean_df[(clean_df["commodity"] == "Onion") & (clean_df["market"] == "Davangere")]
    recent = g[g["date"] >= g["date"].max() - pd.Timedelta(days=14)]
    prices = recent.groupby("market")["modal_price"].median()
    dist = pd.Series({m: haversine_km(14.30, 76.00, 15.36, 75.12) for m in prices.index})
    out = rank_mandis(200, prices, dist, P)
    assert list(out["net_per_qtl"]) == sorted(out["net_per_qtl"], reverse=True)
    assert out["rank_board"].is_monotonic_decreasing


# --------------------------------------------------------------- module 4
def test_lot_roster_is_deterministic_and_priced(clean_df):
    if not MANDIS.exists():
        pytest.skip("run `make geocode` first")
    mandis = pd.read_csv(MANDIS).dropna(subset=["lat", "lon"])
    g = clean_df[(clean_df["commodity"] == "Onion") & (clean_df["market"] == "Davangere")]
    recent = g[g["date"] >= g["date"].max() - pd.Timedelta(days=14)]
    prices = recent.groupby("market")["modal_price"].median()
    a = make_lots(mandis, prices, "Onion", n_farmers=20, seed=11)
    b = make_lots(mandis, prices, "Onion", n_farmers=20, seed=11)
    assert [l["qty"] for l in a] == [l["qty"] for l in b]
    assert len({l["id"] for l in a}) == 20
    assert all(l["grade"] in (1, 2, 3) for l in a)
    assert all(9.0 <= l["moisture"] <= 16.5 for l in a)


def test_base_name_strips_market_suffixes():
    assert base_name("Hubli (Amaragol)") == "Hubli"
    assert base_name("Mysore (Bandipalya)") == "Mysore"
    assert base_name("Shivamogga") == "Shivamogga"


@pytest.mark.skipif(not MANDIS.exists(), reason="run `make geocode` first")
def test_all_geocoded_mandis_sit_inside_karnataka():
    m = pd.read_csv(MANDIS).dropna(subset=["lat", "lon"])
    assert len(m) >= 60
    assert m["lat"].between(11.5, 18.6).all()
    assert m["lon"].between(73.9, 78.7).all()
