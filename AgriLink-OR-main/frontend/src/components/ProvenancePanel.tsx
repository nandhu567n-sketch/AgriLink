import React from 'react';
import { AlertTriangle, Database, CheckCircle, Globe2 } from 'lucide-react';
import { SITE_STATS } from '../data/siteData';

export const ProvenancePanel: React.FC = () => {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
      
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-crimson-brand" />
            <h3 className="text-base font-extrabold text-slate-900">
              Data Provenance & Freshness Registry
            </h3>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono">
              table: dataset_meta
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real government Agmarknet dump (737,392 rows) · Zero synthetic fallback · All outliers quarantined
          </p>
        </div>

        <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
          <span>Verified Agmarknet Fact Table</span>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        
        <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Karnataka Rows</div>
          <div className="text-2xl font-black font-mono text-slate-900 mt-1">
            {SITE_STATS.karnatakaRows.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">5 commodities cleaned</div>
        </div>

        <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Historical Coverage</div>
          <div className="text-xl sm:text-2xl font-black font-mono text-slate-900 mt-1">
            Jun '23 → Jun '25
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">2 continuous agricultural years</div>
        </div>

        <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">State Mandis</div>
          <div className="text-2xl font-black font-mono text-slate-900 mt-1">
            {SITE_STATS.karnatakaMandis}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">59 market / 13 centroid fallback</div>
        </div>

        <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Data Stale Age</div>
          <div className="text-2xl font-black font-mono text-crimson-brand mt-1">
            {SITE_STATS.dataAgeDays} days
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Dump ends 2025-06-11</div>
        </div>

      </div>

      {/* Pan-India Layer Callout */}
      <div className="bg-gradient-to-r from-crimson-50/70 via-white to-slate-50 border border-crimson-roseBorder/70 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-crimson-100 flex items-center justify-center text-crimson-brand flex-shrink-0 mt-0.5">
            <Globe2 className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <span>Pan-India National Layer (clean_all.parquet)</span>
              <span className="text-[10px] font-bold bg-crimson-brand text-white px-2 py-0.5 rounded-full">
                Active in System
              </span>
            </h4>
            <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
              Expands beyond local Karnataka APMCs to encompass <strong>{SITE_STATS.nationalRows.toLocaleString()} rows</strong> across <strong>{SITE_STATS.nationalStates} Indian states</strong> and <strong>{SITE_STATS.nationalMandis.toLocaleString()} geocoded mandis</strong>. Evaluates national spatial arbitrage to find high-margin interstate destination sales.
            </p>
          </div>
        </div>
      </div>

      {/* Honest Data-Freshness Warning */}
      <div className="bg-amber-50/80 border-l-4 border-amber-500 rounded-r-xl p-4 flex items-start gap-3 text-xs text-amber-900 leading-relaxed">
        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <strong className="font-bold">Honest Data Freshness & No-Synthetic Disclosure: </strong>
          The latest observation in this shipped Agmarknet dump is <strong>11 June 2025</strong> ({SITE_STATS.dataAgeDays} days before today). The projected price path <code>p(d)</code> is a 52-week LOESS econometric decomposition fitted to that historical record, <em>not a live board ticker</em>. Re-run <code>make history clean</code> with your own daily dump before executing real commercial contracts.
          <span className="block mt-1 font-mono text-[11px] text-amber-800">
            Note: This dump carries no arrival-tonnage column. GLUT / SPIKE flags are derived from STL residual z-scores (|z| &gt; 2), not arrival counts.
          </span>
        </div>
      </div>

    </div>
  );
};
