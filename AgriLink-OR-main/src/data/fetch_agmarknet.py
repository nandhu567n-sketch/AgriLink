"""LIVE feed: data.gov.in current daily prices. NOT history. Use for latest week + demo freshness.
Fields (verify on first call): State, District, Market, Commodity, Variety, Grade,
Arrival_Date (dd/mm/yyyy), Min_Price, Max_Price, Modal_Price   (Rs/quintal)
"""
import os, time, requests, pandas as pd
from dotenv import load_dotenv
load_dotenv()
URL = "https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070"

def fetch(state="Karnataka", commodity="Onion", limit=500, out="data/raw/agmarknet_live.parquet"):
    key = os.environ["DATA_GOV_KEY"]
    rows, offset = [], 0
    while True:
        r = requests.get(URL, params={
            "api-key": key, "format": "json", "limit": limit, "offset": offset,
            "filters[State]": state, "filters[Commodity]": commodity}, timeout=30)
        r.raise_for_status()
        recs = r.json().get("records", [])
        if not recs:
            break
        rows += recs; offset += limit; time.sleep(0.5)
    df = pd.DataFrame(rows)
    df.to_parquet(out, index=False)
    print(f"saved {len(df)} rows -> {out}")
    return df

if __name__ == "__main__":
    fetch()
