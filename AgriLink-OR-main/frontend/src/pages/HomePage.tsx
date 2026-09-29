import React from 'react';
import { ArrowRight, CheckCircle2, ShieldCheck, Database, TrendingUp, Compass, Clock, PackageCheck, AlertCircle, Sparkles } from 'lucide-react';
import { CostWalkStrip } from '../components/CostWalkStrip';
import { DecisionCard } from '../components/DecisionCard';
import { PipelineStep } from '../components/PipelineStep';
import { ProvenancePanel } from '../components/ProvenancePanel';
import { ChartStl } from '../components/ChartStl';
import { THREE_WS, WORKED_EXAMPLE, SITE_STATS, ZERO_ML_REASONS } from '../data/siteData';

interface HomePageProps {
  setActivePage: (page: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ setActivePage }) => {
  return (
    <div className="space-y-20 pb-20">

      {/* Hero Section */}
      <section className="relative pt-10 sm:pt-16 pb-12 overflow-hidden">
        {/* Soft Background Radial Blush */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-crimson-50/60 blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-0 -ml-20 w-80 h-80 rounded-full bg-slate-50 blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          
          {/* Eyebrow Pill */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-crimson-50 border border-crimson-roseBorder mb-6">
            <span className="w-2 h-2 rounded-full bg-crimson-brand animate-ping" />
            <span className="text-xs font-black uppercase tracking-widest text-crimson-brand">
              Operations Research · Pure Mathematics · Zero Machine Learning
            </span>
          </div>

          {/* Main Headline */}
          <div className="max-w-4xl">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 leading-[1.1]">
              Sell today or hold? AgriLink-OR answers with{' '}
              <span className="text-crimson-brand underline decoration-crimson-roseBorder decoration-4 underline-offset-4">
                arithmetic
              </span>
              , not a black box.
            </h1>

            <p className="mt-5 text-lg sm:text-xl text-slate-600 leading-relaxed max-w-3xl">
              Deterministic decision support for Farmer Producer Organisations (FPOs) — three questions (<strong>Where, When, To Whom</strong>), four pure operations-research modules, zero machine learning, and every single rupee traceable to a reproducible formula.
            </p>

            {/* CTAs */}
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button
                onClick={() => setActivePage('dashboard')}
                className="inline-flex items-center gap-2 bg-crimson-brand hover:bg-crimson-brandDark text-white px-6 py-3.5 rounded-xl text-base font-extrabold shadow-sm shadow-crimson-300 transition-all hover:shadow-md hover:-translate-y-0.5"
              >
                <span>Open the Dashboard</span>
                <ArrowRight className="w-5 h-5" />
              </button>

              <button
                onClick={() => setActivePage('methodology')}
                className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 px-6 py-3.5 rounded-xl text-base font-bold transition-colors"
              >
                <span>See the 3 W's Methodology</span>
              </button>

              <div className="flex items-center gap-2 text-xs font-mono text-slate-500 pl-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>43 Unit Tests Passing · Agmarknet Data</span>
              </div>
            </div>
          </div>

          {/* Hero Visual: Real Net-in-Hand Cost Walk Strip */}
          <div className="mt-12">
            <CostWalkStrip />
          </div>

        </div>
      </section>

      {/* Section 1 — The 3 W's Decision Methodology */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-crimson-brand mb-1">
            <Compass className="w-4 h-4" />
            Commercial Core
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            The Three Questions Every FPO Asks Every Week
          </h2>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            A cooperative cannot act on nominal mandi board prices. AgriLink-OR produces three actionable, executable answers simultaneously:
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {THREE_WS.map((w) => (
            <DecisionCard
              key={w.id}
              letter={w.letter}
              tag={w.tag}
              title={w.title}
              cardTitle={w.cardTitle}
              cardValue={w.cardValue}
              cardDelta={w.cardDelta}
              cardNote={w.cardNote}
              module={w.module}
              iconName={w.icon}
              problem={w.problem}
              solution={w.solution}
              onExplore={() => setActivePage('methodology')}
            />
          ))}
        </div>
      </section>

      {/* Section 2 — The Pure Pipeline */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-crimson-brand">
                Operations Research Pipeline
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-0.5">
                Five Sequential Stages · 100% Pure Functions · Zero I/O
              </h3>
            </div>
            <span className="text-xs font-mono font-semibold px-3 py-1 rounded-md bg-white border border-slate-200 text-slate-700">
              Input: DataFrames + params.yaml → Output: Decision JSON
            </span>
          </div>

          <PipelineStep />

          <div className="mt-4 pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
            <span>Every stage is mathematically isolated and unit-tested independently across 43 automated tests.</span>
            <button
              onClick={() => setActivePage('architecture')}
              className="text-crimson-brand font-bold hover:underline inline-flex items-center gap-1"
            >
              <span>View Three-Layer System Architecture</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* Section 3 — Data & Coverage */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-crimson-brand mb-1">
            <Database className="w-4 h-4" />
            Data Transparency
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Real Government Agmarknet Records · Zero Synthetic Fallback
          </h2>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            If the historical series cannot support an econometric decomposition, the system states so honestly rather than inventing numbers.
          </p>
        </div>

        <ProvenancePanel />
      </section>

      {/* Section 4 — Why No Machine Learning */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-slate-900 text-white rounded-3xl p-8 sm:p-12 relative overflow-hidden">
          <div className="absolute -right-20 -bottom-20 w-80 h-80 rounded-full bg-crimson-900/40 blur-3xl pointer-events-none" />

          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-crimson-950 border border-crimson-800 text-crimson-400 text-xs font-mono font-bold mb-4">
              <span>MANIFESTO</span>
              <span>·</span>
              <span>THE ZERO-ML DOCTRINE</span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
              Why We Ban Machine Learning From Agricultural Decisions
            </h2>

            <p className="mt-4 text-base text-slate-300 leading-relaxed">
              Most software startups claim "smart AI price forecasts." We do the exact opposite. When a cooperative board stores 500 quintals of member crop, real farmer families take on warehouse pledge debt. A black-box AI model that hides error bars and changepoints is a fiduciary disaster waiting to happen.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10">
            {ZERO_ML_REASONS.map((r, i) => (
              <div key={i} className="bg-slate-800/80 border border-slate-700 rounded-xl p-5 hover:border-slate-600 transition-colors">
                <h4 className="text-base font-bold text-white mb-2">
                  {r.title}
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {r.desc}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-8 pt-6 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs font-mono text-slate-400">
            <span>Stack: statsmodels STL + PuLP COIN-OR CBC MILP + 0/1 Subset-Sum DP</span>
            <button
              onClick={() => setActivePage('methodology')}
              className="text-crimson-400 hover:text-crimson-300 font-bold inline-flex items-center gap-1"
            >
              <span>Read the Full Mathematical Proofs</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* Section 5 — Live Interactive Workflow Simulation */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="text-xs font-bold uppercase tracking-wider text-crimson-brand">
            Interactive User Interface
          </span>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight mt-1">
            The 1 · Pick → 2 · Decide → 3 · Drill Workflow
          </h2>
          <p className="text-sm text-slate-600 mt-2">
            The dashboard mirrors a quantitative trader's terminal: pick operational constraints on the left, receive executive 3W metrics in the center, and drill down into pure mathematical proof tabs.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <ChartStl />
        </div>
      </section>

      {/* Final Call to Action */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-br from-crimson-brand to-crimson-700 rounded-3xl p-8 sm:p-14 text-white text-center shadow-lg shadow-crimson-200 relative overflow-hidden">
          <div className="max-w-2xl mx-auto">
            <span className="text-xs font-mono uppercase tracking-widest text-crimson-100 bg-white/10 px-3 py-1 rounded-full">
              Production Ready · 43 Tests Passing
            </span>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight mt-4 text-white">
              See where your next quintal should go.
            </h2>
            <p className="mt-3 text-base text-crimson-100 leading-relaxed">
              Run real Agmarknet price histories through spatial arbitrage, warehouse decay equations, and bounded lot aggregation right now.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <button
                onClick={() => setActivePage('dashboard')}
                className="bg-white text-crimson-brand hover:bg-slate-100 px-8 py-3.5 rounded-xl font-black text-base shadow transition-all hover:scale-105"
              >
                Launch Dashboard Simulation
              </button>
              <button
                onClick={() => setActivePage('api')}
                className="bg-crimson-900/40 hover:bg-crimson-900/60 text-white border border-white/20 px-6 py-3.5 rounded-xl font-bold text-base transition-colors"
              >
                Inspect API Documentation (/docs)
              </button>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};
