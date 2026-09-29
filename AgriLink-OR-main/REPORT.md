# REPORT.md — AgriLink-OR

**Deterministic decision support for Farmer Producer Organisations, running on real Karnataka
mandi price data, served over a FastAPI/PostgreSQL backend.**

---

## 1. What it does

An FPO has one hard question repeated every week: **should we sell today, hold, and if we
hold, sell where and when?** Boards quote a *modal price* per mandi. That number is close to
useless on its own — it ignores freight, cess, handling and transit loss, and the highest
board price is often not the highest net realisation.

AgriLink-OR answers three questions at once and refuses to answer what the data cannot
support:

| Card | Question | Module |
|---|---|---|
| **SELL AT** | which mandi leaves the most Rs in hand, per quintal, after every cost | M2 arbitrage |
| **HOLD** | is holding worth it, and on what day does it beat selling now | M3 break-even + MILP |
| **BULK ORDER** | which farmers' lots fill a large order with the least surplus | M4 knapsack |

Behind the first card sits M1, a seasonal-trend decomposition that produces the projected
price path M3 needs.

There is no machine learning anywhere in this system, by design — see §11.

---

## 2. The data

### 2.1 Source

`Agriculture_price_dataset.csv` — a national Agmarknet price dump, 737,392 rows, 30 state
labels.

| Column | Type | Note |
|---|---|---|
| `STATE` | text | 30 variants, incl. `" Punjab"` and `"karnataka"` with stray whitespace |
| `District Name` | text | lowercase in the dump |
| `Market Name` | text | messy: `Hubli (Amaragol)`, `Mysore (Bandipalya)`, `Binny Mill (F&V), Bangalore` |
| `Commodity` | text | 5 crops survive in Karnataka |
| `Variety` | text | 10 for onion; `Other`, `Local`, `Puna`, `Telagi`… |
| `Grade` | text | 99% `FAQ` |
| `Min_Price` / `Max_Price` / `Modal_Price` | Rs/qtl | `Modal_Price` is the decision variable |
| `Price Date` | date | **US `M/D/YYYY`**, e.g. `6/13/2023` = 13 June |

**There is no arrivals column.** Any arrival-pressure or surplus figure in this system is
therefore a proxy, never a measurement — see §12.

### 2.2 The Karnataka extract

`python -m src.data.clean` filters to Karnataka and lands **14,352 rows / 72 mandis /
21 districts / 2023-06-06 → 2025-06-11**.

| Crop | Rows | Mandis | Median Rs/qtl | Range Rs/qtl | Annual STL? |
|---|---|---|---|---|---|
| **Onion** | 6,330 | 43 | 2,000 | 1,200 – 12,500 | **yes, 12 mandis** |
| **Potato** | 5,174 | 35 | 2,081 | 1,100 – 32,250 | **yes, 9 mandis** |
| Tomato | 1,411 | 35 | 4,630 | 1,000 – 13,000 | no (22 wks max) |
| Wheat | 1,082 | 24 | 3,100 | 1,619 – 5,650 | no (35 wks) |
| Rice | 355 | 22 | 3,000 | 1,600 – 14,500 | no (9 wks) |

### 2.3 Geocoding provenance

Of the 72 mandis, **59 resolved to the market itself** (`source = "market"`) and **13 pinned to
their district centroid** (`source = "district_fallback"`) because Nominatim could not resolve
the market name. The distinction is stored in the `mandis.source` column and surfaced through
`/api/meta` as `mandis_geo` (72) and `mandis_centroid` (13), so an approximate distance is never
presented as an exact one.

### 2.4 Five data problems, and what they were doing to the numbers

This is the part worth reading. The original skeleton made four assumptions the data does not
support, and each one silently corrupted the output rather than erroring.

**(a) `Price Date` is not day-first.** `clean.py` inferred dates with `dayfirst=True`.
`6/13/2023` is 13 June, not 6 March — day-first inference threw that row to `NaT`, and
**silently lost 8,694 of the 14,391 Karnataka rows** while shifting every ambiguous date
(`9/8/2024` → 9 August instead of 8 September). Fixed by pinning the format explicitly
(`src/data/load_history.py:44`), with a fallback chain so `dd/mm/yyyy` exports still parse.

**(b) `crop: Maize` does not exist in this dump.** `params.yaml` shipped with Maize. The
Karnataka commodities are Onion, Potato, Tomato, Wheat, Rice — the app would have opened on
an empty series. Default is now Onion (highest volume, widest dispersion, and what an FPO
actually stores). A test now fails if `params.yaml` names a crop absent from the slice.

