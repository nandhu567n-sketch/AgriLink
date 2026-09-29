import React from 'react';
import { Database, Table, ShieldAlert, CheckCircle2, FileSpreadsheet, Server, Layers, Calendar } from 'lucide-react';
import { ProvenancePanel } from '../components/ProvenancePanel';
import { SITE_STATS, SCHEMA_TABLES } from '../data/siteData';

export const DataCoveragePage: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12 pb-24">
      
      {/* Page Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-crimson-50 border border-crimson-roseBorder mb-3">
          <span className="text-xs font-black uppercase tracking-wider text-crimson-brand">
            Empirical Foundation &amp; Schema
          </span>
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight">
          Data Provenance &amp; National Coverage
        </h1>
        <p className="mt-3 text-base sm:text-lg text-slate-600 max-w-3xl leading-relaxed">
          Every decision variable in AgriLink-OR is anchored in public Agmarknet quotes. We reject synthetic data generation: if historical observations are missing or inadequate, the system reports the gap rather than simulating a fictitious price.
        </p>
      </div>

      {/* Provenance Panel */}
      <ProvenancePanel />

      {/* Side-by-Side: Karnataka Baseline Slice vs Pan-India Layer */}
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Two Operational Tiers: Local Slice vs National Scope
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Built to allow immediate low-latency local decision support while providing complete pan-India interstate spatial arbitrage.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Karnataka Baseline */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-slate-400" />
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-slate-500 uppercase">Baseline Tier</span>
              <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                100% Geocoded
              </span>
            </div>
            
            <h3 className="text-xl font-black text-slate-900">
              Karnataka Local Slice (`clean.parquet`)
            </h3>
            
            <p className="text-xs text-slate-600 leading-relaxed">
              The primary reference slice for local FPO procurement hubs. Filtered to Karnataka APMCs with all unit-error quotes quarantined.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2 font-mono text-xs">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-slate-400 block text-[10px] uppercase">Row Count</span>
                <span className="text-lg font-black text-slate-900">14,352 rows</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-slate-400 block text-[10px] uppercase">Mandis</span>
                <span className="text-lg font-black text-slate-900">72 markets</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-slate-400 block text-[10px] uppercase">Districts</span>
                <span className="text-lg font-black text-slate-900">21 districts</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-slate-400 block text-[10px] uppercase">Commodities</span>
                <span className="text-lg font-black text-slate-900">5 crops</span>
              </div>
            </div>

            <div className="pt-2 text-xs text-slate-600 border-t border-slate-100">
              <span className="font-semibold text-slate-900">Commodity Breakdown: </span>
              Onion (6,330) · Potato (5,174) · Tomato (1,411) · Wheat (1,082) · Rice (355).
            </div>
          </div>

          {/* Pan-India National Layer */}
          <div className="bg-white border-2 border-crimson-roseBorder rounded-2xl p-6 shadow-sm space-y-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-crimson-brand" />
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-crimson-brand uppercase">National Scope</span>
              <span className="text-xs font-bold text-crimson-brand bg-crimson-50 px-2 py-0.5 rounded border border-crimson-roseBorder">
                Interstate Arbitrage
              </span>
            </div>
            
            <h3 className="text-xl font-black text-slate-900">
              Pan-India National Layer (`clean_all.parquet`)
            </h3>
            
            <p className="text-xs text-slate-600 leading-relaxed">
              Unlocks nationwide spatial price comparison across all major production and consumption states in India.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2 font-mono text-xs">
              <div className="bg-crimson-50/50 p-3 rounded-lg border border-crimson-roseBorder/60">
                <span className="text-slate-500 block text-[10px] uppercase">Total Cleaned Rows</span>
                <span className="text-lg font-black text-crimson-brand">727,050 rows</span>
              </div>
              <div className="bg-crimson-50/50 p-3 rounded-lg border border-crimson-roseBorder/60">
                <span className="text-slate-500 block text-[10px] uppercase">States Covered</span>
                <span className="text-lg font-black text-crimson-brand">26 states</span>
              </div>
              <div className="bg-crimson-50/50 p-3 rounded-lg border border-crimson-roseBorder/60">
                <span className="text-slate-500 block text-[10px] uppercase">Geocoded Mandis</span>
                <span className="text-lg font-black text-crimson-brand">1,611 mandis</span>
              </div>
              <div className="bg-crimson-50/50 p-3 rounded-lg border border-crimson-roseBorder/60">
                <span className="text-slate-500 block text-[10px] uppercase">Time Horizon</span>
                <span className="text-lg font-black text-crimson-brand">24 months</span>
              </div>
            </div>

            <div className="pt-2 text-xs text-slate-600 border-t border-slate-100">
              <span className="font-semibold text-slate-900">National Reach: </span>
              Maharashtra, Gujarat, Rajasthan, Tamil Nadu, Andhra Pradesh, Punjab, UP, and more.
            </div>
          </div>

        </div>
      </div>

      {/* Six Relational Database Tables */}
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-crimson-brand mb-1">
            <Server className="w-4 h-4" />
            Backend Schema
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            The Six Relational Database Tables (`backend/models.py`)
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Single source of schema truth defined once via SQLAlchemy 2.0 ORM, running interchangeably on PostgreSQL (production) and SQLite (zero-setup local development).
          </p>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-sm">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-3">Table Name</th>
                <th className="p-3">Rows (Fresh Load)</th>
                <th className="p-3">Primary Key</th>
                <th className="p-3 font-sans">Business Purpose</th>
                <th className="p-3">Indexed Columns</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {SCHEMA_TABLES.map((t) => (
                <tr key={t.name} className="hover:bg-slate-50">
                  <td className="p-3 font-bold text-slate-900 text-sm">
                    <span className="bg-slate-100 px-2 py-0.5 rounded text-crimson-brand font-mono">
                      {t.name}
                    </span>
                  </td>
                  <td className="p-3 font-bold text-slate-800">{t.rowsOnFreshLoad}</td>
                  <td className="p-3 text-slate-600">{t.pk}</td>
                  <td className="p-3 font-sans text-slate-700">{t.purpose}</td>
                  <td className="p-3 text-slate-500">
                    {t.indexedColumns.map(c => (
                      <span key={c} className="block text-[10px]">{c}</span>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Zero Synthetic Fallback Policy Manifesto */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 space-y-4">
        <div className="flex items-center gap-2 text-crimson-400 font-mono text-xs font-bold uppercase">
          <ShieldAlert className="w-4 h-4" />
          <span>Fiduciary Policy</span>
        </div>
        <h3 className="text-xl font-bold">The Zero-Synthetic Fallback Guarantee</h3>
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-3xl">
          Agricultural price forecasting products routinely interpolate missing months with synthetic values or LLM estimations. In AgriLink-OR, if data is missing, the system prints an explicit disclosure and disables dependent modules rather than fabricating an answer. 
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 text-xs font-mono text-slate-300">
          <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
            <span className="text-crimson-400 font-bold block mb-1">Thin Crops Honesty:</span>
            Tomato, Wheat, Rice have &lt;104 weeks in this dump. Hold-vs-sell is disabled with status code <code>200 (m1.error)</code> rather than fitting noise.
          </div>
          <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
            <span className="text-crimson-400 font-bold block mb-1">Interpolation Disclosed:</span>
            Every resampled series reports its exact <code>imputed_frac</code>. If imputed &gt; 25%, the UI warns the FPO that bands are soft.
          </div>
          <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
            <span className="text-crimson-400 font-bold block mb-1">Centroid Distance Tagged:</span>
            Mandis where Nominatim could only resolve the district centroid (13 of 72) carry <code>source = "district_fallback"</code> and are marked on the map.
          </div>
        </div>
      </div>

    </div>
  );
};
