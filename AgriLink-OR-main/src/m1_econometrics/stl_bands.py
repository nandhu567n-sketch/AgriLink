"""MODULE 1. Weekly log-price STL + rolling volatility bands on the residual."""
import numpy as np, pandas as pd
from statsmodels.tsa.seasonal import STL

def weekly_series(df: pd.DataFrame, col="modal_price") -> pd.Series:
    """Weekly median on a regular Sunday grid, gaps filled by linear interpolation.

    A mandi in this dump reports in bursts with holes of up to ~4 weeks, so a short
    `interpolate(limit=...)` used to shred the series below the 104 points a 52-week STL
    needs. Filling the whole grid and reporting the imputed share via `coverage` keeps
    the decomposition honest instead of silently shrinking the sample.
    """
    s = df.set_index("date")[col].resample("W").median()
    return s.interpolate(limit_direction="both").dropna()


def coverage(df: pd.DataFrame, col="modal_price") -> dict:
    """Share of the weekly grid that had to be interpolated. Surfaced in the UI so an
    imputed STL is not mistaken for a fully observed one."""
    s = df.set_index("date")[col].resample("W").median()
    obs = s.notna().sum()
    return {"weeks": int(len(s)), "observed": int(obs),
            "imputed_frac": round(1.0 - obs / len(s), 3) if len(s) else None}

def stl_bands(weekly: pd.Series, period=52, window=12, k=2.0) -> pd.DataFrame:
    if len(weekly) < 2 * period:
        raise ValueError(
            f"STL with period={period} needs at least {2 * period} weekly points, "
            f"got {len(weekly)}")
    y = np.log(weekly)
    res = STL(y, period=period, robust=True).fit()
    out = pd.DataFrame({"price": weekly, "trend": res.trend, "seasonal": res.seasonal, "resid": res.resid})
    mu = out["resid"].rolling(window).mean()
    sd = out["resid"].rolling(window).std()
    out["z"] = (out["resid"] - mu) / sd
    base = out["trend"] + out["seasonal"]
    out["upper"] = np.exp(base + mu + k * sd)
    out["lower"] = np.exp(base + mu - k * sd)
    out["flag"] = np.where(out["z"] < -k, "GLUT", np.where(out["z"] > k, "SPIKE", ""))
    return out

def strengths(out: pd.DataFrame) -> dict:
    r, s, t = out["resid"], out["seasonal"], out["trend"]
    return {"F_seasonal": max(0, 1 - r.var() / (s + r).var()),
            "F_trend": max(0, 1 - r.var() / (t + r).var())}

def seasonal_index(out: pd.DataFrame) -> pd.Series:
    return np.exp(out["seasonal"]).groupby(out.index.month).mean()

def price_path(out: pd.DataFrame, days=180, trend_weeks=26, use_lower=False) -> np.ndarray:
    """Deterministic projection p(d), d=0..days. Trend slope by OLS, seasonal repeated (period 52 wks)."""
    n = len(out)
    tr = out["trend"].iloc[-trend_weeks:].values
    slope_w = np.polyfit(np.arange(len(tr)), tr, 1)[0]          # log-units per week
    last_t = out["trend"].iloc[-1]
    seas = out["seasonal"].values
    p = []
    for d in range(days + 1):
        w = d / 7.0
        idx = n - 52 + int(round(w)) if n >= 52 else n - 1
        s = seas[idx % n] if idx < n else seas[(idx - 52) % n]
        p.append(np.exp(last_t + slope_w * w + s))
    p = np.array(p)
    if use_lower:
        gap = (out["price"] - out["lower"]).iloc[-26:].clip(lower=0).mean() / out["price"].iloc[-26:].mean()
        p = p * (1 - gap)
    return p