**(c) `interpolate(limit=4)` destroyed the sample.** Mandis report in bursts with holes of up
to ~4 weeks. A 4-week interpolation cap left every series below the **104 points a 52-week
STL mathematically requires** (statsmodels needs two complete cycles). The resampler now
fills the grid and reports the imputed share, so an interpolated series is never mistaken for
an observed one. This alone took Onion from 0 to 12 usable mandis.

**(d) Rs/kg unit errors poisoned one mandi.** The feed intermittently quotes a
mandi-commodity per **kilogram**, landing ~10× low — Shimoga onion reported Rs 14 against a
Rs 2,000 median. That single series spanned **×464** in price, which would drive a nonsense
price path and a nonsense hold/sell advice, while its GLUT/SPIKE flags still looked completely
normal. `clean.py` now drops any quote below 10% of its own mandi-commodity median. Effect:
39 rows removed, Shimoga's onion dispersion falls from ×464 to **×5.0**, and GLUT/SPIKE
detection is unchanged (3/0) — the error went, the agronomic signal stayed.

**Only the low side is guarded.** Unit errors are always downward, whereas genuine upward
spikes are real — Karnataka tomato does trade at Rs 13,000/qtl. Clipping the high side would
delete signal, so the guard is deliberately one-sided.

**(e) A fifth, found while validating:** the app never filtered by crop. The original
`weekly_series(df[df["market"] == ref_mandi])` mixed Onion, Potato and Tomato modal prices into
one "price" series. Fixed, with Crop and Variety selectors — and enforced at the API boundary
too, where an unknown crop or variety is a `400` rather than an empty chart.

---

## 3. Tech stack

| Layer | Choice | Why this and not the alternative |
|---|---|---|
| Dataframes | **pandas 3.0** + **pyarrow** | Parquet is ~5× smaller than CSV, preserves dtypes, and gives `cache_data` something to hash. |
| Storage | **Parquet** (pipeline) | `load_history` → `clean` is a typed column filter, not string parsing. |
| Database | **PostgreSQL** via **SQLAlchemy 2.0** | A relational store with real types, constraints and indices; the ORM keeps the pandas read path intact. SQLite is a supported fallback for zero-setup local runs. |
| API | **FastAPI 0.141** + **Uvicorn** | Pydantic validation at the boundary, generated OpenAPI, and typed query dependencies — the validation rules are declared once, next to the response shape. |
| Decomposition | **statsmodels `STL`** | Deterministic, inspectable components, no fitted changepoints. **Rejected** Prophet: it fits changepoints by default and *hides* them — the opposite of what a decision tool needs. |
| Optimisation | **PuLP + CBC** | Free, in-process, reproducible. **Rejected** Gurobi/CPLEX (licence), `scipy.optimize` (no MILP), CVXPY (overhead). |
| Distances | **haversine × 1.3 circuity** | Zero network, instant, deterministic. **Rejected** live routing APIs (network dependency, rate limits, non-reproducible). OSMnx is kept as an *optional* verification path. |
| UI | **Streamlit 1.64** | The app is a single file of pure-function calls; Streamlit removes callback plumbing entirely. **Rejected** Dash/Flask (no bespoke layout needed). |
| Charts | **Plotly** | `hovermode="x unified"` and `add_vline` annotations are what make the hold/sell chart legible. |
| Map | **folium** + **streamlit-folium** | Leaflet tiles, `CircleMarker` tooltips; no basemap API key. |
| Geo | **requests** → Nominatim | Used once, cached to CSV. `geopy` not needed. |
| Config | **PyYAML** + **pydantic-settings-style env** | `params.yaml` with `source: TODO` markers, so every assumption is auditable. |
| Tests | **pytest** + `streamlit.testing.v1.AppTest` + `fastapi.testclient` | Drives the *real* app headlessly and the *real* API in-process, so wiring regressions fail early, not for a user. |

`osmnx`/`geopandas`/`shapely` are deliberately excluded from `requirements.txt` — large, and
unused by the default path.

---

## 4. Architecture

Three layers, with a hard rule at each boundary.

