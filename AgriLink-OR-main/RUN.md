# RUN.md — operating instructions

Every command is given twice where a `make` target exists: once as a target and once as the
raw Python equivalent. **Use the raw commands if `make` is not on your PATH** — it is not
installed on stock Windows, so run these from PowerShell or cmd at the repo root.

Verified on: Python 3.11.9, Windows 11, pandas 3.0.5, numpy 2.4.6, statsmodels 0.15.0,
PuLP 2.9.0, plotly 7.1.0, streamlit 1.64.0, FastAPI 0.141.1, Starlette 1.6.0, Pydantic
2.13.5, Uvicorn 0.54.0, httpx 0.28.1, SQLAlchemy 2.0.41, psycopg2 2.9.13.

---

## 0. Prerequisites

| Need | Why | Check |
|---|---|---|
| Python 3.11+ | `X \| Y` union syntax; 3.11 is the tested floor | `python --version` |
| PostgreSQL 14+ | the default backend target | `psql --version` |
| `make` *(optional)* | only to use the Makefile shortcuts | `make --version` |
| Internet, ~2 min | Nominatim geocoding, one time only | — |

**SQLite is a supported fallback.** If you have no PostgreSQL, skip §3 and set
`DATABASE_URL=sqlite:///./data/agrilink_dev.db` — everything else in this document works
unchanged.

`make` is optional. Every `make X` line below has a plain `python` equivalent.

---

## 1. Install

```bash
pip install -r requirements.txt
```

Equivalent: `make setup`

> The optional road-distance check needs extra packages that are deliberately **not** in
> `requirements.txt` because they are large and unused by default:
> `pip install osmnx networkx geopandas shapely`

---

## 2. Build the pipeline (run once, ~3 minutes)

Run in this order — each step writes the file the next one reads.

### 2a. Ingest the source CSV → parquet
```bash
python -m src.data.load_history
```
`make history`

Reads `Agriculture_price_dataset.csv` (737,392 rows), normalises the header, and pins the
date format. Expected:
```
sources: ['Agriculture_price_dataset.csv']
saved 737392 rows, 2023-06-06 -> 2025-06-11 -> data/raw/agmarknet_history.parquet
```
→ writes `data/raw/agmarknet_history.parquet`

### 2b. Clean → Karnataka only
```bash
python -m src.data.clean
```
`make clean`

Filters to Karnataka, drops non-positive prices, removes duplicates and quarantines Rs/kg unit
errors. Expected:
```
clean rows: 14352  2023-06-06 -> 2025-06-11
markets: 72  districts: 21
dropped 39 unit-error quotes (modal < 10% of mandi-commodity median)
commodities:
Onion 6330 / Potato 5174 / Tomato 1411 / Wheat 1082 / Rice 355
```
→ writes `data/raw/clean.parquet`

### 2c. Geocode the 72 mandis (slowest step)
```bash
python -m src.geo.geocode_mandis
```
`make geocode`

Queries Nominatim at its 1 request/second policy limit, so **~2–3 minutes for 72 mandis**.
Results cache to `data/ref/mandis.csv`; re-running only fetches rows it does not already
have, so it returns instantly. Expected:
```
72/72 located -> data\ref\mandis.csv
```
→ writes `data/ref/mandis.csv` — 59 resolved to the market itself (`source = market`), 13 pinned
to their district centroid (`source = district_fallback`)

### 2d. Distance matrix
```bash
python -m src.geo.build_dist_matrix
```
`make distmat`

Expected:
```
haversine: 1 farm(s) x 72 mandis, max 562 km -> data/ref/dist_matrix.parquet
```
→ writes `data/ref/dist_matrix.parquet`

### All four at once
```bash
make data
```
or without make:
```bash
python -m src.data.load_history && python -m src.data.clean && python -m src.geo.geocode_mandis && python -m src.geo.build_dist_matrix
```

---

## 3. The database (backend)

The pipeline writes files; the backend serves from a **database**. The two are separate steps
on purpose — the artefacts are the audit trail, the database is what the API queries.

### 3a. PostgreSQL (default target)

Create the role and database once:

```sql
CREATE ROLE agrilink LOGIN PASSWORD 'agrilink';
CREATE DATABASE agrilink OWNER agrilink;
```

The tables themselves are created by the loader, so there is no schema script to run.

Point the app at it:

```bash
# Windows PowerShell
$env:DATABASE_URL="postgresql+psycopg2://agrilink:agrilink@localhost:5432/agrilink"

# Linux / macOS
export DATABASE_URL="postgresql+psycopg2://agrilink:agrilink@localhost:5432/agrilink"
```

Or put it in `.env` (see `.env.example`), which `backend/config.py` reads automatically at
import time.

### 3b. SQLite (zero-setup alternative)

No server, no role, no password:

```bash
# Windows PowerShell
$env:DATABASE_URL="sqlite:///./data/agrilink_dev.db"
```

Everything else is identical. Use `--reset` to rebuild the file from scratch.

### 3c. Load the data

```bash
python -m backend.seed.load_db --reset
```
`make reset-db` · without the reset flag: `make load-db`

Expected:
```
target   : sqlite  sqlite:///./data/agrilink_dev.db
reset    : dropping prices, mandis, farms, farm_distances, params, dataset_meta
loaded   : prices=14,352 mandis=72 farm_distances=72 params=1 meta=9
coverage : 2023-06-06 -> 2025-06-11 | 72 mandis | 5 crops
done. start the API with:  make backend
```

| Flag | Effect |
|---|---|
| *(none)* | create tables if missing, then truncate and reload |
| `--reset` | `drop_all` first, then reload — use this after changing the schema |
| `--build-missing` | run `load_history` → `clean` → `geocode_mandis` → `build_dist_matrix` for any missing artefact, then load |

`--build-missing` is the one-shot command if you skipped §2:

```bash
python -m backend.seed.load_db --reset --build-missing
```

---

## 4. The API (backend)

```bash
uvicorn backend.main:app --reload --port 8000
```
`make backend`

Serves interactive docs at **<http://localhost:8000/docs>**; `/` redirects there. Equivalent
to running the module directly:

```bash
python -m backend.main     # uses API_HOST / API_PORT from config.py
```

Set `API_CORS_ORIGINS` (comma-separated) if a browser client on another origin needs to call
it. The defaults are `http://localhost:8501` and `http://127.0.0.1:8501`.

### 4a. The routes

Eleven operations across ten paths:

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | is the API up, and is the database loaded |
| GET | `/api/meta` | crops, varieties, dates, farms, assumptions, provenance |
| GET | `/api/decision` | **the main one** — three cards + full M1–M4 |
| GET | `/api/m1` | M1 decomposition, bands, GLUT/SPIKE flags, price path |
| GET | `/api/m2` | M2 net-in-hand ranking of mandis |
| GET | `/api/m3` | M3 break-even scan, value curve, MILP schedule |
| GET | `/api/m4` | M4 farmer lots, knapsack result, DP cross-check |
| GET | `/api/eligible-mandis` | cheap call for the reference-mandi dropdown |
| GET | `/api/params` | read the stored assumption set |
| PUT | `/api/params` | replace the stored assumption set |
| GET | `/api/export/clean-slice.csv` | download exactly the rows in view |

