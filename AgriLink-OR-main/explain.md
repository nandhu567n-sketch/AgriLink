# AgriLink-OR — Explained From Zero

A plain-language guide to what this project is, what it shows, and how the numbers behind it
are produced. **No prior knowledge of data, farming or optimisation is assumed.** Read top to
bottom.

---

## 0. The one-sentence version

**AgriLink-OR is a decision-support system that tells a Farmer Producer Organisation (FPO)
three things about a pile of harvested crop: which wholesale market to sell it at for the
most money, whether to hold it and if so on what day, and how to combine farmers' lots to fill
a buyer's big order — using real Karnataka market prices and mathematical optimisation, with
no machine learning.**

---

## 1. The real-world problem (why this exists)

Imagine a group of farmers who farm together as an **FPO** (a Farmer Producer Organisation —
a cooperative). They pool their crop and sell it together.

- A **mandi** is a wholesale market where crops are auctioned and graded, and buyers pay a
  posted **board price** (also called the *modal price*) per quintal.
- A **quintal (qtl)** is 100 kg — the unit all prices here use.

Every mandi publishes a board price, and the natural assumption is "highest board price = best
sale."

**That assumption is wrong.** The board price is not what the FPO ends up *keeping*. After a
sale, the FPO still pays:

| Cost | What it is |
|---|---|
| **Freight** | Diesel + driver + tolls to truck the crop to the mandi and back |
| **Cess / commission** | Government market fee + middleman fee (a % of the sale) |
| **Handling** | Loading and unloading labour per quintal |
| **Transit loss (shrink)** | A little crop spoils or is lost on the road (loss ∝ distance) |

So the mandi with the **highest** board price can easily leave the FPO with the **least**
money in hand, once a long, expensive truck ride is subtracted. Finding the true best mandi is
the first thing this project solves.

On top of that, an FPO also asks:

2. **Should we hold?** Storage isn't free — rent, loan interest, insurance and spoilage cost
   money every single day. But prices move with the season. Sometimes holding for a few weeks
   pays far more than selling today. The FPO needs to know: *on what day does holding beat
   selling now?*
3. **How do we fill a big order?** A buyer may want, say, 400 quintals. Each farmer has their
   own small lot. Which combination of farmers' lots hits 400 quintals with the least leftover
   (surplus) and without one farmer supplying everything?

AgriLink-OR answers all three from the same screen, and it **refuses to answer** anything the
data can't support (see §9).

---

## 2. What "no machine learning" means here (and why it's a feature)

Most people assume "smart price prediction" needs AI. This project **deliberately does not
use any ML or trained model.** Every answer is produced by transparent, inspectable maths:

- A **decomposition** (STL) that splits a price history into trend + seasonality.
- Plain **arithmetic** for the cost walk.
- A **mixed-integer linear program (MILP)** solved by the CBC solver for hold-vs-sell.
- A **bounded knapsack** (with a dynamic-programming cross-check) for lot aggregation.

**Why is this good?** A cooperative deciding whether to store 100 quintals of onion needs to
know *why* and be able to *argue* with the answer. A black-box forecast hides its error bars.
Here the components, the F-statistics, the exact cost terms, the solver schedule and the
knapsack picks are all visible. The projection is honestly labelled a **seasonal-trend model,
not a live quote or a guarantee.**

---

## 3. The shape of the system: three layers

This matters for the rest of the document, so it is worth being precise.

```
   ①  src/       The maths. Four modules that take a table of numbers and return an answer.
                  They never open a file, never touch a database, never draw anything.

   ②  backend/   The service. It loads the data into a real database, then hands the numbers
                  to those same modules and returns the answers as JSON over HTTP.

   ③  app/       The screens people actually look at. The Streamlit dashboard.
```

The reason for the split is **testability**. Because the maths in `src/` is pure, you can feed
it synthetic numbers and check the arithmetic without a database, a network or a browser.
Because all the data access lives in exactly one place (`backend/services/repository.py`), you
can swap "parquet file on disk" for "rows in PostgreSQL" without touching a single line of
the maths — the modules cannot tell the difference.

**Where each piece of data comes from:**

