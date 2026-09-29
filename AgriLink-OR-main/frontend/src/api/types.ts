export interface HealthResponse {
  status: string;
  api_version: string;
  database: string;
  db_kind: string;
  data_loaded: boolean;
  tables: Record<string, number>;
}

export interface DatasetMeta {
  source_file?: string;
  source_rows?: string;
  mandis?: string;
  districts?: string;
  crops?: string;
  coverage_start?: string;
  coverage_end?: string;
  loader?: string;
  loaded_at?: string;
}

export interface Farm {
  farm_id: string;
  name: string;
  lat: number;
  lon: number;
}

export interface MetaResponse {
  crops: string[];
  varieties: Record<string, string[]>;
  date_min: string;
  date_max: string;
  rows_total: number;
  markets_total: number;
  districts_total: number;
  crops_total: number;
  districts: string[];
  mandis_geo: number;
  mandis_centroid: number;
  farms: Farm[];
  default_farm: Farm | null;
  distance_rows: number;
  distance_max_km: number | null;
  params: any;
  dataset: DatasetMeta;
  stl_period: number;
  min_weeks: number;
  defaults: {
    window_days: number;
    volume: number;
    horizon: number;
    n_farmers: number;
    order: number;
    variety: string;
    conservative: boolean;
  };
}

export interface StlSeriesPoint {
  date: string;
  price: number;
  trend: number;
  trend_seasonal: number;
  upper: number;
  lower: number;
  flag: string;
}

export interface PricePathPoint {
  date: string;
  p: number;
}

export interface SeasonalIndexPoint {
  month: number;
  index: number;
}

export interface M1Response {
  period: number;
  min_weeks: number;
  eligible: string[];
  ref_mandi: string | null;
  error: string | null;
  imputed_warning: string | null;
  coverage: {
    weeks: number;
    observed: number;
    imputed_frac: number;
  } | null;
  strengths: {
    seasonal: number;
    trend: number;
  } | null;
  glut_weeks: number | null;
  spike_weeks: number | null;
  path_start: number | null;
  path_end: number | null;
  series: StlSeriesPoint[];
  path: PricePathPoint[];
  seasonal_index: SeasonalIndexPoint[];
}

export interface M2CostWalk {
  board_price: number;
  transit_loss: number;
  freight: number;
  fees: number;
  handling: number;
  net_per_qtl: number;
}

export interface M2Top {
  market: string;
  district: string;
  km: number;
  board_price: number;
  net_per_qtl: number;
  rank_board: number;
  arbitrage_vs_nearest: number;
}

export interface M2BoardTop {
  market: string;
  board_price: number;
  net_per_qtl: number;
  rank_board: number;
}

export interface M2Row {
  market: string;
  district?: string;
  state?: string;
  lat?: number;
  lon?: number;
  km: number;
  board_price: number;
  freight: number;
  fees: number;
  handling: number;
  net_total: number;
  net_per_qtl: number;
  rank_board: number;
  arbitrage_vs_nearest: number;
  source?: string;
}

export interface M2Response {
  rows: M2Row[];
  count: number;
  top: M2Top | null;
  board_top: M2BoardTop | null;
  gap_per_qtl: number | null;
  cost_walk: M2CostWalk | null;
}

export interface M3MilpScheduleItem {
  day: number;
  qtl_sold: number;
  price: number;
  gross: number;
}

export interface M3Milp {
  status: string;
  profit: number | null;
  schedule: M3MilpScheduleItem[];
}

export interface M3CurvePoint {
  t: number;
  v: number;
}

export interface M3Response {
  available: boolean;
  error: string | null;
  carry_per_qtl_day: number | null;
  shrink_per_day?: number;
  breakeven_day: number | null;
  best_day: number | null;
  best_gain_per_qtl: number | null;
  curve: M3CurvePoint[];
  milp: M3Milp | null;
}

export interface M4Lot {
  id: number;
  farmer_id?: string;
  market: string;
  qty: number;
  count: number;
  km: number;
  selected?: boolean;
}

export interface M4Agg {
  status: string;
  total: number;
  surplus: number;
  chosen: number[];
  chosen_count: number;
  dp_agrees: boolean;
}

export interface M4Response {
  available: boolean;
  error: string | null;
  lots: M4Lot[];
  order: number;
  pool_total: number;
  dp_surplus: number | null;
  agg: M4Agg | null;
}

export interface DecisionProvenance {
  rows_total: number;
  markets_total: number;
  districts_total: number;
  crops_total: number;
  first_date: string;
  latest_date: string;
  age_days: number;
  stale: boolean;
  rows_in_view: number;
  markets_in_view: number;
  districts_in_view: number;
  crop_markets: number;
  n_quoting: number;
  quote_window_days: number;
  as_of: string;
  crop: string;
  variety: string;
  source_file?: string;
  loaded_at?: string;
  no_arrivals_column?: boolean;
}

export interface DecisionCards {
  sell_at: M2Top | null;
  hold: M3Response | null;
  bulk_order: M4Agg | null;
  m1_error: string | null;
}

export interface DecisionResponse {
  selection: {
    crop: string;
    as_of: string;
    variety: string;
    window_days: number;
    volume: number;
    horizon: number;
    conservative: boolean;
    farm_lat: number;
    farm_lon: number;
    n_farmers: number;
    order: number;
    ref_mandi?: string | null;
  };
  params: any;
  provenance: DecisionProvenance;
  cards: DecisionCards;
  m1: M1Response;
  m2: M2Response;
  m3: M3Response;
  m4: M4Response;
}

export interface DecisionQueryParams {
  crop: string;
  as_of: string;
  variety?: string;
  window_days?: number;
  volume?: number;
  horizon?: number;
  conservative?: boolean;
  farm_lat?: number;
  farm_lon?: number;
  n_farmers?: number;
  order?: number;
  ref_mandi?: string | null;
  overrides?: Record<string, any>;
}
