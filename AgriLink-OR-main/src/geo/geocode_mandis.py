"""Run ONCE. Geocode the Karnataka mandi names -> data/ref/mandis.csv.

The dump's market names are messy (`Hubli (Amaragol)`, `Mysore (Bandipalya)`,
`Doddaballa Pur`), so the search drops the parenthetical and retries a few
phrasings before falling back to the district centroid. Everything is cached to
CSV: re-running only geocodes rows that are still missing a coordinate.
Hand-verify ~10 rows on a map before trusting the distances.
"""
import re
import time
from pathlib import Path

import pandas as pd
import requests

OUT = Path("data/ref/mandis.csv")
NOMINATIM = "https://nominatim.openstreetmap.org/search"
HEADERS = {"User-Agent": "agrilink-or-research/1.0 (FPO decision-support coursework)"}
STATE = "Karnataka"


def base_name(market: str) -> str:
    """`Hubli (Amaragol)` -> `Hubli`."""
    return re.sub(r"\s*\([^)]*\)\s*", "", str(market)).strip()


def _get(session, params):
    try:
        r = session.get(NOMINATIM, params={**params, "format": "json", "limit": 1}, timeout=25)
        if r.status_code != 200:
            return None
        hit = r.json()
        return (float(hit[0]["lat"]), float(hit[0]["lon"])) if hit else None
    except requests.RequestException:
        return None


def lookup(session, market, district, state=STATE):
    """Market-level lookup with a few phrasings, then the district as fallback."""
    b = base_name(market)
    queries = [
        f"{b} APMC market, {district}, {state}, India",
        f"{b}, {district}, {state}, India",
        f"{b}, {state}, India",
    ]
    for q in queries:
        loc = _get(session, {"q": q})
        if loc:
            return loc, "market"
        time.sleep(1.1)  # Nominatim policy: max 1 req/s
    for q in (f"{district} district, {state}, India", f"{district}, {state}, India"):
        loc = _get(session, {"q": q})
        if loc:
            return loc, "district_fallback"
        time.sleep(1.1)
    return None, "missing"


def geocode(state=STATE, path="data/raw/clean.parquet", out=OUT, only_missing=True):
    df = pd.read_parquet(path)
    df = df[df["state"].str.casefold() == state.casefold()]
    mandis = (df[["market", "district"]]
              .drop_duplicates()
              .sort_values(["district", "market"])
              .reset_index(drop=True))

    prev = pd.DataFrame()
    if only_missing and out.exists():
        prev = pd.read_csv(out)

    todo = mandis
    if only_missing and len(prev):
        have = set(zip(prev["market"], prev["district"]))
        keep = [(m, d) not in have for m, d in zip(mandis["market"], mandis["district"])]
        todo = mandis[keep]
        if not len(todo):
            print(f"all {len(mandis)} mandis already geocoded -> {out}")
            return prev

    print(f"geocoding {len(todo)} markets with {len(mandis) - len(todo)} cached "
          f"(~{(len(todo) * 2) / 60:.1f} min at Nominatim's 1 req/s limit)")

    session = requests.Session()
    session.headers.update(HEADERS)
    rows = []
    for i, r in todo.iterrows():
        (lat, lon), src = lookup(session, r["market"], r["district"], state)
        rows.append({"market": r["market"], "district": r["district"],
                     "lat": lat, "lon": lon, "source": src})
        flag = "" if lat is not None else "  <-- NO MATCH"
        print(f"[{i + 1}/{len(todo)}] {r['market']} ({r['district']}): {src}{flag}", flush=True)

    new = pd.DataFrame(rows)
    out_df = new if prev.empty else (pd.concat([prev, new], ignore_index=True)
                                     .drop_duplicates(["market", "district"], keep="last"))
    Path(out).parent.mkdir(parents=True, exist_ok=True)
    out_df.to_csv(out, index=False)

    ok = out_df["lat"].notna().sum()
    print(f"\n{ok}/{len(out_df)} located -> {out}")
    if ok < len(out_df):
        print("unlocated: " + ", ".join(out_df.loc[out_df["lat"].isna(), "market"]))
    return out_df


if __name__ == "__main__":
    geocode()
