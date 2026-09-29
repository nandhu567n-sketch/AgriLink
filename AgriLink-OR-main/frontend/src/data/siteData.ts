export interface MandiRankItem {
  rank: number;
  market: string;
  state: string;
  district: string;
  km: number;
  board_price: number;
  transit_loss: number;
  freight: number;
  fees: number;
  handling: number;
  net_per_qtl: number;
  rank_board: number;
  arbitrage_vs_nearest: number;
  source: 'market' | 'district_fallback';
}

export interface SeasonalMonthItem {
  month: string;
  monthNum: number;
  dates: string;
  index: number;
  status: 'peak' | 'trough' | 'neutral';
  variancePct: number;
}

export interface ApiEndpointItem {
  method: 'GET' | 'PUT';
  path: string;
  summary: string;
  params: string;
  statusCodes: string;
  responsePreview: string;
}

export interface SchemaTableItem {
  name: string;
  rowsOnFreshLoad: string;
  pk: string;
  purpose: string;
  indexedColumns: string[];
}

export const SITE_STATS = {
  karnatakaRows: 14352,
  karnatakaMandis: 72,
  karnatakaDistricts: 21,
  karnatakaCrops: 5,
  nationalRows: 727050,
  nationalStates: 26,
  nationalMandis: 1611,
  sourceDumpRows: 737392,
  startDate: "2023-06-06",
  endDate: "2025-06-11",
  testsPassing: 43,
  apiEndpoints: 11,
  apiPaths: 10,
  dataAgeDays: 475, // Stale warning threshold > 30 days
  defaultOrigin: {
    name: "Davangere FPO Hub (Depot)",
    lat: 14.30,
    lon: 76.00
  },
  defaultScenario: {
    crop: "Onion",
    variety: "All",
    volumeQtl: 200,
    horizonDays: 180,
    dieselPrice: 90.0,
    truckCapacity: 100,
    warehouseRentPerMonth: 6.0,
    pledgeLoanLtv: 0.70,
    pledgeInterestYr: 0.09,
    opportunityCostYr: 0.12,
    monthlyShrinkPct: 0.01,
    transitShrinkPerKm: 0.00005,
    cessPct: 0.015,
  }
};

export const WORKED_EXAMPLE = {
  crop: "Onion",
  topMandi: "Channarayapatna",
  distanceKm: 211,
  boardPrice: 3025,
  transitLoss: 32,
  freightPerQtl: 161,
  cessAndHandling: 76,
  netInHand: 2756,
  holdDecision: "HOLD",
  holdDays: 157,
  breakevenDay: 4,
  gainPerQtl: 2182,
  milpObjective: 931330,
  bulkOrderTarget: 400,
  bulkOrderSurplus: 0,
  farmersChosen: 8,
  farmersInPool: 25,
  dpCrossCheckSurplus: 0
};

