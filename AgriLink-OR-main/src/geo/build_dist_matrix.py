"""Farm -> mandi distance matrix, cached to parquet.

Two engines:
  haversine (default, Plan B) -- straight line * circuity. No network, no OSM download,
      instant. Good enough for ranking mandis when the price spread is large.
  osmnx (opt-in, Plan A)      -- real road Dijkstra on a filtered Karnataka graph.
      Slow (multi-minute download) and the graph is large, so it is not on the default
      path; it exists to verify that haversine ordering is sane before submission.

`km` from here feeds the freight term in m2_arbitrage.nihr.
"""
from pathlib import Path

import pandas as pd

from src.m2_arbitrage.nihr import haversine_km

# Default FPO origin: Davangere/Tumkur belt, one of Karnataka's densest onion regions.
DEFAULT_FARM = {"farm_id": "fpo_davangere", "name": "FPO Davangere depot",
                "lat": 14.30, "lon": 76.00}
CIRCUITY = 1.3


def _haversine_matrix(farms: pd.DataFrame, mandis: pd.DataFrame, circuity=CIRCUITY):
    rows = []
    for _, f in farms.iterrows():
        for _, m in mandis.iterrows():
            rows.append({"farm_id": f["farm_id"], "market": m["market"],
                         "district": m["district"],
                         "km": round(haversine_km(f["lat"], f["lon"],
                                                  m["lat"], m["lon"], circuity), 2)})
    return pd.DataFrame(rows)


def _osmnx_matrix(farms: pd.DataFrame, mandis: pd.DataFrame, place="Karnataka, India"):
    import networkx as nx
    import osmnx as ox

    cf = '["highway"~"motorway|trunk|primary|secondary"]'   # keep graph small
    G = ox.graph_from_place(place, custom_filter=cf, simplify=True)
    f_nodes = ox.distance.nearest_nodes(G, farms["lon"].values, farms["lat"].values)
    m_nodes = ox.distance.nearest_nodes(G, mandis["lon"].values, mandis["lat"].values)
    rows = []
    for _, f in farms.iterrows():
        lengths = nx.single_source_dijkstra_path_length(G, f_nodes[f.name], weight="length")
        for (_, m), mn in zip(mandis.iterrows(), m_nodes):
            km = lengths.get(mn, float("nan")) / 1000
            rows.append({"farm_id": f["farm_id"], "market": m["market"],
                         "district": m["district"], "km": round(km, 2)})
    return pd.DataFrame(rows)


def build(farms: pd.DataFrame | None = None, mandis: pd.DataFrame | None = None,
          engine="haversine", out="data/ref/dist_matrix.parquet"):
    if mandis is None:
        mandis = pd.read_csv("data/ref/mandis.csv").dropna(subset=["lat", "lon"])
    if farms is None:
        farms = pd.DataFrame([DEFAULT_FARM])
    fn = _osmnx_matrix if engine == "osmnx" else _haversine_matrix
    df = fn(farms, mandis)
    Path(out).parent.mkdir(parents=True, exist_ok=True)
    df.to_parquet(out, index=False)
    print(f"{engine}: {df['farm_id'].nunique()} farm(s) x {df['market'].nunique()} mandis, "
          f"max {df['km'].max():.0f} km -> {out}")
    return df


def distances_for(farm_lat, farm_lon, mandis: pd.DataFrame, circuity=CIRCUITY) -> pd.Series:
    """On-the-fly distances for an arbitrary farm point picked in the UI."""
    return pd.Series(
        {r["market"]: haversine_km(farm_lat, farm_lon, r["lat"], r["lon"], circuity)
         for _, r in mandis.iterrows() if pd.notna(r["lat"])},
        dtype=float,
    ).sort_values()


if __name__ == "__main__":
    build()
