# AgriLink-OR

Deterministic decision support for Farmer Producer Organisations: STL price cycles,
net-in-hand mandi ranking, MILP hold-vs-sell with a break-even horizon, and bounded-knapsack
lot aggregation. **No machine learning anywhere in the system.**

Runs on the **Karnataka slice of `Agriculture_price_dataset.csv`** — 14,352 rows, 72 mandis,
21 districts, 2023-06-06 to 2025-06-11, 5 crops. There is no synthetic fallback anywhere: if
the data is missing the system says so rather than inventing a price.

> **📄 [RUN.md](RUN.md)** — every command, with expected output and troubleshooting.
> **📄 [REPORT.md](REPORT.md)** — tech stack, architecture, how each module works, the API
> reference, the data problems the dataset forced, and the limitations.
> **📄 [explain.md](explain.md)** — a plain-language walk-through for a non-technical reader.

---

## Quickstart (dashboard)

```bash
pip install -r requirements.txt
make data          # history + clean + geocode + distmat   (~3 min; geocode is the slow part)
make test          # 43 tests
make app           # http://localhost:8501
```

## Quickstart (API)

```bash
pip install -r requirements.txt
make data                                     # build the artefacts, once
make reset-db                                 # load them into the database
make backend                                 # http://localhost:8000/docs
```

`make reset-db` and `make backend` read `DATABASE_URL`. It defaults to PostgreSQL; for a
zero-setup local run with no database server, point it at SQLite:

```bash
# Windows PowerShell
$env:DATABASE_URL="sqlite:///./data/agrilink_dev.db"
```

