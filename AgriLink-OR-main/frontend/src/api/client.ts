import type {
  DecisionQueryParams,
  DecisionResponse,
  HealthResponse,
  MetaResponse,
} from './types';

const API_BASE = 'http://localhost:8000/api';

class ApiError extends Error {
  status: number;
  data: any;

  constructor(status: number, message: string, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!res.ok) {
      let errDetail = `HTTP ${res.status} ${res.statusText}`;
      let errData = null;
      try {
        errData = await res.json();
        if (errData && errData.detail) {
          errDetail = typeof errData.detail === 'string' ? errData.detail : JSON.stringify(errData.detail);
        }
      } catch {
        // use fallback text
      }
      throw new ApiError(res.status, errDetail, errData);
    }

    return (await res.json()) as T;
  } catch (err: any) {
    if (err instanceof ApiError) {
      throw err;
    }
    throw new ApiError(0, `Network error connecting to API: ${err.message || 'Server unreachable'}`);
  }
}

export const api = {
  async getHealth(): Promise<HealthResponse> {
    return request<HealthResponse>('/health');
  },

  async getMeta(): Promise<MetaResponse> {
    return request<MetaResponse>('/meta');
  },

  async getDecision(params: DecisionQueryParams): Promise<DecisionResponse> {
    const query = new URLSearchParams();
    query.set('crop', params.crop);
    query.set('as_of', params.as_of);
    if (params.variety) query.set('variety', params.variety);
    if (params.window_days !== undefined) query.set('window_days', String(params.window_days));
    if (params.volume !== undefined) query.set('volume', String(params.volume));
    if (params.horizon !== undefined) query.set('horizon', String(params.horizon));
    if (params.conservative !== undefined) query.set('conservative', String(params.conservative));
    if (params.farm_lat !== undefined) query.set('farm_lat', String(params.farm_lat));
    if (params.farm_lon !== undefined) query.set('farm_lon', String(params.farm_lon));
    if (params.n_farmers !== undefined) query.set('n_farmers', String(params.n_farmers));
    if (params.order !== undefined) query.set('order', String(params.order));
    if (params.ref_mandi) query.set('ref_mandi', params.ref_mandi);
    if (params.overrides && Object.keys(params.overrides).length > 0) {
      query.set('overrides', JSON.stringify(params.overrides));
    }

    return request<DecisionResponse>(`/decision?${query.toString()}`);
  },

  async getEligibleMandis(crop: string, as_of: string, variety = 'All'): Promise<{ crop: string; as_of: string; eligible: string[] }> {
    const query = new URLSearchParams({ crop, as_of, variety });
    return request(`/eligible-mandis?${query.toString()}`);
  },

  async getParams(): Promise<any> {
    return request<any>('/params');
  },

  async updateParams(payload: any): Promise<any> {
    return request<any>('/params', {
      method: 'PUT',
      body: JSON.stringify({ payload }),
    });
  },

  getExportSliceUrl(crop: string, as_of: string, variety = 'All'): string {
    const query = new URLSearchParams({ crop, as_of, variety });
    return `${API_BASE}/export/clean-slice.csv?${query.toString()}`;
  },
};