`crop` and `as_of` are required on every decision route; `variety`, `window_days`, `volume`,
`horizon`, `conservative`, `farm_lat`, `farm_lon`, `n_farmers`, `order`, `ref_mandi` and a
JSON `overrides` object are optional. Full list in
[REPORT.md §7.2](REPORT.md#72-query-parameters).

### 4b. Smoke test

```bash
curl "http://localhost:8000/api/health"
```
```json
{"status":"ok","api_version":"2.0.0","database":"localhost:5432/agrilink","db_kind":"postgresql",
 "data_loaded":true,"tables":{"prices":14352,"mandis":72,"farms":1,"farm_distances":72,
 "params":1,"dataset_meta":9}}
```

Then a decision:

```bash
curl "http://localhost:8000/api/decision?crop=Onion&as_of=2025-06-11&volume=200&horizon=180"
```

Expect `cards.sell_at.market` = `Channarayapatna`, `cards.sell_at.net_per_qtl` ≈ `2756.11`,
`cards.hold.best_day` = `157`, `cards.hold.breakeven_day` = `4`, and
`cards.bulk_order.surplus` = `0.0` with `dp_agrees` = `true`.

A cost override, without changing the stored assumptions:

```bash
curl "http://localhost:8000/api/decision?crop=Onion&as_of=2025-06-11&overrides=%7B%22freight.diesel_price%22:130.0%7D"
```
→ `net_per_qtl` drops from `2756.11` to `2713.93`.

And a wrong request, which should be a clear `400` rather than a crash:

```bash
curl "http://localhost:8000/api/decision?crop=Maize&as_of=2025-06-11"
```
```json
{"detail":"unknown crop 'Maize'; database has ['Onion', 'Potato', 'Rice', 'Tomato', 'Wheat']"}
```

And a number outside its declared bounds, which is a `422`:

```bash
curl "http://localhost:8000/api/decision?crop=Onion&as_of=2025-06-11&volume=5000"
```

### 4c. Status codes

| Status | Meaning |
|---|---|
| `200` | answered, including the honest "not estimable" answers for thin crops |
| `400` | unknown crop or variety, `as_of` outside coverage, bad `overrides` |
| `422` | a query parameter outside its declared bounds (e.g. `volume` > 1000) |
| `503` | the database is empty, or unreachable |

### 4d. The CSV export

```bash
curl -o onion.csv "http://localhost:8000/api/export/clean-slice.csv?crop=Onion&as_of=2025-06-11&variety=All"
```

Streams the exact rows behind a decision, so it can be audited in a spreadsheet.

---

## 5. The dashboard

```bash
python -m streamlit run app/streamlit_app.py
```
`make app`

Opens on <http://localhost:8501>. Streamlit prints a `Network URL` too if you need to reach it
from another machine.

> The dashboard reads `data/raw/clean.parquet` and `data/ref/*` **directly** — it does not go
> through the API. You can run it without a database at all.

The dashboard shows three decision cards (**SELL AT** / **HOLD** / **BULK ORDER**) plus five
tabs: Market (STL), Where to sell, Hold vs Sell, Aggregate, Inputs.

**Sidebar controls worth knowing:**

| Control | Effect |
|---|---|
| Crop | 5 crops: Onion, Potato, Tomato, Wheat, Rice |
| Variety | `All` pools every variety; picking one usually starves the STL |
| **Price as of** | point-in-time cut — replay a past decision |
| **Quote window** | days averaged for the board price; widen to pull in more mandis |
| Crop volume, Horizon | drive modules 2, 3, 4 |
| Cost sliders | override `data/ref/params.yaml` for the session only |
| Farm lat / lon | origin for freight distance; default is the Davangere FPO depot |

---

## 6. Tests

```bash
python -m pytest -q
```
`make test`

Expected: **43 passed**. Three files:

| File | Tests | Covers |
|---|---|---|
| `tests/test_modules.py` | 6 | the four modules on synthetic data — pure logic |
| `tests/test_pipeline.py` | 19 | the real-data fixes (dates, state filter, unit errors, pooling) |
| `tests/test_app.py` | 18 | the dashboard headlessly, every crop, as-of replay, graceful degradation |

`test_app.py` drives the real app through Streamlit's headless harness, so it catches
regressions in the wiring, not just the maths.

To run one group:
```bash
python -m pytest tests/test_pipeline.py -q
python -m pytest tests/test_app.py -q -k as_of
```

> There is **no committed API test file** yet. The API was verified by driving
> `fastapi.testclient` in-process against the SQLite database, but that harness is not in
> `tests/`. See [REPORT.md §13](REPORT.md#13-what-i-would-do-next).

---

## 7. Optional: live current prices

Needs a free key from data.gov.in.

```bash
copy .env.example .env        # Windows
cp .env.example .env          # Linux/macOS
```
Edit `.env` and set `DATA_GOV_KEY=...`, then:
```bash
python -m src.data.fetch_agmarknet
```
`make fetch`

Writes `data/raw/agmarknet_live.parquet`. Note the shipped dump ends 2025-06-11, so this is
the only way to get quotes newer than that.

---

## 8. Refreshing with a new dump

1. Replace `Agriculture_price_dataset.csv` at the repo root.
2. Re-run §2a and §2b. (2c/2d need not re-run — mandi coordinates do not change.)
3. Reload the database: `python -m backend.seed.load_db --reset`
4. Re-run the tests: `python -m pytest -q`

---

## 9. Troubleshooting

| Symptom | Cause and fix |
|---|---|
| `data/raw/clean.parquet is missing` | run §2a + §2b, or `python -m backend.seed.load_db --reset --build-missing` |
| `data/ref/mandis.csv is missing` | run §2c |
| `artefacts missing -- re-run with --build-missing` | the loader found no parquet/CSV. Add that flag. |
| `database is empty -- run: python -m backend.seed.load_db` (503) | the tables exist but are empty. Run §3c. |
| `database unavailable: OperationalError` (503) | `DATABASE_URL` is wrong, or PostgreSQL is not running. Check §3a. |
| `'Could not parse'` / `password authentication failed` | credentials in `DATABASE_URL` don't match the role you created. |
| `relation "prices" does not exist` | the tables were never created — run the loader once (§3c). |
| `unknown crop 'X'; database has [...]` (400) | the database was loaded from a different slice. Reload, or pick a listed crop. |
| `as_of must be between ...` (400) | the date is outside the loaded coverage. `/api/meta` reports `date_min` / `date_max`. |
| `two full annual cycles` error for a crop | Tomato/Wheat/Rice are single partial seasons in this dump. Switch crop to Onion or Potato. This is data, not a bug. |
| `STL with period=52 needs at least 104 weekly points` | the selected mandi/variety has too short a history. Pick another reference mandi or set Variety to `All`. |
| Nominatim returns nothing / times out | rate-limited. Wait, then re-run — it resumes from the cache. |
| MILP `Infeasible` | volume too small to fill the 3 tranches of 10% each. Raise **Crop volume**. |
| `ImportError` for folium | `pip install folium streamlit-folium` |
| Port 8501 busy | `python -m streamlit run app/streamlit_app.py --server.port 8502` |
| Port 8000 busy | `uvicorn backend.main:app --reload --port 8001` |
| `AttributeError: 'datetime.date' object has no attribute ...` from the API | the `date` column was not coerced on read. Confirm `read_prices()` in `backend/services/repository.py` ends with `frame["date"] = pd.to_datetime(frame["date"])` — without it, every decision route 500s |
| `KeyError: 'path'` on a thin crop | the orchestrator read `m1["path"]` unconditionally. `build_decision()` must use `m1.get("path") or []` |

---

## 10. What you should see (sanity check)

Defaults: Onion, All varieties, as of 2025-06-11, Q = 200 qtl, farm 14.30 / 76.00, horizon 180,
order 400.

| Card | Expected |
|---|---|
| **SELL AT** | Channarayapatna — net Rs 2,756/qtl, 210.9 km, board rank #1 |
| **HOLD** | 157 days · break-even day 4 · gain Rs 2,182/qtl · MILP `Optimal` |
| **BULK ORDER** | 400 qtl · surplus 0 qtl · 8 farmers · DP cross-check agrees |

Health endpoint:

| Field | Expected |
|---|---|
| `status` | `ok` |
| `data_loaded` | `true` |
| `tables` | prices 14352 · mandis 72 · farms 1 · farm_distances 72 · params 1 · dataset_meta 9 |

If these numbers move, the data files or the source dump changed. Every one of them is
reproducible from the committed defaults.

---

## 11. Full command list, copy-paste

```bash
# --- setup ---
pip install -r requirements.txt

# --- build the data (once, ~3 min) ---
python -m src.data.load_history
python -m src.data.clean
python -m src.geo.geocode_mandis
python -m src.geo.build_dist_matrix

# --- load the database ---
python -m backend.seed.load_db --reset

# --- serve ---
python -m streamlit run app/streamlit_app.py     # dashboard :8501
uvicorn backend.main:app --reload --port 8000     # API        :8000/docs

# --- test ---
python -m pytest -q
```
