import React from 'react';
import { Layers, Server, Monitor, ShieldCheck, CheckCircle2, ArrowRight, AlertTriangle, FileCode } from 'lucide-react';
import { API_ENDPOINTS } from '../data/siteData';

export const ArchitecturePage: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12 pb-24">
      
      {/* Page Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-crimson-50 border border-crimson-roseBorder mb-3">
          <span className="text-xs font-black uppercase tracking-wider text-crimson-brand">
            System Design &amp; Service Layer
          </span>
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight">
          Three-Layer System Architecture
        </h1>
        <p className="mt-3 text-base sm:text-lg text-slate-600 max-w-3xl leading-relaxed">
          The project enforces a strict separation of concerns: mathematical modules are pure functions with zero I/O, the backend owns 100% of data access, and client applications consume standard schemas.
        </p>
      </div>

      {/* 3-Layer Diagram Box */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-10 shadow-lg relative overflow-hidden font-mono text-xs">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
          <div className="flex items-center gap-2 text-slate-400">
            <span className="w-3 h-3 rounded-full bg-red-500 inline-block"></span>
            <span className="w-3 h-3 rounded-full bg-yellow-500 inline-block"></span>
            <span className="w-3 h-3 rounded-full bg-green-500 inline-block"></span>
            <span className="ml-2 font-bold text-slate-200">agrilink_architecture_diagram.txt</span>
          </div>
          <span className="text-emerald-400 font-bold">100% Deterministic Contract</span>
        </div>

        <div className="space-y-6 text-slate-300">
          
          {/* Layer 1: src/ */}
          <div className="border border-slate-700 bg-slate-800/80 rounded-xl p-5">
            <div className="flex items-center justify-between text-crimson-400 font-bold text-sm mb-2">
              <span className="flex items-center gap-2">
                <FileCode className="w-4 h-4" />
                LAYER 1 · src/ (PURE MATHEMATICAL MODULES)
              </span>
              <span className="text-xs text-slate-400">Pure Functions · No I/O · No DB · No UI</span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed mb-3">
              Four modules (M1–M4) plus ingest/geo helpers. Takes DataFrames/arrays + params dict → returns typed results. Tested across 43 unit tests.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-300">
              <div className="bg-slate-900/60 p-2 rounded border border-slate-700">M1: stl_bands.py</div>
              <div className="bg-slate-900/60 p-2 rounded border border-slate-700">M2: nihr.py (Arbitrage)</div>
              <div className="bg-slate-900/60 p-2 rounded border border-slate-700">M3: breakeven + MILP</div>
              <div className="bg-slate-900/60 p-2 rounded border border-slate-700">M4: knapsack.py + DP</div>
            </div>
          </div>

          {/* Arrow */}
          <div className="flex justify-center text-slate-500 font-bold">
            ▲ Contract: Pure DataFrames in, Typed Dicts out ▲
          </div>

          {/* Layer 2: backend/ */}
          <div className="border-2 border-crimson-800 bg-slate-800/90 rounded-xl p-5">
            <div className="flex items-center justify-between text-white font-bold text-sm mb-2">
              <span className="flex items-center gap-2">
                <Server className="w-4 h-4 text-crimson-400" />
                LAYER 2 · backend/ (FASTAPI + SQLALCHEMY 2.0 SERVICE)
              </span>
              <span className="text-xs text-crimson-300">Owns 100% of Data Access</span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed mb-3">
              FastAPI microservice over PostgreSQL (SQLite local dev fallback). Thin routers, single business orchestration layer (<code>services/decision.py</code>). Coerces SQL dates to <code>datetime64</code> to guarantee exact bit-parity with Parquet.
            </p>
            <div className="flex flex-wrap gap-2 text-[11px] text-slate-300">
              <span className="bg-slate-900/80 px-2 py-1 rounded border border-slate-700">routers/decision.py</span>
              <span className="bg-slate-900/80 px-2 py-1 rounded border border-slate-700">routers/system.py</span>
              <span className="bg-slate-900/80 px-2 py-1 rounded border border-slate-700">services/repository.py</span>
              <span className="bg-slate-900/80 px-2 py-1 rounded border border-slate-700">seed/load_db.py</span>
            </div>
          </div>

          {/* Arrow */}
          <div className="flex justify-center text-slate-500 font-bold">
            ▼ Serves 11 REST Endpoints over HTTP JSON ▼
          </div>

          {/* Layer 3: clients */}
          <div className="border border-slate-700 bg-slate-800/80 rounded-xl p-5">
            <div className="flex items-center justify-between text-emerald-400 font-bold text-sm mb-2">
              <span className="flex items-center gap-2">
                <Monitor className="w-4 h-4" />
                LAYER 3 · app/ &amp; frontend/ (CLIENT APPLICATIONS)
              </span>
              <span className="text-xs text-slate-400">Streamlit v1 + React TypeScript v2</span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              <strong>app/streamlit_app.py:</strong> The quantitative decision-support dashboard running locally on port 8501.<br/>
              <strong>frontend/:</strong> Modern React/TS SaaS &amp; Marketing portal communicating with <code>/api</code> endpoints.
            </p>
          </div>

        </div>
      </div>

      {/* The 11 Operations Across 10 API Paths */}
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-crimson-brand mb-1">
            <Server className="w-4 h-4" />
            API Specifications
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            The Eleven API Operations Across Ten Paths
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Interactive OpenAPI documentation and live schemas served at <code>/docs</code>. All routes are <code>GET</code> except <code>PUT /api/params</code>.
          </p>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-sm">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-3">Method</th>
                <th className="p-3">Path</th>
                <th className="p-3 font-sans">Operation Summary</th>
                <th className="p-3">Query Parameters</th>
                <th className="p-3">HTTP Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {API_ENDPOINTS.map((ep) => (
                <tr key={ep.path} className="hover:bg-slate-50">
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${ep.method === 'GET' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                      {ep.method}
                    </span>
                  </td>
                  <td className="p-3 font-bold text-slate-900 text-sm">
                    {ep.path}
                  </td>
                  <td className="p-3 font-sans text-slate-700">
                    {ep.summary}
                  </td>
                  <td className="p-3 text-slate-500 text-[11px]">
                    {ep.params}
                  </td>
                  <td className="p-3 text-slate-600">
                    {ep.statusCodes}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* HTTP Error Philosophy */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-4">
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-crimson-brand" />
          HTTP Status Code &amp; Client Error Contract
        </h3>
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-3xl">
          Bad input is a client error, never an unhandled server crash. The API strictly guards boundaries using Pydantic schemas:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-2 font-mono text-xs">
          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <span className="font-bold text-emerald-700 text-sm block mb-1">200 OK</span>
            <span className="text-slate-600 text-[11px]">
              Answer returned successfully. Thin crops return 200 with <code>m1.error</code> set and no fabricated price path.
            </span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <span className="font-bold text-amber-700 text-sm block mb-1">400 Bad Request</span>
            <span className="text-slate-600 text-[11px]">
              Unknown crop or variety, or <code>as_of</code> outside coverage window. Returns valid enum choices.
            </span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <span className="font-bold text-purple-700 text-sm block mb-1">422 Validation</span>
            <span className="text-slate-600 text-[11px]">
              Parameter out of bounds (e.g. <code>volume &gt; 1000 qtl</code>, <code>horizon &gt; 240 days</code>).
            </span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <span className="font-bold text-crimson-brand text-sm block mb-1">503 Unavailable</span>
            <span className="text-slate-600 text-[11px]">
              Database uninitialized or unreachable. Advises running <code>make reset-db</code>.
            </span>
          </div>
        </div>
      </div>

    </div>
  );
};
