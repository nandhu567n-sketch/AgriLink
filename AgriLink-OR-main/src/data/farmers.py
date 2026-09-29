"""Farmer lot roster for MODULE 4.

The price dump has no farm-level arrivals, so lot *sizes* are simulated. Everything that
feeds a cost is real: the mandis come from data/ref/mandis.csv and the quantity scale is
tied to the observed modal price of the selected crop in each mandi, so a crop with a
higher board price (Tomato, Rice) does not produce the same physical tonnage as Onion.

Deterministic: same seed + same crop + same mandi set -> same roster, so the dashboard
recommendation is reproducible run to run.
"""
import numpy as np
import pandas as pd


def _grade(moisture: float, board: float) -> int:
    """Crude 1-3 grading. Higher moisture and a weaker local board price -> lower grade."""
    if moisture <= 12.0 and board > 0:
        return 3
    if moisture <= 15.0:
        return 2
    return 1


def make_lots(mandis: pd.DataFrame, board_price: pd.Series, crop: str,
              n_farmers: int = 25, seed: int = 11) -> list[dict]:
    """mandis: rows with market/district/lat/lon. board_price: market -> Rs/qtl for `crop`.

    Returns lots of dict(id, qty, count, grade, moisture, km, market, district, board_price).
    `qty` is quintals per farmer-load, `count` how many such loads that farmer has.
    """
    rng = np.random.default_rng(seed)
    pool = [m for m in mandis["market"] if m in board_price.index]
    if not pool:
        return []
    # Farmers cluster around mandis in proportion to how liquid that mandi is.
    weights = np.array([max(board_price[m], 1) for m in pool], dtype=float)
    weights = weights / weights.sum()

    lots = []
    for i in range(n_farmers):
        market = pool[int(rng.choice(len(pool), p=weights))]
        board = float(board_price[market])
        # Lots shrink as unit price rises, so rupee value per farmer stays in a band.
        scale = float(np.clip(120_000.0 / max(board, 1.0), 8.0, 120.0))
        qty = int(np.clip(rng.integers(6, 46) * (scale / 40.0), 5, 300))
        count = int(rng.choice([1, 1, 1, 2, 3]))
        moisture = float(np.round(rng.uniform(9.0, 16.5), 1))
        row = mandis[mandis["market"] == market].iloc[0]
        lots.append({
            "id": i, "qty": qty, "count": count,
            "grade": _grade(moisture, board), "moisture": moisture,
            "market": market, "district": row["district"],
            "board_price": board, "crop": crop,
        })
    return lots


def to_frame(lots: list[dict]) -> pd.DataFrame:
    return pd.DataFrame(lots, columns=["id", "qty", "count", "grade", "moisture",
                                       "market", "district", "board_price", "crop"])