| Artefact | Produced by | Loaded into |
|---|---|---|
| `data/raw/agmarknet_history.parquet` | `make history` | *(intermediate, not loaded)* |
| `data/raw/clean.parquet` | `make clean` | `prices` (14,352 rows) |
| `data/ref/mandis.csv` | `make geocode` | `mandis` (72 rows) |
| `data/ref/dist_matrix.parquet` | `make distmat` | `farm_distances` (72 rows) |
| `data/ref/params.yaml` | hand-maintained | `params` (1 row) |
| the default FPO depot | `src/geo/build_dist_matrix.py` | `farms` (1 row) |
| load timestamp, source file, coverage | computed at load time | `dataset_meta` (9 rows) |

### The new part: a database and an API

The service exposes the same three answers over HTTP, so the dashboard is no longer the only
way in. Eleven operations across ten paths, documented interactively at `/docs`:

| Endpoint | What it gives you |
|---|---|
| `/api/health` | is the service up, and is the database actually loaded |
| `/api/meta` | which crops, varieties, dates and farms exist — enough to build the selectors |
| `/api/decision` | **the main one:** the three answers plus all four modules' working, in one call |
| `/api/m1` … `/api/m4` | the same computation, one module at a time, for inspection |
| `/api/eligible-mandis` | a cheap call for filling the reference-mandi dropdown |
| `/api/params` | read or replace the stored cost assumptions |
| `/api/export/clean-slice.csv` | download exactly the rows behind a decision, to audit it |

Two design choices worth knowing about:

- **A request that doesn't make sense is rejected, not crashed on.** Ask for a crop the
  database has never heard of, or a date outside the data, and you get a clear error naming
  the valid values. Ask for something the maths can't support and you get a stated reason
  instead of a fake number.
- **The assumptions travel with the answer.** Every response includes the exact parameter set
  used, so an answer can be reproduced later, and the CSV export gives you the exact rows to
  re-derive it by hand.

---

## 4. The data (real, not invented)

- **Source:** `Agriculture_price_dataset.csv` — a public Agmarknet price dump.
  - **737,392 rows**, 30 state labels, dates **2023-06-06 → 2025-06-11**.
- **We only use Karnataka:** after cleaning, **14,352 rows, 72 mandis, 21 districts, 5
  crops**:

| Crop | Rows | Mandis | Supports the annual model? |
|---|---|---|---|
| **Onion** | 6,330 | 43 | **yes** |
| **Potato** | 5,174 | 35 | **yes** |
| Tomato | 1,411 | 35 | no (single partial season) |
| Wheat | 1,082 | 24 | no |
| Rice | 355 | 22 | no |

Each row is one *mandi quote* on one day for one crop/variety, with `Min_Price`, `Max_Price`,
and the decision variable `Modal_Price` (Rs/quintal).

### The four data traps that were fixed (and why they mattered)

The original dataset quietly lies in four ways. Each fix was essential and each is locked in
by a test:

1. **Dates are US-style, not day-first.** `6/13/2023` means **13 June**, not 6 March.
   Guessing day-first silently threw away ~8,700 rows. Fixed by pinning the format.
2. **The default crop in the config didn't exist.** The config shipped with "Maize" but
   Karnataka only has Onion/Potato/Tomato/Wheat/Rice. Default is now **Onion**.
3. **Holes in the weekly series.** Mandis report in bursts. A naive fill left too few points
   for the 104-week annual decomposition. Now the grid is filled and the system **shows how
   much was interpolated** so a guess is never mistaken for a measurement.
4. **Rs/kg unit errors.** One mandi intermittently quoted per *kilogram* (~10× too low). A
   one-sided guard drops any quote below 10% of its own mandi-crop median. This removed 39
   poisoned rows while keeping genuine spikes (e.g. ₹13,000 tomato is real).

**There is no "arrivals" column**, so any "surplus pressure" signal (the GLUT/SPIKE flags) is
a *residual z-score proxy*, never a true arrival count.

Of the 72 mandis, **59 were located precisely** and **13 are pinned to their district
centroid** because the geocoder could not resolve the market name. The data records which is
which, and the system marks the 13 rather than pretending their distances are exact.

---

## 5. The four modules (the brain)

Every module is a **pure function**: it takes plain tables/arrays plus a parameters dict and
returns a result. No module reads a file or touches the screen. That's why the maths can be
unit-tested independently of the UI and the database.

### M1 — Seasonal price decomposition (`src/m1_econometrics/stl_bands.py`)

Turns a noisy weekly price series into a **projected price path `p(d)`** that M3 needs:

