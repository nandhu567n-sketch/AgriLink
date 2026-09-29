"""MODULE 2. Net In-Hand Realization per mandi."""
import math
import numpy as np, pandas as pd

def haversine_km(lat1, lon1, lat2, lon2, circuity=1.3):
    R = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi, dl = p2 - p1, math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return R * 2 * math.asin(math.sqrt(a)) * circuity

def nihr(Q, price, km, p: dict) -> dict:
    """Q qtl, price Rs/qtl at mandi, km road distance. p = params dict (see params.yaml)."""
    f, h, m = p["freight"], p["handling"], p["market"]
    r_km = f["diesel_price"] / f["mileage_kmpl"] + f["other_cost_per_km"]
    trucks = math.ceil(Q / f["truck_capacity_qtl"])
    freight = trucks * (f["fixed_per_trip"] + f["return_factor"] * r_km * km)
    shrink = f["transit_shrink_per_km"] * km
    gross = Q * (1 - shrink) * price
    fees = gross * (m["cess_frac"] + m["commission_frac"])
    handling = Q * (h["loading_per_qtl"] + h["unloading_per_qtl"]) + h["mandi_fixed_charge"]
    net = gross - fees - handling - freight
    return {"km": km, "board_price": price, "freight": freight, "fees": fees,
            "handling": handling, "transit_loss_qtl": Q * shrink,
            "net_total": net, "net_per_qtl": net / Q}

NIHR_COLS = ["market", "km", "board_price", "freight", "fees", "handling",
             "transit_loss_qtl", "net_total", "net_per_qtl",
             "rank_board", "arbitrage_vs_nearest"]

def rank_mandis(Q, prices: pd.Series, dist_km: pd.Series, p: dict) -> pd.DataFrame:
    rows = []
    for mk in prices.index.intersection(dist_km.index):
        r = nihr(Q, prices[mk], dist_km[mk], p); r["market"] = mk; rows.append(r)
    if not rows:
        # No mandi both quoted recently and geocoded. Return the empty frame with the
        # right columns so callers can branch on .empty instead of hitting a KeyError.
        return pd.DataFrame(columns=NIHR_COLS)
    df = pd.DataFrame(rows).sort_values("net_per_qtl", ascending=False).reset_index(drop=True)
    df["rank_board"] = df["board_price"].rank(ascending=False).astype(int)
    df["arbitrage_vs_nearest"] = df["net_total"] - df.loc[df["km"].idxmin(), "net_total"]
    return df