export const THREE_WS = [
  {
    id: "where",
    letter: "W1",
    tag: "W1 · M2",
    title: "WHERE TO SELL?",
    subtitle: "Spatial Arbitrage & Net-In-Hand Realisation",
    cardTitle: "SELL AT",
    cardValue: "Channarayapatna",
    cardDelta: "net ₹2,756/qtl · 211 km",
    cardNote: "Board ₹3,025 (rank #1) · ₹184 better than nearest mandi",
    module: "Module 2: Net-In-Hand Arbitrage (NIHR)",
    icon: "MapPin",
    problem: "The number posted on the APMC mandi board is deceptive. A market posting the highest nominal quote is often hundreds of kilometers away. Billed two-way diesel freight, driver batta, tolls, dehydration shrinkage en route, and statutory mandi cess eat away revenues.",
    solution: "AgriLink-OR deducts every direct rupee out of pocket per quintal. It ranks local Karnataka mandis and checks all 26 states across India. When Board Rank ≠ Net Rank, that divergence is pure spatial arbitrage.",
    formula: "NIHR = [Board_Price × (1 - Transit_Loss)] - (Freight + Cess + Commission + Handling) / Q",
    linkText: "Explore M2 Arbitrage",
  },
  {
    id: "when",
    letter: "W2",
    tag: "W2 · M3",
    title: "WHEN TO SELL?",
    subtitle: "Temporal Arbitrage & Optimal Stopping",
    cardTitle: "HOLD",
    cardValue: "157 days",
    cardDelta: "break-even d4 · gain ₹2,182/qtl",
    cardNote: "Carry ₹0.92/qtl/day · CBC MILP 189.8 qtl liquidated",
    module: "Module 3: Break-Even Horizon & CBC MILP",
    icon: "Clock",
    problem: "Post-harvest market saturation depresses prices, tempting FPOs to store produce in warehouses. But storage burns cold hard cash: discrete 30-day block rent, e-NWR pledge loan interest (9%), equity cost of capital (12%), and continuous physical moisture shrinkage (~1%/month).",
    solution: "AgriLink-OR evaluates the physical decay curve V(t) = θᵗ·p(t) - c·t - fees to find the exact Break-Even Day (d_be). It then solves a 3-tranche CBC MILP with a 10% minimum sale constraint to deliver an actionable staggered liquidation schedule.",
    formula: "V(t) = θᵗ · p(t) - c·t - Entry_Fee · [t > 0], where θ = 1 - shrink/day",
    linkText: "Explore M3 Hold vs Sell",
  },
  {
    id: "whom",
    letter: "W3",
    tag: "W3 · M4",
    title: "TO WHOM TO SELL?",
    subtitle: "Combinatorial Bulk Order Procurement",
    cardTitle: "BULK ORDER",
    cardValue: "400 qtl",
    cardDelta: "surplus 0 qtl · 8 farmers",
    cardNote: "DP 0/1 Subset-Sum cross-check agrees exactly (0 surplus)",
    module: "Module 4: Bounded Knapsack & Dynamic Programming",
    icon: "PackageCheck",
    problem: "Institutional bulk buyers (modern retail chains, food processors) contract for large lots (e.g. 400 quintals) with strict delivery bounds (≤ 3% surplus). Smallholder farmers offer fragmented lots of 5–30 quintals. The FPO risks excess unsold stock or unfair favoritism towards a single wealthy member.",
    solution: "AgriLink-OR solves a Bounded Knapsack via COIN-OR CBC MILP with an anti-monopoly concentration cap (no farmer > 40%). It cross-verifies the solution against an independent 0/1 Subset-Sum Dynamic Programming algorithm in O(N·S) time.",
    formula: "min ∑ Surplus  s.t.  ∑ qᵢxᵢ ≥ T,  ∑ qᵢxᵢ ≤ T(1+ε),  qᵢxᵢ ≤ max_share · T(1+ε)",
    linkText: "Explore M4 Lot Aggregation",
  }
];

export const PIPELINE_STAGES = [
  {
    step: "01",
    name: "Data Ingest & Clean",
    code: "data/raw/clean.parquet",
    desc: "National Agmarknet dump (737,392 rows) filtered, unit-error quarantined (modal < 10% median dropped), geocoded to 1,611 mandis.",
    stat: "727,050 rows · 26 states"
  },
  {
    step: "02",
    name: "M1 · STL Decomposition",
    code: "src/m1_econometrics/",
    desc: "Weekly grid resampling, robust LOESS decomposition (period 52), ±2σ residual volatility bands, GLUT/SPIKE z-score flags, and projected price path p(d).",
    stat: "No changepoint hiding"
  },
  {
    step: "03",
    name: "M2 · Net-in-Hand Ranking",
    code: "src/m2_arbitrage/",
    desc: "Net cash walk accounting for two-way diesel freight, 1.3× road circuity, in-transit shrink, cess, and handling across local & interstate markets.",
    stat: "Arbitrage when Rank_Board ≠ Net"
  },
  {
    step: "04",
    name: "M3 · Hold vs Sell MILP",
    code: "src/m3_milp/",
    desc: "Continuous decay value curve V(t), break-even horizon scan, and 3-tranche CBC Mixed-Integer Linear Program for executable staggered liquidation.",
    stat: "θᵗ volume decay + debt carry"
  },
  {
    step: "05",
    name: "M4 · Knapsack Aggregation",
    code: "src/m4_aggregation/",
    desc: "Bounded knapsack fills bulk order target with ≤3% surplus, enforces <40% farm concentration cap, cross-checked with 0/1 Subset-Sum DP.",
    stat: "Dual-solver mathematical proof"
  }
];