1. Resample to weekly, take the **median** (robust to double-reporting).
2. Decompose **log-price** with **STL, period 52** (log because price swings are
   *proportional*: ₹500 matters at ₹1,000, not at ₹5,000). `robust=True` so one bad week
   can't bend the trend.
3. Build **volatility bands** on the residual: `upper/lower = exp(trend+seasonal ± 2σ)`.
4. Flag **GLUT** (price unusually *low* for the season → window to buy) and **SPIKE**
   (unusually high) from the residual z-score.
5. Produce **`p(d)`** = a deterministic projection: last-26-week trend slope + last year's
   seasonal shape replayed forward. A **Conservative** toggle shifts the whole path down to
   the lower band.

*M1 is the "what will this crop probably fetch over the next N days" engine.*

### M2 — Net-in-hand ranking (`src/m2_arbitrage/nihr.py`)

Per quintal at each mandi, it walks the money out of the FPO's pocket:

```
r_km     = diesel/mileage + other_cost_per_km
trucks   = ceil(Q / truck_capacity)
freight  = trucks × (fixed_per_trip + return_factor × r_km × km)
gross    = Q × (1 − transit_shrink) × board_price
fees     = gross × (cess + commission)
handling = Q × (loading + unloading) + fixed
net      = gross − fees − handling − freight
net/qtl  = net / Q
```

It ranks mandis by `net/qtl` and keeps the raw-price rank beside it, so the two rankings can be
compared — **that disagreement is the arbitrage**. Distances use **haversine × 1.3** (a
circuity factor for road winding), which is instant, offline, and reproducible.

### M3 — Hold vs sell (`src/m3_milp/`)

**a) Carry cost per quintal per day** — rent + insurance + financing (the crop isn't free
collateral; you pay interest on borrowed money and opportunity cost on your own equity).

**b) Value curve & break-even** — with `θ = 1 − shrink_per_day`, holding `t` days is worth

```
V(t) = θ^t · p(t) − c·t − one_time_fee·[t>0],   V(0) = p₀
```

**Break-even** = first `t` where `V(t) ≥ V(0)`; **peak** = `argmax V`. Note `θ^t`: you
**cannot sell what you put in** — at 1%/month shrink over 180 days you lose ~6% of volume to
spoilage, something a price-only model would hide.

**c) Multi-tranche MILP** (CBC) — maximise revenue from sales minus carry, sale and warehouse
fees, subject to inventory balance, "sell everything by the horizon," and a cap of `K = 3`
sales each with a 10% minimum size. The cap stops the solver returning one clairvoyant sale no
cooperative could execute.

### M4 — Lot aggregation (`src/m4_aggregation/knapsack.py`)

Fill a bulk order `T` minimising **surplus**, with real constraints: total in `[T, T(1+ε)]`
(≤3% over), per-lot multiplicity, and a **concentration cap** (no single farmer > 40% of the
order). A **0/1 subset-sum DP** re-solves the same question independently; the result shows
**both answers side by side** as a cross-check.

### The farmer roster (honesty note)

The dump has no farm-level arrivals, so **lot sizes are simulated** (deterministically, seed
11, from the *real* mandi set, scaled so lots shrink as price rises). Mandis, distances and
board prices in the table are **real**; the tonnage is not. The system says so.

---

## 6. How the data gets in (the pipeline)

Run once (~3 min; geocoding is the slow part):

```bash
make data    # = history + clean + geocode + distmat
```

| Step | Script | Produces |
|---|---|---|
| history | `src/data/load_history.py` | `data/raw/agmarknet_history.parquet` (737k rows) |
| clean | `src.data.clean` | `data/raw/clean.parquet` (Karnataka, unit-error guarded) |
| geocode | `src/geo/geocode_mandis.py` | `data/ref/mandis.csv` (lat/lon per mandi) |
| distmat | `src/geo/build_dist_matrix.py` | `data/ref/dist_matrix.parquet` (farm→mandi km) |

Then the artefacts go into the database:

```bash
make reset-db   # = python -m backend.seed.load_db --reset
```

```
loaded   : prices=14,352 mandis=72 farm_distances=72 params=1 meta=9
coverage : 2023-06-06 -> 2025-06-11 | 72 mandis | 5 crops
```

And then either the dashboard or the API can serve from it:

```bash
make test      # 43 tests
make app       # http://localhost:8501
make backend   # http://localhost:8000/docs
```