```
  SOURCES                     INGEST / CLEAN (src/)                 ARTEFACTS
  Agriculture_price_          load_history.py ──▶ history.parquet
    dataset.csv  ──────────▶   clean.py        ──▶ clean.parquet  (14,352 rows)
    (737,392 rows)             (Karnataka,        mandis.csv       (72 mandis)
                               unit errors)       dist_matrix      (farm→mandi)
  Nominatim ──────────────▶   geocode_mandis.py      params.yaml  (every assumption)
  haversine × 1.3 ────────▶   build_dist_matrix.py
                                                              │
                                            ┌─────────────────┴─────────────────┐
                                            ▼                                   ▼
  src/m1_econometrics/  stl_bands   ┌──────────────────┐            app/streamlit_app.py
  src/m2_arbitrage/     nihr        │  backend/        │◀───HTTP────  (v1: reads parquet
  src/m3_milp/          breakeven   │  FastAPI v2.0.0  │               directly)
  src/m3_milp/          hold_sell   │                  │
  src/m4_aggregation/   knapsack    │  routers/ (thin) │──── GET ──▶  /api/decision
  ── PURE FUNCTIONS, NO I/O ──      │  services/       │              /api/m1…m4
                                    │  repository.py   │◀── SQL ───▶  PostgreSQL
                                    │  decision.py     │              prices, mandis,
                                    └──────────────────┘              farms, distances,
                                           │                          params, dataset_meta
                                           ▼
                                    seed/load_db.py  (ETL: artefacts → tables)
```

**The contract:** every module in `src/` is a pure function over plain DataFrames/arrays plus
a params dict. **No module reads a file or touches the UI or a database.**
`backend/services/repository.py` is the only place SQL is written, and it returns DataFrames
with exactly the column names the modules already expect — which is why the maths is
bit-identical whether the rows came from parquet or from PostgreSQL.

**Two client paths, deliberately kept separate:**

| Client | Data source | Status |
|---|---|---|
| `app/streamlit_app.py` | `data/raw/clean.parquet` + `data/ref/*` directly | v1, the default dashboard, unchanged |
| `frontend/` (empty) | the HTTP API | reserved for the API-backed client |

The dashboard has not been migrated to call the API yet. That is the next piece of work, not
a current capability — see §13.

---

## 5. The database

### 5.1 Schema

Six tables, declared once in `backend/models.py` and created with `create_all`, so the same
definition works on PostgreSQL (the real target) and SQLite (the zero-setup fallback). The ORM
models are the single source of schema truth; there is no separate `.sql` migration.

| Table | PK | Columns | Notes |
|---|---|---|---|
| `prices` | `id` | `date`, `state`, `district`, `market`, `commodity`, `variety`, `grade`, `min_price`, `max_price`, `modal_price` | the Agmarknet fact table |
| `mandis` | `market` | `district`, `lat`, `lon`, `source` | `source` is `market` or `district_fallback` |
| `farms` | `farm_id` | `name`, `lat`, `lon` | FPO ship-from points |
| `farm_distances` | `(farm_id, market)` | `district`, `km` | cached distance matrix |
| `params` | `name` | `payload` (JSON), `updated_at` | assumption sets, `params.yaml` shape |
| `dataset_meta` | `key` | `value` | provenance: source file, counts, coverage, load timestamp |

**Indices.** `prices` carries `ix_prices_crop_market_date` on `(commodity, market, date)`,
plus `ix_prices_date` and `ix_prices_crop_date`, because every decision query is "one crop,
one mandi, up to a date" and the point-in-time cut is applied on every request.
`farm_distances` carries `ix_farm_distances_farm`.

**Row counts on a fresh load:** prices 14,352 · mandis 72 · farms 1 · farm_distances 72 ·
params 1 · dataset_meta 9.

### 5.2 The repository layer

`backend/services/repository.py` is the entire read/write surface:

| Function | Returns |
|---|---|
| `read_prices()` | the full fact table as a DataFrame, `date` coerced to `datetime64` |
| `read_mandis(require_coordinates=True)` | 72 mandis; the default filter drops any without lat/lon |
| `read_farms()` / `read_farm_distances()` | the default farm and the distance matrix |
| `get_params()` / `save_params()` | the stored assumption set, falling back to `params.yaml` if the table is empty |
| `get_dataset_meta()` | the provenance key/value pairs |
| `table_counts()` / `is_loaded()` | health and emptiness checks |
| `invalidate_caches()` | drops every cached frame — called after any write |

Two behaviours worth calling out:

- **The `date` column is coerced to `datetime64` on read.** SQLAlchemy returns
  `datetime.date` objects, so the column would otherwise arrive as `object` dtype and every
  downstream slice, comparison and resample would fail. Coercing at the read boundary is what
  restores parity with the parquet path.
- **Reads are process-cached and writes invalidate.** The fact table is read-only while the
  API serves, and the MILP is slow enough that recomputing an identical decision per request
  would be wasteful. `PUT /api/params` therefore calls `invalidate_caches()`, which clears both
  the frame cache and the decision cache.

### 5.3 ETL

`backend/seed/load_db.py` reads the artefacts the pipeline already produces and inserts them in
2,000-row chunks:

```
loaded   : prices=14,352 mandis=72 farm_distances=72 params=1 meta=9
coverage : 2023-06-06 -> 2025-06-11 | 72 mandis | 5 crops
```