Then `python -m backend.seed.load_db --reset` and `uvicorn backend.main:app --port 8000`.
See [RUN.md §4](RUN.md#4-the-api-backend) for the PostgreSQL setup.

No `make` on your PATH (it is not installed on stock Windows)? Every target has a plain
`python` equivalent — the full list is in [RUN.md §11](RUN.md#11-full-command-list-copy-paste).

---

## The three answers

| Card | Question | Module |
|---|---|---|
| **SELL AT** | which mandi leaves the most Rs in hand after freight, cess, handling and transit loss | M2 arbitrage |
| **HOLD** | is holding worth it, and on what day does it beat selling now | M3 break-even + MILP |
| **BULK ORDER** | which farmers' lots fill a large order with the least surplus | M4 knapsack |

Defaults: **Channarayapatna** at net Rs 2,756/qtl (211 km), **hold 157 days**
(break-even day 4), **400 qtl bulk order** filled with 0 surplus from 8 farmers. See
[REPORT.md §9](REPORT.md#9-worked-example-reproducible-defaults).

---

## Architecture

The project is three layers, and the middle one is the important part:

```
  src/            PURE MODULES — maths only.
                  No file reads, no database, no UI. Four modules (M1–M4) plus the
                  ingest/geo helpers that produce the reference artefacts.

  backend/        THE SERVICE — FastAPI over PostgreSQL.
                  Owns 100% of data access. Loads the artefacts from src/ into a database,
                  then exposes the modules as JSON. Routers stay thin; the orchestration
                  lives in one business-logic module.

  app/, frontend/ THE CLIENTS.
                  app/streamlit_app.py  reads parquet directly (v1, still the default UI)
                  frontend/            empty — reserved for the API-backed client
```

**The contract that makes this testable:** every module in `src/` is a pure function over
plain DataFrames/arrays plus a params dict. The database layer is the only thing that knows
SQL, and it returns DataFrames with exactly the column names the modules already expect — so
the maths is identical whether the data arrived as parquet or as rows from PostgreSQL.

---

## Layout

```
Agrilink-or/
├── Agriculture_price_dataset.csv   737,392-row source dump (Agmarknet, all states)
├── Makefile                        every workflow target
├── requirements.txt
├── .env.example                    DATABASE_URL, CORS origins, DATA_GOV_KEY
│
├── src/                            ── pure maths, no I/O ──
│   ├── common/params.py            load the params.yaml assumption set
│   ├── data/                       load_history, clean, farmers, fetch_agmarknet
│   ├── geo/                        geocode_mandis, build_dist_matrix
│   ├── m1_econometrics/stl_bands.py    STL decomposition, bands, price path p(d)
│   ├── m2_arbitrage/nihr.py            net-in-hand realisation ranking
│   ├── m3_milp/                         breakeven, hold_sell (CBC MILP)
│   └── m4_aggregation/knapsack.py      bounded knapsack + DP cross-check
│
├── backend/                        ── the service ──
│   ├── __init__.py                 __version__ = "2.0.0"
│   ├── config.py                   Settings from the environment, .env fallback
│   ├── db.py                       engine, session factory, Base
│   ├── models.py                   the six tables — single source of schema truth
│   ├── schemas.py                  request validation + response models
│   ├── main.py                     app factory, CORS, error handlers, routers
│   ├── routers/
│   │   ├── system.py               /health, /meta
│   │   ├── decision.py             /decision, /m1–/m4, /eligible-mandis
│   │   ├── params.py               /params (read + replace)
│   │   └── export.py               /export/clean-slice.csv
│   ├── services/
│   │   ├── repository.py           the only place SQL is written
│   │   └── decision.py             Selection, view_of, build_decision, build_meta
│   └── seed/load_db.py             ETL: artefacts -> tables
│
├── app/streamlit_app.py            the v1 dashboard (reads parquet directly)
├── frontend/                       empty — reserved for the API-backed client
├── data/
│   ├── raw/                        agmarknet_history.parquet, clean.parquet
│   ├── ref/                        params.yaml, mandis.csv, dist_matrix.parquet
│   └── agrilink_dev.db             the SQLite development database
├── tests/                          43 tests
└── scripts/                        empty — reserved for ops helpers
```

---

## The database

Six tables, created by `python -m backend.seed.load_db` via SQLAlchemy `create_all`, so the
same definition works on PostgreSQL (the real target) and SQLite (the zero-setup fallback).

| Table | Rows on a fresh load | What it holds |
|---|---|---|
| `prices` | 14,352 | one row per mandi quote — the Agmarknet fact table |
| `mandis` | 72 | mandi master: district, lat/lon, geocode provenance |
| `farms` | 1 | the default FPO ship-from point (Davangere depot) |
| `farm_distances` | 72 | the cached farm→mandi matrix, for audit |
| `params` | 1 | the assumption set, `params.yaml` shape, stored as JSON |
| `dataset_meta` | 9 | provenance: source file, counts, coverage window, load timestamp |

`prices` carries three indices — `(commodity, market, date)`, `(date)`, `(commodity, date)` —
because every decision query is "one crop, one mandi, up to a date".

---

## The API

Eleven operations across ten paths, all `GET` except one `PUT`. Interactive docs at `/docs`.

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | is the API up, and is the database loaded |
| GET | `/api/meta` | crops, varieties, date range, farms, assumptions, provenance |
| GET | `/api/decision` | **the one the dashboard calls** — three cards + full M1–M4 |
| GET | `/api/m1` … `/api/m4` | the same computation, sliced per module |
| GET | `/api/eligible-mandis` | cheap call for populating the reference-mandi selector |
| GET | `/api/params` | the current stored assumption set |
| PUT | `/api/params` | replace the stored assumption set |
| GET | `/api/export/clean-slice.csv` | download exactly the rows in view, to audit a decision |

```bash
curl "http://localhost:8000/api/decision?crop=Onion&as_of=2025-06-11&volume=200&horizon=180"
```

Every decision route takes the same validated query string: `crop` and `as_of` are required;
`variety`, `window_days`, `volume`, `horizon`, `conservative`, `farm_lat`, `farm_lon`,
`n_farmers`, `order`, `ref_mandi` and a JSON `overrides` object are optional. Full parameter
list and response shapes in [REPORT.md §7](REPORT.md#7-api-reference).

**Bad input is a client error, not a crash** — an unknown crop, a variety that crop has never
had, or an `as_of` outside the data's coverage returns `400` with the valid values named; an
out-of-range number returns `422`; an empty or unreachable database returns `503`.

---

## Optional extras

- **Live current prices** (the shipped dump ends 2025-06-11): copy `.env.example` to `.env`,
  set `DATA_GOV_KEY`, then `make fetch`.
- **Road-distance verification**: `pip install osmnx networkx geopandas shapely`, then
  `python -m src.geo.build_dist_matrix` with `engine="osmnx"`. Off the default path because
  the OSM download is large and the result is not reproducible on demand.