`params.yaml` (`data/ref/params.yaml`) holds **every cost assumption**, each with a
`source:` field. A `source: TODO` line means *assumed, not yet verified*. The sidebar sliders
temporarily override these for your session only; `PUT /api/params` changes the stored set for
everybody.

---

## 7. The dashboard

The screen is a **professional light-theme dashboard** — clean white surfaces, a white-and-red
palette (`#D7263D`), soft shadows, and subtle **motion** to guide the eye. It is layered so a
**first-time visitor** understands the project before touching any control.

### The top-to-bottom journey

1. **Hero — "what am I looking at?"** A headline, a plain-English explanation of the problem,
   and a live **cost-walk equation** using your current selection:
   `Board price − transit loss − freight − cess/handling = NET IN HAND`. Below it, three
   **question cards** (SELL AT / HOLD? / BULK ORDER) and an **animated pipeline strip**
   (Data → M1 STL → M2 → M3 → M4 → Decision) whose dots flow left-to-right to show the pipeline
   is a sequence of pure functions.
2. **A "New here? 60-second tour" expander** — four steps: set the world, read the three
   cards, drill into the tabs, then argue with the assumptions.
3. **A scrolling ticker** with dataset facts (rows, mandis, districts, coverage, "No ML").
4. **Data provenance & freshness** — row count, coverage window, mandi count, and **data age
   in days**, with a warning when the data is stale (it currently ends 2025-06-11).
5. **Reference-mandi selector** — which mandi's weekly series feeds the price path (defaults
   to the least-interpolated one). If a crop has no full annual cycle, an honest error appears
   instead of a fake projection.
6. **Recommendation — three big cards**:
   - **SELL AT** — winning mandi + net Rs/qtl + km.
   - **HOLD** — best day to sell, break-even day, gain, and the MILP verdict. If holding never
     pays, the card says **SELL NOW**.
   - **BULK ORDER** — qtl filled, surplus, farmers used (with the DP cross-check).
7. **Five tabs** (each opens with a one-sentence "how to read this" note):
   - **Market (STL)** — price history with trend, seasonal bands, GLUT/SPIKE markers, and the
     projected path, with an animated **"Play projection"** cursor. Side panels show
     decomposition strength and the seasonal index by month.
   - **Where to sell** — an **animated bar "rank reveal"** that scores mandis one by one, the
     full costed table, and a **map** (folium) with a pulsing "FPO origin" marker and mandis
     coloured green (best net) → red (worst net).
   - **Hold vs Sell** — the **value curve V(t)** with "sell now", break-even and peak markers,
     plus the break-even table and the multi-tranche MILP schedule.
   - **Aggregate** — the farmer lots (selected ones highlighted), the knapsack result, and the
     DP cross-check.
   - **Inputs** — the full `params.yaml` and a **download button** for the exact Karnataka slice
     in view, so you can audit it.
8. **Footer** — one-line summary of the stack and the "no ML / auditable / 43 tests" stance.

### How the motion is used (not decoration, for meaning)

- **Flowing dots** on the pipeline = data flowing through the modules.
- **Animated bar reveal** = mandis being scored and ranked.
- **Projection sweep** = the forecast extending into the future.
- **Pulsing origin marker** = "this is the live anchor."
- **Fade-up, shimmer, hover-lift, scrolling ticker** = guide a first-time reader in order.
- All motion respects `prefers-reduced-motion`.

### What the interactivity is for