| Flag | Effect |
|---|---|
| *(none)* | create tables if needed, then truncate and reload |
| `--reset` | `drop_all` first, then reload |
| `--build-missing` | run `src.data.load_history` → `src.data.clean` → `src.geo.geocode_mandis` → `src.geo.build_dist_matrix` for any artefact that is absent, then load |

It also writes the `dataset_meta` provenance rows (`source_file`, `source_rows`, `mandis`,
`districts`, `crops`, `coverage_start`, `coverage_end`, `loader`, `loaded_at`) that the
dashboard's freshness panel reads, and seeds the single `farms` row from
`src.geo.build_dist_matrix.DEFAULT_FARM`.

---

## 6. How each module works

### M1 — Seasonal price decomposition (`src/m1_econometrics/stl_bands.py`)

1. **Weekly grid.** Resample to `W`, take the **median** (a mandi can report twice a day;
   median is the robust reducer), fill gaps by interpolation.
2. **Decompose** log-price with `STL(period=52, robust=True)`. Log because price movements are
   proportional, not additive — an Rs 500 swing matters at Rs 1,000 and not at Rs 5,000.
   `robust=True` so one bad week cannot drag the trend.
3. **Volatility bands** on the residual, not on the raw series: `μ, σ` = rolling 12-week
   mean/std of the residual; `upper = exp(trend + seasonal + μ + 2σ)`, `lower = exp(trend +
   seasonal + μ − 2σ)`. A ±2σ band is where a 2% *relative* move is normal and a 5% one is
   not.
4. **GLUT / SPIKE flags** from the residual z-score: `z < −2` → GLUT week (price is low even
   for the season — the window to buy), `z > +2` → SPIKE.
5. **`price_path p(d)`** — the projection modules 2–3 consume. Deterministic, no randomness: OLS
   slope on the last 26 weeks of trend (log-units/week) + the seasonal component replayed from
   the same calendar week last year:
   `p(d) = exp(trend_last + slope·(d/7) + seasonal[n−52+round(d/7)])`. The **Conservative**
   toggle scales the path down to the lower band.

`coverage()` is exported alongside so the UI can state how much of the grid was interpolated
rather than observed.

### M2 — Net in-hand realisation (`src/m2_arbitrage/nihr.py`)

Per quintal at a mandi, walking the money out of the FPO's pocket:

```
r_km      = diesel/mileage + other_cost_per_km        = 90/4 + 8 = 30.5 Rs/km
trucks    = ceil(Q / truck_capacity)                  = ceil(200/100) = 2
freight   = trucks × (fixed_per_trip + return_factor × r_km × km)
shrink    = transit_shrink_per_km × km                (loss en route)
gross     = Q × (1 − shrink) × board_price
fees      = gross × (cess + commission)
handling  = Q × (loading + unloading) + mandi_fixed
net       = gross − fees − handling − freight
```

Every term is a parameter line, so an FPO can substitute its own contract rates. `rank_board`
(raw price rank) is kept next to `net_per_qtl` so the dashboard can show the two rankings
**disagreeing** — that disagreement is the arbitrage.

### M3 — Hold vs sell (`src/m3_milp/`)

**3a. Carry cost per quintal per day**

```
c = rent/month ÷ 30  +  insurance/fumigation/day
  + P_ref/365 × (LTV×loan_interest + (1−LTV)×opportunity_cost)
```

The financing term is the point: the crop is not free collateral. At LTV 0.70 you are paying
9% on borrowed money and 12% on your own equity, so `c = 0.20 + 0.05 + 0.67 = Rs 0.92/qtl/day`.

**3b. Value curve and break-even.** With `θ = 1 − shrink_per_day`, holding `t` days is worth

```
V(t) = θᵗ · p(t)  −  c·t  −  one_time_fee·[t > 0],    V(0) = p₀
```

Break-even is the first `t > 0` where `V(t) ≥ V(0)`; the peak is `argmax V`. Note `θᵗ`:
**storage shrink means you cannot sell what you put in.** At 1%/month over 180 days,
`θ¹⁸⁰ = 0.942`, so 200 qtl in becomes ~188 qtl recoverable — an 11.6 qtl loss that a
price-only model would never show.

**3c. Multi-tranche MILP.** Maximise

```
Σ_t p(t)·q(t)  −  c·Σ_t I(t)  −  f_sale·Σ_t z(t)  −  fee_nwr·w
```

