"""DEMO DATA ONLY so you can build the UI before real data lands.
Never present this as real data in the submission."""
import numpy as np, pandas as pd
from pathlib import Path

MANDIS = {  # approx city-centre coords, verify with geocoder
    "Davangere": (14.4644, 75.9218), "Hubballi": (15.3647, 75.1240),
    "Bengaluru": (12.9716, 77.5946), "Shivamogga": (13.9299, 75.5681),
    "Haveri": (14.7951, 75.4045), "Ranebennur": (14.6190, 75.6350),
    "Gadag": (15.4166, 75.6270), "Chitradurga": (14.2251, 76.3980),
}

def make(seed=7, years=5):
    rng = np.random.default_rng(seed)
    days = pd.date_range(end=pd.Timestamp.today().normalize(), periods=365 * years)
    t = np.arange(len(days))
    base = 1700 + 0.6 * t + 250 * np.sin(2 * np.pi * (t / 365.25) - 1.2)
    rows = []
    for k, (m, _) in enumerate(MANDIS.items()):
        off = rng.normal(0, 60)
        p = base + off + rng.normal(0, 40, len(t)) + k * 5
        arr = np.clip(120 + 60 * np.cos(2 * np.pi * (t / 365.25) - 1.2) + rng.normal(0, 25, len(t)), 5, None)
        rows.append(pd.DataFrame({"date": days, "state": "Karnataka", "district": m,
                                  "market": m, "variety": "Hybrid", "modal_price": p.round(0),
                                  "arrivals_t": arr.round(1)}))
    df = pd.concat(rows, ignore_index=True)
    Path("data/raw").mkdir(parents=True, exist_ok=True)
    df.to_parquet("data/raw/clean_demo.parquet", index=False)
    print("demo data written (SYNTHETIC)")
    return df

if __name__ == "__main__":
    make()
