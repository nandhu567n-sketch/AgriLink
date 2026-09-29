import React, { useState } from 'react';
import { Terminal, Copy, Check, ExternalLink, Play, Server, Layers, ShieldCheck } from 'lucide-react';
import { API_ENDPOINTS } from '../data/siteData';

export const ApiDocsPage: React.FC = () => {
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>('/api/decision');
  const [crop, setCrop] = useState<string>('Onion');
  const [asOf, setAsOf] = useState<string>('2025-06-11');
  const [volume, setVolume] = useState<number>(200);
  const [horizon, setHorizon] = useState<number>(180);
  const [conservative, setConservative] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const activeEp = API_ENDPOINTS.find(ep => ep.path === selectedEndpoint) || API_ENDPOINTS[2];

  const generatedCurl = `curl -X '${activeEp.method}' \\
  'http://localhost:8000${activeEp.path}?crop=${crop}&as_of=${asOf}&volume=${volume}&horizon=${horizon}&conservative=${conservative}' \\
  -H 'accept: application/json'`;

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedCurl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10 pb-24">
      
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-crimson-50 border border-crimson-roseBorder mb-3">
            <span className="text-xs font-black uppercase tracking-wider text-crimson-brand">
              FastAPI v2.0.0 Interactive Explorer
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight">
            REST API Documentation &amp; Console
          </h1>
          <p className="mt-2 text-sm sm:text-base text-slate-600 max-w-2xl">
            11 operations across 10 paths. Query parameters are validated via Pydantic dependencies, returning deterministic operations research models in typed JSON.
          </p>
        </div>

        <a
          href="http://localhost:8000/docs"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-3 rounded-xl font-bold text-sm shadow transition-colors"
        >
          <Server className="w-4 h-4 text-emerald-400" />
          <span>Open Swagger UI (/docs)</span>
          <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
        </a>
      </div>

      {/* Interactive Testing Console */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Endpoint Selector Sidebar */}
        <div className="lg:col-span-4 space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
            Available Operations
          </span>
          <div className="space-y-1">
            {API_ENDPOINTS.map((ep) => {
              const isSelected = selectedEndpoint === ep.path;
              return (
                <button
                  key={ep.path}
                  onClick={() => setSelectedEndpoint(ep.path)}
                  className={`w-full text-left p-3 rounded-xl border text-xs font-mono transition-all flex items-start gap-2.5 ${
                    isSelected
                      ? 'bg-crimson-50/70 border-crimson-brand text-slate-900 font-bold shadow-sm'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-black ${
                    ep.method === 'GET' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {ep.method}
                  </span>
                  <div className="truncate">
                    <span className="block truncate text-slate-900">{ep.path}</span>
                    <span className="text-[10px] text-slate-400 font-sans block truncate">{ep.summary}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Console & Request Builder */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Parameter Form */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-crimson-brand" />
                <span className="font-extrabold text-sm text-slate-900">Request Parameter Builder</span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">Pydantic Query Validation</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Crop (required)</label>
                <select
                  value={crop}
                  onChange={(e) => setCrop(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono text-slate-900"
                >
                  <option value="Onion">Onion</option>
                  <option value="Potato">Potato</option>
                  <option value="Tomato">Tomato (thin crop)</option>
                  <option value="Wheat">Wheat (thin crop)</option>
                  <option value="Rice">Rice (thin crop)</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Price As Of (required)</label>
                <input
                  type="date"
                  value={asOf}
                  min="2023-06-06"
                  max="2025-06-11"
                  onChange={(e) => setAsOf(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono text-slate-900"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Volume Q (10–1000 qtl)</label>
                <input
                  type="number"
                  value={volume}
                  min="10"
                  max="1000"
                  step="10"
                  onChange={(e) => setVolume(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono text-slate-900"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Horizon (30–240 days)</label>
                <input
                  type="number"
                  value={horizon}
                  min="30"
                  max="240"
                  step="10"
                  onChange={(e) => setHorizon(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono text-slate-900"
                />
              </div>

              <div className="flex items-center gap-2 pt-5">
                <input
                  type="checkbox"
                  id="cons"
                  checked={conservative}
                  onChange={(e) => setConservative(e.target.checked)}
                  className="rounded text-crimson-brand focus:ring-crimson-brand w-4 h-4"
                />
                <label htmlFor="cons" className="font-semibold text-slate-700 select-none cursor-pointer">
                  Conservative (-2σ)
                </label>
              </div>
            </div>
          </div>

          {/* Generated Curl Command */}
          <div className="bg-slate-900 text-slate-100 rounded-2xl p-5 shadow font-mono text-xs space-y-2">
            <div className="flex items-center justify-between text-slate-400 pb-2 border-b border-slate-800">
              <span className="text-[11px] font-bold text-slate-300">cURL Terminal Command</span>
              <button
                onClick={handleCopy}
                className="hover:text-white transition-colors flex items-center gap-1 text-[11px] bg-slate-800 px-2 py-1 rounded"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <pre className="text-crimson-300 overflow-x-auto py-2 leading-relaxed">
              {generatedCurl}
            </pre>
          </div>

          {/* Response Payload Viewer */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="font-mono text-xs font-bold text-slate-900">
                  HTTP 200 OK · Schema Response Model
                </span>
              </div>
              <span className="text-xs text-slate-400 font-mono">Response Time: ~45ms</span>
            </div>

            <pre className="bg-slate-950 text-slate-200 p-4 rounded-xl font-mono text-xs overflow-x-auto leading-relaxed max-h-[360px]">
              {activeEp.responsePreview}
            </pre>

            <div className="pt-2 flex items-center justify-between text-[11px] text-slate-500 font-mono">
              <span>Single source of schema truth in backend/schemas.py</span>
              <span className="text-crimson-brand font-semibold">Zero ML · Pure Determinism</span>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