subject to the inventory balance `I(t) = θ·I(t−1) − q(t)`, `I(0) = Q₀ − q(0)`, `I(T) = 0`
(everything sold by the horizon), `q(t) ≤ Q₀·z(t)`, `q(t) ≥ q_min·z(t)`, `Σ_t z(t) ≤ K`, and a
block-charge binary `b` so rent is paid per 30-day block rather than per day. `z`/`w`/`b` are
binaries, so this is a true MILP solved by CBC.

`q_min` (10% of volume) and `K = 3` tranches are what stop the solver returning a clairvoyant
single-sale optimum that no cooperative could actually execute.

### M4 — Lot aggregation (`src/m4_aggregation/knapsack.py`)

Minimise surplus subject to filling a bulk order, with real-world constraints:
`Σ qty·x ≥ T`, `Σ qty·x ≤ T(1+ε)`, per-lot multiplicity `x ≤ count`, a concentration cap
`qty·x ≤ max_share·T(1+ε)` so one farmer cannot supply the whole order, plus optional grade
and moisture ceilings.

`dp_min_surplus()` re-solves the same question as a 0/1 subset-sum in `O(N·S)` and the UI
shows **both** answers side by side. They agree in every run we have checked — an independent
check on the knapsack, not a restatement of it.

### The farmer roster

The dump has no farm-level arrivals, so lot **sizes** are simulated — but deterministically
(seed 11), from the **real** mandi set, and scaled so lot size shrinks as unit price rises.
Mandis, distances and board prices in that table are real. Stated in the UI.

---

## 7. API reference

Base path `/api`. **Eleven operations across ten paths.** All routes are `GET` except
`PUT /api/params`. Interactive documentation (with live schemas) is served at `/docs`; `/`
redirects there.

### 7.1 Routes

| Method | Path | Summary |
|---|---|---|
| GET | `/api/health` | Is the API up, and is the database loaded? |
| GET | `/api/meta` | Crops, varieties, date range, assumptions and provenance |
| GET | `/api/decision` | Three decision cards + full M1–M4 detail for one selection |
| GET | `/api/m1` | M1 seasonal decomposition, bands, flags and the price path |
| GET | `/api/m2` | M2 net-in-hand ranking of mandis |
| GET | `/api/m3` | M3 break-even scan, value curve and multi-tranche MILP |
| GET | `/api/m4` | M4 farmer lots, bounded knapsack and the DP cross-check |
| GET | `/api/eligible-mandis` | Mandis with two full annual cycles, best-observed first |
| GET | `/api/params` | The current assumption set |
| PUT | `/api/params` | Replace the stored assumption set (writes to the database) |
| GET | `/api/export/clean-slice.csv` | Download the Karnataka slice in view |

`/api/decision` and `/api/m1`–`/api/m4` accept the **same** query string, so a client can
narrow to one module without learning a second parameter set.

### 7.2 Query parameters

Declared once in `backend/schemas.py::selection_query` as a FastAPI dependency, so the
validation rules and the OpenAPI docs cannot drift apart.

| Parameter | Type | Default | Bounds / notes |
|---|---|---|---|
| `crop` | string | **required** | must exist in the database |
| `as_of` | date | **required** | ISO `YYYY-MM-DD`; must be inside the data's coverage |
| `variety` | string | `All` | `All` pools every variety; otherwise must exist for that crop |
| `window_days` | int | 14 | 1–60; the median board-price window ending at `as_of` |
| `volume` | float | 200.0 | 10–1000 quintals |
| `horizon` | int | 180 | 30–240 days |
| `conservative` | bool | false | shift the M1 path to the lower band |
| `farm_lat` | float | 14.30 | 11.5–18.5 (Karnataka) |
| `farm_lon` | float | 76.00 | 74.0–78.5 (Karnataka) |
| `n_farmers` | int | 25 | 5–60 |
| `order` | float | 400.0 | 50–1000 quintals |
| `ref_mandi` | string | null | optional; defaults to the best-observed series |
| `overrides` | JSON string | null | object of dotted parameter paths, e.g. `{"freight.diesel_price": 95.0}` |

`overrides` is the API equivalent of the sidebar sliders: it is applied to a deep copy of the
stored assumption set for that request only. An unknown key or an unknown path is a `400`, not
a silent no-op. Unknown dotted paths are rejected because `set_by_path` refuses to create a
new section — a typo in a cost assumption should not be silently ignored.

`/api/eligible-mandis` and `/api/export/clean-slice.csv` take only `crop`, `as_of` and
`variety`.

### 7.3 Response shapes

