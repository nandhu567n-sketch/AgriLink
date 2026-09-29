import React from 'react';
import { ShieldCheck, Database, Code, BookOpen, ExternalLink, ArrowUpRight } from 'lucide-react';
import { SITE_STATS } from '../data/siteData';

interface FooterProps {
  setActivePage: (page: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ setActivePage }) => {
  const scrollToTop = (pageId: string) => {
    setActivePage(pageId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          
          {/* Brand & Philosophy */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-crimson-brand flex items-center justify-center text-white font-black text-lg">
                🌾
              </div>
              <span className="font-extrabold text-xl text-white tracking-tight">AgriLink<span className="text-crimson-400">-OR</span></span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-crimson-950 text-crimson-300 border border-crimson-800">
                Operations Research
              </span>
            </div>
            
            <p className="text-sm text-slate-400 leading-relaxed max-w-sm">
              Deterministic decision support for Farmer Producer Organisations (FPOs). Built on classical operations research, transparent cost-walk arithmetic, and real Agmarknet data.
            </p>

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 text-xs text-slate-300 font-mono">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Zero Machine Learning · 100% Traceable Formulas</span>
            </div>

            <div className="pt-2 text-xs text-slate-500 space-y-1">
              <p>Source Data: Agmarknet public records (2023-06-06 to 2025-06-11)</p>
              <p>Dual-scale: 14,352 Karnataka rows & 727,050 Pan-India records</p>
            </div>
          </div>

          {/* Methodology */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-100 mb-4 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-crimson-400" />
              The 3 W's
            </h4>
            <ul className="space-y-2.5 text-sm text-slate-400">
              <li>
                <button onClick={() => scrollToTop('methodology')} className="hover:text-white transition-colors text-left">
                  <span className="font-bold text-crimson-400">W1</span> · Where to Sell (M2 NIHR)
                </button>
              </li>
              <li>
                <button onClick={() => scrollToTop('methodology')} className="hover:text-white transition-colors text-left">
                  <span className="font-bold text-crimson-400">W2</span> · When to Sell (M3 MILP)
                </button>
              </li>
              <li>
                <button onClick={() => scrollToTop('methodology')} className="hover:text-white transition-colors text-left">
                  <span className="font-bold text-crimson-400">W3</span> · To Whom (M4 Knapsack)
                </button>
              </li>
              <li>
                <button onClick={() => scrollToTop('methodology')} className="hover:text-white transition-colors text-left">
                  M1 · STL Decomposition
                </button>
              </li>
              <li>
                <button onClick={() => scrollToTop('methodology')} className="hover:text-white transition-colors text-left">
                  Calendar Month Index
                </button>
              </li>
            </ul>
          </div>

          {/* System & Data */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-100 mb-4 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-crimson-400" />
              Data & Architecture
            </h4>
            <ul className="space-y-2.5 text-sm text-slate-400">
              <li>
                <button onClick={() => scrollToTop('data')} className="hover:text-white transition-colors text-left">
                  Karnataka Slice (14,352 rows)
                </button>
              </li>
              <li>
                <button onClick={() => scrollToTop('data')} className="hover:text-white transition-colors text-left">
                  Pan-India (727k rows / 26 states)
                </button>
              </li>
              <li>
                <button onClick={() => scrollToTop('data')} className="hover:text-white transition-colors text-left">
                  Six Database Tables
                </button>
              </li>
              <li>
                <button onClick={() => scrollToTop('architecture')} className="hover:text-white transition-colors text-left">
                  3-Layer Architecture
                </button>
              </li>
              <li>
                <button onClick={() => scrollToTop('architecture')} className="hover:text-white transition-colors text-left">
                  FastAPI Service Layer
                </button>
              </li>
            </ul>
          </div>

          {/* Quick Access */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-100 mb-4 flex items-center gap-1.5">
              <Code className="w-3.5 h-3.5 text-crimson-400" />
              Live Deployment
            </h4>
            <ul className="space-y-2.5 text-sm text-slate-400">
              <li>
                <button onClick={() => scrollToTop('dashboard')} className="hover:text-white transition-colors text-left flex items-center gap-1">
                  <span>Streamlit UI (Port 8501)</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-slate-500" />
                </button>
              </li>
              <li>
                <button onClick={() => scrollToTop('api')} className="hover:text-white transition-colors text-left flex items-center gap-1">
                  <span>FastAPI Docs (Port 8000)</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-slate-500" />
                </button>
              </li>
              <li>
                <button onClick={() => scrollToTop('contact')} className="hover:text-white transition-colors text-left">
                  FPO Deployment Request
                </button>
              </li>
              <li>
                <a 
                  href="http://localhost:8501" 
                  target="_blank" 
                  rel="noreferrer"
                  className="hover:text-white transition-colors text-left flex items-center gap-1 text-crimson-400 font-semibold"
                >
                  <span>Launch Local Streamlit</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>
                <a 
                  href="http://localhost:8000/docs" 
                  target="_blank" 
                  rel="noreferrer"
                  className="hover:text-white transition-colors text-left flex items-center gap-1 text-crimson-400 font-semibold"
                >
                  <span>Interactive Swagger /docs</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© 2026 AgriLink-OR. Deterministic decision support for Farmer Producer Organisations.</p>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              {SITE_STATS.testsPassing} Unit Tests Passing
            </span>
            <span>·</span>
            <span>Zero Machine Learning</span>
            <span>·</span>
            <span>Pure Operations Research</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
