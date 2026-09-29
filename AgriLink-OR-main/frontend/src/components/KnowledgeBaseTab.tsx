import React, { useState } from 'react';
import { BookOpen, ShieldCheck, MapPin, Clock, Users, Database, Cpu, Layers } from 'lucide-react';

export const KnowledgeBaseTab: React.FC = () => {
  const [subTab, setSubTab] = useState<'3ws' | 'modules' | 'interstate' | 'calendar' | 'zeroml'>('3ws');

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
      
      {/* Header */}
      <div className="border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-crimson-brand animate-pulse"></span>
          <h3 className="text-lg font-black text-slate-900 tracking-tight">
            AgriLink-OR Knowledge Base &amp; Operations Research Architecture
          </h3>
          <span className="text-[10px] font-mono bg-crimson-50 text-crimson-brand border border-crimson-200 px-2 py-0.5 rounded font-bold uppercase">
            Technical &amp; Commercial Manual
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
          Comprehensive reference manual for FPO leadership, operations managers, and technical reviewers. Details the mathematical foundations of the <strong>3 W's Decision Methodology</strong>, the <strong>Four Pure OR Modules (M1–M4)</strong>, the <strong>Pan-India Interstate Arbitrage Layer</strong>, <strong>2-Year Historical Analysis</strong>, and the strict <strong>Zero-ML Philosophy</strong>.
        </p>
      </div>

      {/* Sub-tab Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-slate-100 pb-3">
        {[
          { id: '3ws', label: '1 · The 3 W\'s Commercial Framework', icon: ShieldCheck },
          { id: 'modules', label: '2 · The 4 OR Pure Modules (M1–M4)', icon: Cpu },
          { id: 'interstate', label: '3 · Pan-India & Interstate Arbitrage', icon: MapPin },
          { id: 'calendar', label: '4 · 2-Year Range & Calendar Months', icon: Clock },
          { id: 'zeroml', label: '5 · Zero-ML Rationale & Architecture', icon: Layers },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setSubTab(id as any)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              subTab === id
                ? 'bg-crimson-brand text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Subtab 1: The 3 W's Commercial Framework */}
      {subTab === '3ws' && (
        <div className="space-y-6 text-xs text-slate-700 leading-relaxed font-sans">
          <div className="bg-crimson-50/50 border border-crimson-200/80 rounded-xl p-4">
            <h4 className="font-bold text-sm text-crimson-brandDark mb-1">
              🌟 The 3 W's Commercial Decision Methodology
            </h4>
            <p>
              Every week, a Farmer Producer Organisation (FPO) aggregates harvest lots from dozens of smallholders. To convert collective harvest into maximum net bank deposits, the leadership must resolve three fundamental commercial questions:
            </p>
          </div>

          <div className="border border-slate-200 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 font-black text-sm text-slate-900">
              <span className="text-crimson-brand">📍 W1 · WHERE or Which Mandi Are You Selling?</span>
              <span className="text-[10px] font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-600">Module 2: Spatial Arbitrage</span>
            </div>
            <p>
              <strong>The Core Dilemma:</strong> A mandi board posting the highest nominal price is frequently located far away. Long hauls incur heavy diesel freight (round trips billed), transit weight loss from dehydration/handling damage, mandi cess (APMC taxes), and truck loading/unloading fees. Chasing a high nominal quote often nets <em>less</em> cash in hand than a modest local sale.
            </p>
            <div className="bg-slate-50 p-2.5 rounded-lg font-mono text-[11px] text-slate-900 border border-slate-200">
              Net Cash = [Board Price × (1 − Transit Shrink)] − (Freight / Q) − (Cess + Commission / Q) − (Handling / Q)
            </div>
            <p>
              <strong>The Arbitrage Signal:</strong> When <strong>Board Rank ≠ Net Rank</strong>, the divergence is spatial arbitrage. AgriLink-OR evaluates every reporting mandi across Karnataka and pan-India to discover the true net winner.
            </p>
          </div>

          <div className="border border-slate-200 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 font-black text-sm text-slate-900">
              <span className="text-crimson-brand">⏱️ W2 · WHEN Are You Selling?</span>
              <span className="text-[10px] font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-600">Module 3: Temporal Arbitrage &amp; Optimal Stopping</span>
            </div>
            <p>
              <strong>The Core Dilemma:</strong> During peak harvest, markets are flooded with produce, depressing modal prices. FPO members want to store their crop in warehouses and wait for lean-season price spikes. However, <em>holding crop burns cash</em>:
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-600 pl-2">
              <li><strong>Warehouse Rent:</strong> Charged in discrete 30-day blocks.</li>
              <li><strong>Financing Carry Cost:</strong> Electronic Negotiable Warehouse Receipt (e-NWR) pledge loan interest (e.g. 9%/yr) on borrowed capital plus the opportunity cost of equity (e.g. 12%/yr).</li>
              <li><strong>Physical Decay / Spoilage:</strong> Produce loses moisture continuously (θᵗ ≈ 1%/month). You cannot sell what you put into the warehouse!</li>
            </ul>
            <div className="bg-slate-50 p-2.5 rounded-lg font-mono text-[11px] text-slate-900 border border-slate-200">
              V(t) = θᵗ · p(t) − c·t − Entry Fees
            </div>
            <p>
              AgriLink-OR identifies the <strong>Break-Even Day</strong> (d_be), the <strong>Peak Value Day</strong> (d_peak), and solves a 3-tranche Mixed-Integer Linear Program (MILP) with a 10% minimum sale constraint to deliver an actionable, staggered sales schedule that hedges market risk.
            </p>
          </div>

          <div className="border border-slate-200 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 font-black text-sm text-slate-900">
              <span className="text-crimson-brand">🤝 W3 · TO WHOM Are You Selling?</span>
              <span className="text-[10px] font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-600">Module 4: Combinatorial Lot Pooling</span>
            </div>
            <p>
              <strong>The Core Dilemma:</strong> Institutional bulk buyers (modern retailers, food processors) demand large contracts (e.g., 400 quintals) with strict delivery schedules and quality bounds. Smallholder farmers offer scattered lots of varying sizes (5 to 30 quintals). The FPO risks either excess unsold surplus or unfair concentration from a single wealthy farmer.
            </p>
            <p>
              <strong>The Solution:</strong> Formulates and solves a <strong>Bounded Knapsack Optimization</strong> via COIN-OR CBC MILP. Satisfies the buyer's order target (surplus tolerance ≤ 3%) while strictly enforcing an <strong>Anti-Monopoly Concentration Cap</strong> (no single farmer supplies &gt; 40%). Every knapsack result is independently cross-checked against a 0/1 Subset-Sum Dynamic Programming algorithm (O(N·S)) to guarantee zero excess waste.
            </p>
          </div>
        </div>
      )}

      {/* Subtab 2: The 4 OR Pure Modules */}
      {subTab === 'modules' && (
        <div className="space-y-4 text-xs">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-700">
            AgriLink-OR is structured into four pure mathematical modules (<code>src/</code>). Each module contains <strong>no I/O, no network calls, and no file reads</strong>, guaranteeing 100% determinism and unit-testability.
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left font-mono">
              <thead className="bg-slate-100 text-slate-700 text-[11px] uppercase border-b border-slate-200">
                <tr>
                  <th className="p-3">Module</th>
                  <th className="p-3">File Location</th>
                  <th className="p-3">Mathematical Engine</th>
                  <th className="p-3">Core Output</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[11px] text-slate-800">
                <tr className="hover:bg-slate-50">
                  <td className="p-3 font-bold text-crimson-brand">M1: Econometrics</td>
                  <td className="p-3 text-slate-500">src/m1_econometrics/stl_bands.py</td>
                  <td className="p-3">STL(period=52, robust=True), log-additive, ±2σ residual volatility bands, z-score anomaly detection.</td>
                  <td className="p-3">Projected price path p(d), seasonal strengths, GLUT/SPIKE flags.</td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="p-3 font-bold text-crimson-brand">M2: Spatial Arbitrage</td>
                  <td className="p-3 text-slate-500">src/m2_arbitrage/nihr.py</td>
                  <td className="p-3">Net-In-Hand Realisation (NIHR) arithmetic. Round-trip diesel logistics, 1.3× circuity, transit shrinkage.</td>
                  <td className="p-3">Rank-ordered mandi roster, net realisation per qtl, board rank vs net rank divergence.</td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="p-3 font-bold text-crimson-brand">M3: Temporal Arbitrage</td>
                  <td className="p-3 text-slate-500">src/m3_milp/breakeven.py, hold_sell.py</td>
                  <td className="p-3">Optimal stopping scan over V(t) curve + Multi-Tranche MILP (COIN-OR CBC). Continuous decay θᵗ, 30-day block storage.</td>
                  <td className="p-3">Break-even day d_be, peak gain day d_peak, CBC optimal staggered liquidation schedule.</td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="p-3 font-bold text-crimson-brand">M4: Lot Pooling</td>
                  <td className="p-3 text-slate-500">src/m4_aggregation/knapsack.py</td>
                  <td className="p-3">Bounded Knapsack Optimization (CBC MILP) + independent 0/1 Subset-Sum Dynamic Programming (O(N·S)).</td>
                  <td className="p-3">Farmer lot allocation, surplus minimization (≤3%), concentration cap (&lt;40%), dual-solver check.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Subtab 3: Pan-India & Interstate Arbitrage */}
      {subTab === 'interstate' && (
        <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="text-[10px] text-slate-500 uppercase">National Fact Table</div>
              <div className="text-lg font-black text-slate-900 mt-0.5">727,050 rows</div>
              <div className="text-[10px] text-slate-500">clean_all.parquet</div>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="text-[10px] text-slate-500 uppercase">Covered States</div>
              <div className="text-lg font-black text-crimson-brand mt-0.5">26 States</div>
              <div className="text-[10px] text-slate-500">All major agro hubs</div>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="text-[10px] text-slate-500 uppercase">Geocoded Mandis</div>
              <div className="text-lg font-black text-slate-900 mt-0.5">1,611 Mandis</div>
              <div className="text-[10px] text-slate-500">mandis_all.csv</div>
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl p-4 space-y-2">
            <h4 className="font-bold text-sm text-slate-900">How Interstate Arbitrage Operates:</h4>
            <ol className="list-decimal list-inside space-y-1.5 pl-2 text-slate-600">
              <li><strong>The Origin Depot:</strong> FPO operates from registered procurement hub (e.g. Davangere depot, Karnataka at 14.30°N, 76.00°E).</li>
              <li><strong>Destination Market Scopes:</strong> Choose between Karnataka local mandis (72 mandis), target destination states (e.g., Maharashtra, Tamil Nadu, Gujarat), or Pan-India (All 26 states) for national best prices.</li>
              <li><strong>Rigorous Transport &amp; Shrinkage Deduction:</strong> Interstate distances often exceed 800–1,500 km. Full round-trip diesel logistics (<code>freight = trucks × [fixed + (2.0 × fuel_rate × km)]</code>) and transit moisture decay (<code>loss = 0.005%/km × km × price</code>) are deducted.</li>
              <li><strong>Opportunity Indicators:</strong> If an interstate mandi beats local net realisation by &gt; ₹5/qtl, the dashboard highlights the 🚀 <strong>Interstate Arbitrage Opportunity</strong>. If long-haul diesel eats the premium, a 🏠 <strong>Local Sale Preferred</strong> alert safeguards FPO capital.</li>
            </ol>
          </div>
        </div>
      )}

      {/* Subtab 4: 2-Year Range & Calendar Months */}
      {subTab === 'calendar' && (
        <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
          <div className="border border-slate-200 rounded-xl p-4 space-y-2">
            <h4 className="font-bold text-sm text-slate-900">Why 2 Full Years (104+ Weeks) are Mathematically Mandatory</h4>
            <p>
              Classical time-series decomposition (STL) with an annual cycle of P = 52 weeks mathematically requires at least two complete cycles (2 × 52 = 104 weekly observations) to separate genuine seasonal patterns from multi-month macroeconomic trends.
            </p>
            <p>
              Crops with insufficient historical depth (e.g. Tomato, Wheat, and Rice in this dump, which span only a single partial season) degrade gracefully: the app discloses that two full annual cycles are unavailable, rather than fitting noise or hallucinating fake projections. Onion and Potato provide complete two-year cycles.
            </p>
          </div>

          <div className="border border-slate-200 rounded-xl p-4 space-y-2 font-mono">
            <h4 className="font-bold text-sm text-slate-900 font-sans">Calendar Month Windows &amp; Typical Onion Phases:</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
              <div className="p-2 bg-slate-50 rounded border">01 Jan – 31 Jan</div>
              <div className="p-2 bg-slate-50 rounded border">01 Feb – 28 Feb</div>
              <div className="p-2 bg-slate-50 rounded border">01 Mar – 31 Mar</div>
              <div className="p-2 bg-slate-50 rounded border">01 Apr – 30 Apr</div>
              <div className="p-2 bg-rose-50 text-crimson-800 rounded border border-rose-200 font-bold">01 May – 31 May (Harvest Inflow Trough)</div>
              <div className="p-2 bg-slate-50 rounded border">01 Jun – 30 Jun</div>
              <div className="p-2 bg-slate-50 rounded border">01 Jul – 31 Jul</div>
              <div className="p-2 bg-slate-50 rounded border">01 Aug – 31 Aug</div>
              <div className="p-2 bg-slate-50 rounded border">01 Sep – 30 Sep</div>
              <div className="p-2 bg-slate-50 rounded border">01 Oct – 31 Oct</div>
              <div className="p-2 bg-crimson-50 text-crimson-brand font-bold rounded border border-crimson-200">01 Nov – 30 Nov (Lean Season Peak)</div>
              <div className="p-2 bg-slate-50 rounded border">01 Dec – 31 Dec</div>
            </div>
          </div>
        </div>
      )}

      {/* Subtab 5: Zero-ML Rationale & Architecture */}
      {subTab === 'zeroml' && (
        <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
          <div className="border border-slate-200 rounded-xl p-4 space-y-2">
            <h4 className="font-bold text-sm text-slate-900">1. The Fiduciary &amp; Legal Reality of Farmer Cooperatives</h4>
            <p>
              When an FPO board decides whether to store 500 quintals of member harvest in an accredited warehouse, farmers' actual livelihoods and debts are at stake. If storage loses money, the leadership cannot explain the failure with <em>"the neural network predicted an upward trend."</em>
            </p>
            <p>
              In AgriLink-OR, every single rupee is accountable: warehouse rent is ₹X, pledge loan interest is ₹Y, shrinkage was Z%, and freight was calculated based on diesel at ₹90/L. Every stakeholder can trace the arithmetic from the mandi quote to the net bank deposit.
            </p>
          </div>

          <div className="border border-slate-200 rounded-xl p-4 space-y-2">
            <h4 className="font-bold text-sm text-slate-900">2. Avoiding Hallucinated Changepoints</h4>
            <p>
              Popular ML forecasting libraries (such as Prophet) fit piecewise linear changepoints by default and hide uncertainty inside opaque confidence intervals. AgriLink-OR uses LOESS Seasonal-Trend Decomposition (STL) with robust regression (<code>robust=True</code>). It isolates seasonal swings and reports transparent statistical metrics: seasonal strength, trend strength, and explicit GLUT/SPIKE residual z-scores (|z| &gt; 2).
            </p>
          </div>

          <div className="border border-slate-200 rounded-xl p-4 space-y-2">
            <h4 className="font-bold text-sm text-slate-900">3. Dual-Engine Architecture &amp; Parquet/Database Parity</h4>
            <p>
              <strong>Pure Functional Core (<code>src/</code>):</strong> Pure Python and pandas functions without any side-effects, database connections, or UI dependencies.
            </p>
            <p>
              <strong>Relational Backend (<code>backend/</code>):</strong> FastAPI microservice over PostgreSQL (with zero-setup SQLite fallback). 6 normalized tables (<code>prices</code>, <code>mandis</code>, <code>farms</code>, <code>farm_distances</code>, <code>params</code>, <code>dataset_meta</code>).
            </p>
            <p>
              <strong>Bit-Identical Computation:</strong> The repository layer coerces types so that the mathematical modules produce identical results whether reading directly from local parquet files or querying the PostgreSQL fact tables.
            </p>
          </div>
        </div>
      )}

    </div>
  );
};