| Route | Top-level keys |
|---|---|
| `/api/health` | `status`, `api_version`, `database`, `db_kind`, `data_loaded`, `tables` |
| `/api/meta` | `crops`, `varieties`, `date_min`, `date_max`, `rows_total`, `markets_total`, `districts_total`, `crops_total`, `districts`, `mandis_geo`, `mandis_centroid`, `farms`, `default_farm`, `distance_rows`, `distance_max_km`, `params`, `dataset`, `stl_period`, `min_weeks`, `defaults`. On a fresh load: 5 crops, 2023-06-06 → 2025-06-11, 72 mandis, 72 geocoded / 13 centroid, one farm (`fpo_davangere` at 14.30 / 76.00), 72 distance rows, max 561.9 km, `stl_period` 52, `min_weeks` 104 |
| `/api/decision` | `selection`, `params`, `provenance`, `cards`, `m1`, `m2`, `m3`, `m4` |
| `/api/m1` | `period`, `min_weeks`, `eligible`, `ref_mandi`, `error`, `imputed_warning`, `coverage`, `strengths`, `glut_weeks`, `spike_weeks`, `path_start`, `path_end`, `series`, `path`, `seasonal_index` |
| `/api/m2` | `rows`, `count`, `top`, `board_top`, `gap_per_qtl`, `cost_walk` |
| `/api/m3` | `available`, `error`, `carry_per_qtl_day`, `shrink_per_day`, `breakeven_day`, `best_day`, `best_gain_per_qtl`, `curve`, `milp` |
| `/api/m4` | `available`, `error`, `lots`, `order`, `pool_total`, `dp_surplus`, `agg` |
| `/api/params` | the assumption set itself (`crop`, `state`, `freight`, `handling`, `market`, `storage`) |

`cards` is the three-card summary — `sell_at`, `hold`, `bulk_order`, plus `m1_error` when the
crop has no annual decomposition — so a client can render the headline answer without walking
the module detail.

`provenance` carries the audit trail: `rows_total`, `markets_total`, `districts_total`,
`crops_total`, `first_date`, `latest_date`, `age_days`, `stale`, `rows_in_view`,
`markets_in_view`, `districts_in_view`, `crop_markets`, `n_quoting`, `quote_window_days`,
`as_of`, `crop`, `variety`, `source_file`, `loaded_at`, and the standing
`no_arrivals_column` flag set to `true`.

**A note on typing.** The heavy collections (`series`, `path`, `curve`, `lots`, `rows`) are
declared `list[dict[str, Any]]`. Their shape is documented here and served with live OpenAPI
examples, while the maths that produces them is already covered by the module tests. Typing
every element of a 106-row series buys documentation, not correctness.

### 7.4 Error behaviour

| Status | When | Example |
|---|---|---|
| `400` | unknown crop or variety, `as_of` outside coverage, malformed or unknown `overrides` | `unknown crop 'Maize'; database has ['Onion', 'Potato', 'Rice', 'Tomato', 'Wheat']` |
| `422` | a query parameter outside its declared bounds | `volume` above 1000 |
| `503` | the database is empty | `database is empty -- run: python -m backend.seed.load_db` |
| `503` | the database is unreachable | `database unavailable: OperationalError` |

The `503`-on-empty check is deliberate: a freshly created database would otherwise return
plausible-looking empty results, and an empty result that looks like an answer is worse than
an error.

### 7.5 Caching

`build_decision` memoises its result per `(selection, overrides)` key, capped at 64 entries
with FIFO eviction, and `repository` caches the DataFrames. `PUT /api/params` and the ETL both
call `invalidate_caches()`, which clears both layers — so a changed assumption can never be
served from a stale cache.

---

## 8. The interface

Three decision cards up top, then five tabs. The sidebar drives everything; the Crop and
Variety selectors, the **Price as of** date and the **Quote window** are the three that
change the answer most.

- **Price as of** makes the whole dashboard point-in-time: every module is evaluated on data up
  to that date, so a past decision can be replayed. This matters because the shipped dump is
  475 days stale.
- **Quote window** — board prices are the median over N days, because mandis skip days and a
  single date would discard most of them. The UI discloses how many mandis that leaves in:
  *12 of 43* onion mandis were still quoting at the dataset's end.
- **Reference mandi** defaults to the best-*observed* eligible series (Davangere, 11%
  interpolated), not the alphabetically first one (Channarayapatna, 67%).

The **Where to sell** tab ranks mandis by net realisation and draws them on a Leaflet map sized
and coloured by value, with a marker distinguishing the 13 mandis pinned to a district
centroid rather than the market itself.

---

## 9. Worked example (reproducible defaults)

Read back out of `GET /api/decision?crop=Onion&as_of=2025-06-11&volume=200&horizon=180&farm_lat=14.30&farm_lon=76.00&order=400`.

**SELL AT → Channarayapatna, net Rs 2,756/qtl, 211 km away.** 12 mandis quoting in the window.