export const SAMPLE_MANDIS: MandiRankItem[] = [
  {
    rank: 1,
    market: "Channarayapatna",
    state: "Karnataka",
    district: "Hassan",
    km: 211,
    board_price: 3025,
    transit_loss: 32,
    freight: 161,
    fees: 45,
    handling: 31,
    net_per_qtl: 2756,
    rank_board: 1,
    arbitrage_vs_nearest: 184,
    source: "market"
  },
  {
    rank: 2,
    market: "Bangalore (Binny Mill)",
    state: "Karnataka",
    district: "Bangalore Urban",
    km: 260,
    board_price: 3000,
    transit_loss: 39,
    freight: 198,
    fees: 45,
    handling: 31,
    net_per_qtl: 2687,
    rank_board: 2,
    arbitrage_vs_nearest: 115,
    source: "market"
  },
  {
    rank: 3,
    market: "Hubli (Amaragol)",
    state: "Karnataka",
    district: "Dharwad",
    km: 148,
    board_price: 2850,
    transit_loss: 21,
    freight: 113,
    fees: 43,
    handling: 31,
    net_per_qtl: 2642,
    rank_board: 5,
    arbitrage_vs_nearest: 70,
    source: "market"
  },
  {
    rank: 4,
    market: "Davangere (Depot APMC)",
    state: "Karnataka",
    district: "Davangere",
    km: 14,
    board_price: 2650,
    transit_loss: 2,
    freight: 18,
    fees: 40,
    handling: 18,
    net_per_qtl: 2572,
    rank_board: 8,
    arbitrage_vs_nearest: 0,
    source: "market"
  },
  {
    rank: 5,
    market: "Belgaum",
    state: "Karnataka",
    district: "Belgaum",
    km: 242,
    board_price: 2800,
    transit_loss: 34,
    freight: 185,
    fees: 42,
    handling: 31,
    net_per_qtl: 2508,
    rank_board: 6,
    arbitrage_vs_nearest: -64,
    source: "market"
  },
  {
    rank: 6,
    market: "Pune (Interstate)",
    state: "Maharashtra",
    district: "Pune",
    km: 610,
    board_price: 3750,
    transit_loss: 114,
    freight: 465,
    fees: 56,
    handling: 35,
    net_per_qtl: 3080,
    rank_board: 1,
    arbitrage_vs_nearest: 508,
    source: "market"
  }
];

export const SEASONAL_MONTHS: SeasonalMonthItem[] = [
  { month: "Jan", monthNum: 1, dates: "01 Jan – 31 Jan", index: 1.08, status: "neutral", variancePct: 8.0 },
  { month: "Feb", monthNum: 2, dates: "01 Feb – 28 Feb", index: 0.94, status: "trough", variancePct: -6.0 },
  { month: "Mar", monthNum: 3, dates: "01 Mar – 31 Mar", index: 0.82, status: "trough", variancePct: -18.0 },
  { month: "Apr", monthNum: 4, dates: "01 Apr – 30 Apr", index: 0.71, status: "trough", variancePct: -29.0 },
  { month: "May", monthNum: 5, dates: "01 May – 31 May", index: 0.62, status: "trough", variancePct: -38.0 },
  { month: "Jun", monthNum: 6, dates: "01 Jun – 30 Jun", index: 0.78, status: "trough", variancePct: -22.0 },
  { month: "Jul", monthNum: 7, dates: "01 Jul – 31 Jul", index: 0.95, status: "neutral", variancePct: -5.0 },
  { month: "Aug", monthNum: 8, dates: "01 Aug – 31 Aug", index: 1.12, status: "peak", variancePct: 12.0 },
  { month: "Sep", monthNum: 9, dates: "01 Sep – 30 Sep", index: 1.28, status: "peak", variancePct: 28.0 },
  { month: "Oct", monthNum: 10, dates: "01 Oct – 31 Oct", index: 1.45, status: "peak", variancePct: 45.0 },
  { month: "Nov", monthNum: 11, dates: "01 Nov – 30 Nov", index: 1.56, status: "peak", variancePct: 56.0 },
  { month: "Dec", monthNum: 12, dates: "01 Dec – 31 Dec", index: 1.34, status: "peak", variancePct: 34.0 }
];

