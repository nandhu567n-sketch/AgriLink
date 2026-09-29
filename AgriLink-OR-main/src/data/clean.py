"""raw -> clean. Contract for every module:

    date, state, district, market, commodity, variety, grade,
    modal_price (Rs/qtl, > 0), arrivals_t (optional -- absent in this dump)

`date` is already parsed by load_history; we still coerce defensively so clean() is
safe to call on a raw frame from any other source.
"""
import pandas as pd

from src.data.load_history import parse_dates

STATE = "Karnataka"
TEXT = ["state", "district", "market", "commodity", "variety", "grade"]

# Unit-error floor. The feed intermittently reports a mandi-commodity in Rs/kg instead of
# Rs/qtl, which lands ~10x low (Shimoga onion quoted at Rs 14 against a Rs 2,000 median).
# Left in, that single series spans x464 and poisons the STL bands and the price path.
# A quote below this fraction of its own mandi-commodity median is dropped.
#
# Only the low side is guarded: unit errors are always downward, whereas genuine upward
# spikes are real (tomato does trade at Rs 13,000/qtl in Karnataka), so clipping the high
# side would delete signal. 0.10 removes all 36 unit errors and leaves genuine glut weeks
# intact; 0.20 starts eating real tomato lows, so the floor stays tight.
UNIT_ERROR_FLOOR = 0.10


def clean(path="data/raw/agmarknet_history.parquet", out="data/raw/clean.parquet",
          state=STATE, unit_error_floor=UNIT_ERROR_FLOOR):
    df = pd.read_parquet(path)
    df["date"] = parse_dates(df["date"]) if df["date"].dtype == object else pd.to_datetime(df["date"])

    for c in ["min_price", "max_price", "modal_price", "arrivals_t"]:
        if c in df:
            df[c] = pd.to_numeric(df[c], errors="coerce")

    for c in TEXT:
        if c in df:
            # The dump has sloppy whitespace and case (" Punjab", "Karnataka "). Normalise.
            df[c] = df[c].astype(str).str.strip()
    if "commodity" in df:
        df["commodity"] = df["commodity"].str.title()
    if "grade" in df:
        df["grade"] = df["grade"].str.replace(r"\s+", " ", regex=True).str.strip()

    # State filter before anything else -- the dump mixes 31 states and has variants
    # like "Karnataka" vs "karnataka".
    if "state" in df:
        df = df[df["state"].str.casefold() == state.casefold()]

    df = df.dropna(subset=["date", "market", "modal_price"]).query("modal_price > 0")

    # One row per market-day-commodity-variety. The dump has no arrivals column, so
    # median is the right reducer when a mandi reports the same variety twice a day.
    keys = [k for k in ["date", "market", "commodity", "variety"] if k in df]
    df = (df.groupby(keys, as_index=False)
            .agg(state=("state", "first"), district=("district", "first"),
                 grade=("grade", "first"), min_price=("min_price", "median"),
                 max_price=("max_price", "median"),
                 modal_price=("modal_price", "median"))
            .sort_values(keys))

    n_before = len(df)
    floor = (df.groupby(["market", "commodity"])["modal_price"]
               .transform("median") * unit_error_floor)
    df = df[df["modal_price"] >= floor]
    n_dropped = n_before - len(df)

    df.to_parquet(out, index=False)
    print(f"clean rows: {len(df)}  {df['date'].min().date()} -> {df['date'].max().date()}")
    print(f"markets: {df['market'].nunique()}  districts: {df['district'].nunique()}")
    print(f"dropped {n_dropped} unit-error quotes "
          f"(modal < {unit_error_floor:.0%} of mandi-commodity median)")
    print("commodities:\n" + df["commodity"].value_counts().to_string())
    print(f"-> {out}")
    return df


if __name__ == "__main__":
    clean()
