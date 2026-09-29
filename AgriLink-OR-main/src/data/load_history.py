"""HISTORY loader. Reads the Agmarknet price dump(s) and caches a parquet.

Primary source for this build is the repo-root dump `Agriculture_price_dataset.csv`.
Its header is:
    STATE,District Name,Market Name,Commodity,Variety,Grade,Min_Price,Max_Price,Modal_Price,Price Date

`Price Date` in that file is US-style `M/D/YYYY` (e.g. `6/13/2023` = 13 June 2023), so the
date format is pinned in DATE_FORMAT instead of relying on day-first inference. Several
other Agmarknet exports use `dd/mm/yyyy`, hence the candidate list below.

Any extra CSVs dropped into data/raw/history/ are concatenated and renamed with the same
map, so mixing sources still works as long as the header is a superset of RENAME.
"""
import glob
import pandas as pd

RENAME = {   # source column -> our column
    "STATE": "state", "State Name": "state", "State": "state",
    "District Name": "district", "District": "district",
    "Market Name": "market", "Market": "market",
    "Commodity": "commodity",
    "Variety": "variety", "Grade": "grade",
    "Min_Price": "min_price", "Min Price (Rs./Quintal)": "min_price",
    "Max_Price": "max_price", "Max Price (Rs./Quintal)": "max_price",
    "Modal_Price": "modal_price", "Modal Price (Rs./Quintal)": "modal_price",
    "Price Date": "date", "Reported Date": "date", "Arrival_Date": "date",
    "Arrivals (Tonnes)": "arrivals_t", "Arrivals_Tonnes": "arrivals_t",
}

# Tried in order. The first format that parses the whole column wins.
DATE_FORMATS = ["%m/%d/%Y", "%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y"]


def read_source(path) -> pd.DataFrame:
    """Read one source file and normalise its header to our column contract."""
    df = pd.read_csv(path)
    df = df.rename(columns=RENAME)
    missing = {"date", "state", "market", "modal_price"} - set(df.columns)
    if missing:
        raise ValueError(f"{path}: missing required columns {sorted(missing)}")
    if "date" not in df.columns:
        raise ValueError(f"{path}: no date column")
    return df


def parse_dates(series: pd.Series) -> pd.Series:
    """Pin an explicit format instead of guessing, so 6/13/2023 is never read as 13 June."""
    for fmt in DATE_FORMATS:
        parsed = pd.to_datetime(series, format=fmt, errors="coerce")
        if parsed.notna().all():
            return parsed
    # Mixed formats inside one file: parse per-value with the first format that hits.
    parsed = pd.Series(pd.NaT, index=series.index, dtype="datetime64[ns]")
    for fmt in DATE_FORMATS:
        todo = parsed.isna()
        if not todo.any():
            break
        parsed.loc[todo] = pd.to_datetime(series.loc[todo], format=fmt, errors="coerce")
    return parsed


def load_history(pattern="data/raw/history/*.csv",
                 extra=["Agriculture_price_dataset.csv"],
                 out="data/raw/agmarknet_history.parquet"):
    paths = [p for p in glob.glob(pattern) if p != out]
    # Explicit extras first so their (wider) column set survives the concat.
    for p in extra:
        if glob.glob(p):
            paths.insert(0, p)
    if not paths:
        raise FileNotFoundError(
            f"no history files matched {pattern} and none of {extra} exist")

    frames = [read_source(p) for p in paths]
    df = pd.concat(frames, ignore_index=True)
    df["date"] = parse_dates(df["date"])
    n_bad = int(df["date"].isna().sum())
    if n_bad:
        print(f"warning: {n_bad} rows dropped, date unparseable in {[f for f in paths]}")
    df = df[df["date"].notna()]
    df.to_parquet(out, index=False)
    print(f"sources: {paths}")
    print(f"saved {len(df)} rows, "
          f"{df['date'].min().date()} -> {df['date'].max().date()} -> {out}")
    return df


if __name__ == "__main__":
    load_history()