export const API_ENDPOINTS: ApiEndpointItem[] = [
  {
    method: "GET",
    path: "/api/health",
    summary: "Service liveness and database fact table verification",
    params: "none",
    statusCodes: "200, 503",
    responsePreview: `{"status": "ok", "api_version": "2.0.0", "data_loaded": true, "tables": {"prices": 14352, "mandis": 72, "farms": 1}}`
  },
  {
    method: "GET",
    path: "/api/meta",
    summary: "Available crops, varieties, dates, farms, and provenance",
    params: "none",
    statusCodes: "200",
    responsePreview: `{"crops": ["Onion", "Potato", "Rice", "Tomato", "Wheat"], "coverage": {"start": "2023-06-06", "end": "2025-06-11"}}`
  },
  {
    method: "GET",
    path: "/api/decision",
    summary: "Executive orchestrator — returns all three 3W cards + full M1–M4 models",
    params: "crop, as_of, variety?, volume?, horizon?, conservative?, overrides?",
    statusCodes: "200, 400, 422, 503",
    responsePreview: `{"cards": {"sell_at": {"market": "Channarayapatna", "net_per_qtl": 2756.11}, "hold": {"best_day": 157, "breakeven_day": 4}, "bulk_order": {"surplus": 0.0, "chosen": 8}}}`
  },
  {
    method: "GET",
    path: "/api/m1",
    summary: "M1 STL decomposition, bands, flags, and projected path p(d)",
    params: "crop, as_of, horizon, conservative",
    statusCodes: "200, 400, 422",
    responsePreview: `{"seasonal_strength": 0.9996, "trend_strength": 0.9993, "glut_weeks": 3, "spike_weeks": 0, "path_start": 2484.2}`
  },
  {
    method: "GET",
    path: "/api/m2",
    summary: "M2 Net-in-hand spatial ranking across all quoting mandis",
    params: "crop, as_of, volume, farm_lat, farm_lon, window_days",
    statusCodes: "200, 400, 422",
    responsePreview: `{"best_mandi": "Channarayapatna", "net_per_qtl": 2756.11, "board_price": 3025.0, "freight": 160.8, "arbitrage": 184.2}`
  },
  {
    method: "GET",
    path: "/api/m3",
    summary: "M3 Carry costs, V(t) value curve, and CBC MILP liquidation",
    params: "crop, as_of, volume, horizon",
    statusCodes: "200, 400, 422",
    responsePreview: `{"carry_cost_day": 0.92, "breakeven_day": 4, "peak_day": 157, "milp_status": "Optimal", "objective_gain": 931330}`
  },
  {
    method: "GET",
    path: "/api/m4",
    summary: "M4 Farmer lots, bounded knapsack allocation, and DP cross-check",
    params: "crop, as_of, order, n_farmers",
    statusCodes: "200, 400, 422",
    responsePreview: `{"order_target": 400, "surplus": 0.0, "farmers_selected": 8, "dp_surplus": 0.0, "dp_agrees": true}`
  },
  {
    method: "GET",
    path: "/api/eligible-mandis",
    summary: "List of mandis with ≥104 weeks of data eligible for annual STL",
    params: "crop, as_of",
    statusCodes: "200, 400",
    responsePreview: `{"eligible": ["Davangere", "Channarayapatna", "Bangalore", "Hubli", "Belgaum"]}`
  },
  {
    method: "GET",
    path: "/api/params",
    summary: "Current version-controlled cost assumptions from params.yaml",
    params: "none",
    statusCodes: "200",
    responsePreview: `{"storage": {"rent_per_qtl_month": 6.0, "loan_interest": 0.09}, "freight": {"diesel_price": 90.0}}`
  },
  {
    method: "PUT",
    path: "/api/params",
    summary: "Replace stored assumptions in database and invalidate caches",
    params: "JSON payload matching schema",
    statusCodes: "200, 400, 422",
    responsePreview: `{"status": "updated", "invalidated_caches": true}`
  },
  {
    method: "GET",
    path: "/api/export/clean-slice.csv",
    summary: "Download exact raw rows behind the active decision for audit",
    params: "crop, as_of, variety?",
    statusCodes: "200 (CSV stream), 400",
    responsePreview: `date,commodity,variety,market,district,modal_price\n2025-06-11,Onion,Local,Channarayapatna,Hassan,3025.0`
  }
];