| Mandi | km | Board | Freight | Fees | **Net/qtl** |
|---|---|---|---|---|---|
| **Channarayapatna** | 210.86 | 3,000 | 26,724 | 17,924 | **2,756** |
| Ramanagara | 290.73 | 2,400 | 36,469 | 14,316 | 2,124 |
| Shimoga | 79.82 | 2,200 | 10,738 | 13,179 | 2,069 |
| Tumkur | 207.66 | 2,100 | — | — | 1,889 |
| Davangere *(nearest)* | 25.30 | 1,600 | 4,086 | 9,595 | 1,523 |

The cost walk for the winner, per quintal: `3,000 board − 12.65 transit − 133.62 freight −
89.62 fees − 8.00 handling = 2,756`. The nearest mandi pays Rs 1,600; the winner pays Rs 3,000
and still nets **Rs 1,233/qtl more** after 211 km of freight, because the price gap dwarfs the
transport cost. Raising diesel to Rs 130/litre moves the winner to Rs 2,714 — the
recommendation is not knife-edge on fuel.

Note that at these defaults Channarayapatna is *also* the top board price, so
`gap_per_qtl` is 0.0 — the two rankings agree here. The arbitrage is visible whenever they
diverge, and `gap_per_qtl` is the field to watch when they do.

**HOLD → 157 days, break-even day 4, gain Rs 2,182/qtl.** Reference Davangere: 106 weekly
points, 94 observed (11% interpolated), `F_seasonal` 0.9996, `F_trend` 0.9993, 3 GLUT weeks, 0
SPIKE weeks. Seasonal index 0.62–1.56, peaking in **November** and bottoming in **May** — the
correct Karnataka onion cycle. Projected path: 2,484 → 3,081 (d30) → 4,615 (d90) → 4,541
(d180). The MILP agrees: one tranche of 189.8 qtl on day 157 at Rs 5,073, objective Rs 931,330
— selling 189.8 rather than 200 because shrink consumed the rest.

**BULK ORDER → 400 qtl, surplus 0, 8 farmers**, from a 25-farmer pool offering 1,373 qtl. The
0/1 subset-sum DP returns the same surplus, independently.

**Thin crops degrade honestly.** `Tomato`, `Wheat` and `Rice` return `200` with
`m1.error` set, `m3.available = false`, and no fabricated projection.

---

## 10. Testing

**43 tests, all passing**, in three layers:

| File | Count | Covers |
|---|---|---|
| `tests/test_modules.py` | 6 | the four modules on synthetic data. Pure logic, no I/O. |
| `tests/test_pipeline.py` | 19 | locks in the fixes from §2.4: `6/13/2023` is 13 June; `dd/mm/yyyy` still parses; only Karnataka survives; Rs/kg rows are gone but genuine Rs 13,000 tomato spikes survive; every STL-eligible series spans <20×; `params.yaml` names a crop that exists. |
| `tests/test_app.py` | 18 | runs the **real app** headlessly via `AppTest`: every one of the 5 crops, the 3 thin crops degrading gracefully instead of fabricating a projection, volume/horizon/diesel/farm-movement changes, as-of replay, and the quote-window disclosure. |

`test_app.py` earned its keep: it caught two bugs a maths test never would — a `view_of` helper
that treated `None` as a literal variety and silently emptied the "All varieties" path (killing
the entire hold/sell module), and a `KeyError` that took down the app whenever a crop had no
recent quotes.

**There are no committed API tests yet.** The API was verified by driving
`fastapi.testclient` against the loaded SQLite database — all eleven routes, all five crops,
the override path, and each error status in §7.4 — but that harness is not yet in `tests/`.
Making that permanent is item 1 in §13.

Three bugs were found and fixed by that verification, all of the same species — a Python type
leaking across a boundary the type checker could not see:

1. **`_validate_against_db` crashed on every decision request.** `df["date"].min().date()`
   assumed a `Timestamp`, but SQLAlchemy returns `datetime.date`, so the `as_of` bounds check
   raised `AttributeError` and `/api/decision`, `/api/m1`–`/api/m4` and `/api/eligible-mandis`
   all returned 500.
2. **`view_of` could not compare dates.** `df["date"] <= pd.Timestamp(as_of)` raised
   `TypeError: Cannot compare Timestamp with datetime.date`, which also broke
   `/api/export/clean-slice.csv`.
3. **M1's summary fields were silently dropped.** `M1Response` did not declare `glut_weeks`,
   `spike_weeks`, `path_start` or `path_end`, so Pydantic's response filtering removed them
   from every payload — the GLUT/SPIKE counts and the path endpoints simply never reached the
   client, with no error anywhere.
