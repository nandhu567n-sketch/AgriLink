import numpy as np, pandas as pd
from src.common.params import load_params
from src.data.synthetic import make
from src.m1_econometrics.stl_bands import weekly_series, stl_bands, price_path, seasonal_index
from src.m2_arbitrage.nihr import nihr
from src.m3_milp.breakeven import carry_cost_per_qtl_day, breakeven_day
from src.m3_milp.hold_sell import solve_hold_sell
from src.m4_aggregation.knapsack import aggregate, dp_min_surplus

P = load_params()

def test_m1_runs_and_projects():
    df = make(years=4)
    df = df[df.market == "Davangere"]
    out = stl_bands(weekly_series(df))
    assert {"trend", "seasonal", "lower", "upper", "flag"} <= set(out.columns)
    assert len(seasonal_index(out)) == 12
    assert len(price_path(out, days=90)) == 91

def test_m2_diesel_hurts_far_mandis():
    near = nihr(100, 2000, 20, P)["net_per_qtl"]
    far = nihr(100, 2000, 300, P)["net_per_qtl"]
    assert far < near
    P2 = {**P, "freight": {**P["freight"], "diesel_price": 200}}
    assert nihr(100, 2000, 300, P2)["net_per_qtl"] < far

def test_m3_no_cost_holds_to_peak_high_cost_sells_now():
    path = np.array([2000 + 5 * t for t in range(91)], dtype=float)
    free = breakeven_day(path, 0.0, 0.0)
    assert free["best_day"] == 90
    pricey = breakeven_day(path, 0.0, 50.0)
    assert pricey["best_day"] == 0 and pricey["breakeven_day"] is None
    c = carry_cost_per_qtl_day(P["storage"], 2000)
    assert c > 0

def test_m3_milp_sells_at_end_when_price_rises_and_costs_low():
    path = np.array([2000 + 5 * t for t in range(91)], dtype=float)
    r = solve_hold_sell(100, path, 0.0, 0.1, 0, 1, 3)
    assert r["status"] == "Optimal" and r["schedule"][-1][0] == 90

def test_m3_milp_sells_now_when_carry_huge():
    path = np.array([2000 + 5 * t for t in range(91)], dtype=float)
    r = solve_hold_sell(100, path, 0.0, 50.0, 0, 1, 3)
    assert r["schedule"][0][0] == 0

def test_m4_matches_dp():
    q = [37, 42, 55, 61, 23, 18, 90, 12, 76, 33]
    lots = [{"id": i, "qty": a} for i, a in enumerate(q)]
    r = aggregate(lots, 200, eps=1.0, max_share=1.0)   # eps large so only >=T binds
    assert r["surplus"] == dp_min_surplus(q, 200)