export const SCHEMA_TABLES: SchemaTableItem[] = [
  {
    name: "prices",
    rowsOnFreshLoad: "14,352",
    pk: "id (BigInteger autoincrement)",
    purpose: "Agmarknet fact table: daily mandi quotes with min, max, and modal prices.",
    indexedColumns: ["(commodity, market, date)", "(date)", "(commodity, date)"]
  },
  {
    name: "mandis",
    rowsOnFreshLoad: "72 (1,611 Pan-India)",
    pk: "market (String)",
    purpose: "Mandi master directory: district, verified lat/lon, geocode provenance (market vs district_fallback).",
    indexedColumns: ["market", "district"]
  },
  {
    name: "farms",
    rowsOnFreshLoad: "1",
    pk: "farm_id (String)",
    purpose: "FPO procurement hub & ship-from depot (Default: Davangere at 14.30°N, 76.00°E).",
    indexedColumns: ["farm_id"]
  },
  {
    name: "farm_distances",
    rowsOnFreshLoad: "72",
    pk: "(farm_id, market) composite",
    purpose: "Precomputed distance matrix (haversine × 1.3 road circuity) for zero-latency audit.",
    indexedColumns: ["farm_id", "market"]
  },
  {
    name: "params",
    rowsOnFreshLoad: "1",
    pk: "name (String)",
    purpose: "Persisted operational assumptions matching params.yaml stored as validated JSON.",
    indexedColumns: ["name"]
  },
  {
    name: "dataset_meta",
    rowsOnFreshLoad: "9",
    pk: "key (String)",
    purpose: "Provenance registry: source dump file, row counts, coverage window, loader timestamp.",
    indexedColumns: ["key"]
  }
];

export const ZERO_ML_REASONS = [
  {
    title: "1. Fiduciary Duty & Cooperative Governance",
    desc: "When an FPO board stores 500 quintals of member onions, farmers' livelihoods and bank loans are on the line. If a storage bet loses money, cooperative leadership cannot defend the outcome with 'the neural network hallucinated a price rise.' In AgriLink-OR, every single rupee is accountable: warehouse rent was ₹X, pledge loan interest was ₹Y, shrinkage was Z%, and diesel was ₹90/L.",
    icon: "ShieldAlert"
  },
  {
    title: "2. Zero Hidden Changepoints",
    desc: "Popular ML packages like Prophet automatically insert piecewise linear changepoints and hide volatility behind smoothed trendlines. In seasonal agriculture, supply swings are sudden and severe. AgriLink-OR uses robust LOESS decomposition (STL, robust=True) with ±2σ residual volatility bands, and explicitly surfaces GLUT and SPIKE outlier weeks from residual z-scores.",
    icon: "Sliders"
  },
  {
    title: "3. Institutional Bank & e-NWR Compliance",
    desc: "Commercial lenders issuing Electronic Negotiable Warehouse Receipt (e-NWR) loans demand transparent cash-flow break-even horizons. AgriLink-OR produces an exact deterministic break-even day (d_be) where cumulative price rise overtakes debt service and physical decay. No bank accepts a black-box probability distribution.",
    icon: "Landmark"
  },
  {
    title: "4. Complete Reproducibility Across 43 Unit Tests",
    desc: "Every module in src/ is a pure mathematical function: inputs in, answers out, with zero disk I/O, no network calls, and no random seeds. The exact same numbers result whether reading from local Parquet files or querying PostgreSQL via SQLAlchemy.",
    icon: "CheckCircle2"
  }
];