The **sidebar** is the control room: **Crop** and **Variety** (what's in scope), **Price as of**
(a point-in-time cut — move it back and you *replay* a past decision on what was known then),
**Quote window** (mandis skip days, so prices are the median over N days), then the **decision
inputs** (volume, horizon, conservative toggle, farmer pool, order size) and **cost
assumptions** (rent, diesel, interest, LTV, shrink, cess, farm location). Move any slider and
all three cards, charts and the map recompute live.

---

## 8. A worked example (the real default run)

With the shipped defaults — **Onion**, all varieties, as of **2025-06-11**, **200 qtl**, farm
at **14.30 / 76.00** (Davangere belt), 14-day quote window, 180-day horizon:

- **SELL AT → Channarayapatna, net ₹2,756/qtl, 211 km away.** Board price ₹3,000. The nearby
  Davangere mandi (25 km) pays only ₹1,600 and nets ₹1,523/qtl; the winner pays ₹3,000 and
  *still* nets ₹1,233/qtl more after 211 km of freight, because the price gap dwarfs transport
  cost. (12 of 43 onion mandis were still quoting in the window.) The cost walk per quintal:
  `3,000 − 12.65 transit − 133.62 freight − 89.62 fees − 8.00 handling = 2,756`.
- **HOLD → 157 days, break-even day 4, gain ₹2,182/qtl.** Reference Davangere: 106 weekly
  points, 11% interpolated, `F_seasonal` 0.9996 (a strong seasonal fit), 3 GLUT / 0 SPIKE
  weeks. Seasonal index 0.62–1.56, peaking in **November** and bottoming in **May** — the
  correct Karnataka onion cycle. Projected path ₹2,484 → ₹3,081 (d30) → ₹4,615 (d90) →
  ₹4,541 (d180). The MILP (CBC) agrees: one tranche of ~190 qtl sold on day 157, objective
  ≈ ₹9.3 lakh (it sells ~190 rather than 200 because shrink consumed the rest).
- **BULK ORDER → 400 qtl, surplus 0, 8 farmers** from a 25-farmer pool offering 1,373 qtl.
  The independent 0/1 DP returns the same 0 surplus.

Raise diesel to ₹130/litre and the winner's net becomes ₹2,714 — the recommendation is not
knife-edge on fuel. The data currently ends **2025-06-11** (~475 days before today), so the
projection is a model off that history and the system warns above 30 days.

---

## 9. When it refuses to answer (integrity by design)

The system **will not fabricate**:

- **Thin crops** (Tomato / Wheat / Rice) don't have two full annual cycles in this dump, so
  **hold-vs-sell is disabled** with a clear message instead of a fit to noise.
- If a crop has **no recent quotes** in the window, the SELL AT answer is absent rather than an
  invented price.
- If the farmer pool **can't reach** the order, the BULK ORDER result reports the real status
  (`Infeasible`) and the pool size instead of printing a fake 0-quintal fill.
- **Bad input is rejected, not crashed on.** An unknown crop or variety, or a date outside the
  data, comes back as a named error listing the valid values.
- The **stale-data warning** and the "assumptions are unverified" framing stay visible on
  purpose.

---

## 10. Honesty: known limitations

1. Data is **~475 days stale**; the projection is a model, not a live quote.
2. The price path is a **seasonal-trend extrapolation** — it can't predict a monsoon failure, a
   border closure, or a policy change.
3. Distances are **haversine × 1.3**, not true road distance (an OSMnx road-distance
   verification path exists but is off the default route).
4. **13 of 72 mandis** are pinned to a district centroid; the data records and the UI marks
   them.
5. **Farmer lot sizes are simulated** (seeded). Mandis/distances/prices are real; tonnage isn't.
6. **No arrivals column**, so GLUT/SPIKE are residual z-scores, not arrival pressure.
7. **Every rate in `params.yaml` is an assumption** until its `source:` is filled.
8. The **MILP is a 3-tranche approximation**, not a full multi-period lot-sizing model.
9. **Only Onion and Potato** support the annual model on this dump.
10. The one-sided unit-error guard could in principle mask a genuine >90% crash (the single
    tunable is `UNIT_ERROR_FLOOR` in `src/data/clean.py`).

---

## 11. Project layout

See [README.md §Layout](README.md#layout) for the annotated tree. The contract in one line:
**every module in `src/` is a pure function over plain DataFrames/arrays plus a params dict;
no module reads a file or touches the UI; all database access is confined to
`backend/services/repository.py`.**

---

## 12. How to run it (quick reference)

```bash
pip install -r requirements.txt
make data        # history + clean + geocode + distmat  (~3 min)
make reset-db    # load the artefacts into the database
make test        # 43 tests
make app         # http://localhost:8501   (dashboard)
make backend     # http://localhost:8000/docs  (API)
```

No `make`? Each target has a plain `python -m` equivalent (see [RUN.md](RUN.md)).

**Optional:** live current prices need `DATA_GOV_KEY` in `.env` then `make fetch`;
road-distance verification needs `pip install osmnx networkx geopandas shapely`.

---

*This document accompanies the live dashboard. The numbers quoted above were produced by
re-running the pipeline and the modules on the current dataset (Onion defaults) and reading
them back out of the API.*