4. **Thin crops crashed the orchestrator.** For a crop with no annual decomposition `_module1`
   returns early without a `path` key, and `build_decision` read `m1["path"]` unconditionally,
   so `/api/decision?crop=Tomato` raised `KeyError: 'path'`.

The root cause of the first two is fixed at the single best place — `read_prices()` coerces the
column to `datetime64` on the way out of the database, which restores exact parity with the
parquet path and means the modules never see a non-pandas date again.

---

## 11. Why there is no machine learning

The brief is deterministic decision support, and a cooperative deciding whether to hold 100
quintals of onion needs to know **why** and to be able to argue with it. A fitted forecast
would hide its error bars behind a point estimate, and its changepoints behind a smooth line.

Everything here is inspectable: the STL components, the F-statistics, the residual z-scores,
the exact cost terms, the MILP schedule, the knapsack solution. The projection is a
seasonal-trend extrapolation and is labelled as such — `F_seasonal` and the GLUT/SPIKE counts
sit next to it so a user can judge whether the series earned the model.

---

## 12. Limitations

These belong in any submission of this work.

1. **The data is 475 days stale** (ends 2025-06-11). The dashboard shows the age and warns
   above 30 days. `p(d)` is a model off that history, not a live quote. `make fetch` is the
   only path to newer data.
2. **The price path is a projection, not a guarantee.** One seasonal cycle of trend plus
   replayed seasonality. It cannot predict a monsoon failure, a border closure or a policy
   change. The conservative mode shifts the path down but does not bound the tail.
3. **Distances are haversine × 1.3, not road distance.** The 1.3 circuity factor is an
   assumption, and real routings vary. `build_dist_matrix(engine="osmnx")` exists to verify the
   ranking; it is not on the default path because the OSM download is large and slow.
4. **13 of 72 mandis are pinned to a district centroid** because Nominatim could not resolve
   the market name. Their distances are approximate; the `mandis.source` column and the UI both
   mark them.
5. **Farmer lot sizes are simulated** (seeded, reproducible). Mandis, distances and board
   prices are real; the tonnage is not.
6. **No arrivals column exists**, so GLUT/SPIKE flags are residual z-scores, not arrival
   pressure, and the 12,500 Rs/qtl onion outlier may be a unit error that survived the
   one-sided guard. Surplus estimates are not cleaned for spoilage.
7. **Every rate in `params.yaml` is an assumption** until its `source: TODO` is filled. Rent,
   diesel, mileage, LTV, interest and opportunity cost are all unverified.
8. **The MILP is a 3-tranche, 10%-floor approximation** of a staggered sale, not a full
   multi-period lot-sizing model with market depth, quality premiums or credit terms.
9. **Crop coverage is uneven.** Only Onion and Potato support the annual model. A future dump
   with 4+ seasons would unlock Tomato, Wheat and Rice.
10. **The one-sided unit-error guard could mask a genuine crash.** Prices below 10% of a
    mandi-commodity median are dropped, which is safe for a 10× unit error but would discard a
    real >90% collapse. The threshold is a single constant (`UNIT_ERROR_FLOOR` in
    `src/data/clean.py`) if that trade-off ever needs revisiting.
11. **The API has no committed test suite, no migrations and no auth.** Tables are created with
    `create_all`, so a schema change is a `drop_all` and a reload rather than a migration; the
    API is unauthenticated, which is fine on localhost and wrong on a network; and the response
    models are deliberately loose about heavy collections (§7.3).

---

## 13. What I would do next

1. **Commit the API tests.** The `fastapi.testclient` harness that found the four bugs in
   §10 belongs in `tests/test_api.py` so the next schema change cannot reintroduce them.
2. **Move the dashboard onto the API.** `app/streamlit_app.py` still reads parquet directly;
   `frontend/` is empty. Pointing the existing app at `/api/decision` would make the database
   the single source of truth and retire the dual data path described in §4.
3. **Add Alembic migrations.** `create_all` is fine for a greenfield load and wrong the first
   time a column changes.
4. **Source the real cost assumptions** — WDRA rent, actual freight contracts, e-NWR LTV — and
   fill the `source:` lines. M2 and M3 are only as good as these.
5. **Add arrivals** (from a separate CEDA source) to replace the z-score GLUT proxy with a real
   arrival-pressure measure.
6. **Swap haversine for cached OSM road distances** and measure how often the mandi ranking
   actually changes.
7. **Backtest M3 honestly:** replay the hold/sell advice across every historical as-of date and
   report realised regret. `as_of` already makes this a loop.
8. **Get a dump with 4+ seasons** so all five crops support the annual model.
