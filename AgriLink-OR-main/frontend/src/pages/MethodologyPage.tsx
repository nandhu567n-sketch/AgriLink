import React, { useState } from 'react';
import { Database, TrendingUp, Compass, Clock, PackageCheck, CheckCircle2, AlertCircle, ArrowRight, Code } from 'lucide-react';
import { ChartStl } from '../components/ChartStl';
import { ChartSeasonalIndex } from '../components/ChartSeasonalIndex';
import { CostWalkStrip } from '../components/CostWalkStrip';
import { SAMPLE_MANDIS, WORKED_EXAMPLE } from '../data/siteData';

export const MethodologyPage: React.FC = () => {
  const [activeSection, setActiveSection] = useState<'data' | 'm1' | 'm2' | 'm3' | 'm4'>('m2');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12 pb-24">
      
      {/* Page Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-crimson-50 border border-crimson-roseBorder mb-3">
          <span className="text-xs font-black uppercase tracking-wider text-crimson-brand">
            Operations Research Mathematical Core
          </span>
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight">
          The 3 W's Decision Methodology
        </h1>
        <p className="mt-3 text-base sm:text-lg text-slate-600 max-w-3xl leading-relaxed">
          AgriLink-OR rejects black-box machine learning in favor of classical operations research. Every number presented to an FPO board is backed by pure functions, inspectable statistical tests, and provable linear programs.
        </p>
      </div>

      {/* Navigation Tabs for Methodology */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        {[
          { id: 'data', label: 'Data Ingestion & Cleaning', icon: Database },
          { id: 'm1', label: 'M1 · STL Decomposition', icon: TrendingUp },
          { id: 'm2', label: 'M2 · Spatial Arbitrage (W1)', icon: Compass },
          { id: 'm3', label: 'M3 · Hold vs Sell (W2)', icon: Clock },
          { id: 'm4', label: 'M4 · Lot Knapsack (W3)', icon: PackageCheck },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSection === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                isActive
                  ? 'bg-crimson-brand text-white shadow-sm shadow-crimson-200'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-crimson-brand'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* SECTION 1: DATA INGESTION */}
      {activeSection === 'data' && (
        <div className="space-y-8">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6">
            <div>
              <span className="text-xs font-mono font-bold text-crimson-brand uppercase">Stage 01</span>
              <h2 className="text-2xl font-black text-slate-900 mt-1">Data Ingestion, Cleaning & Geocoding</h2>
              <p className="text-sm text-slate-600 mt-1">
                From the 737,392-row national Agmarknet dump to an audited, unit-tested fact table.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-700 leading-relaxed">
              <div className="bg-slate-50 border border-slate-200 p-5 rounded-xl space-y-3">
                <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Four Data Traps Fixed & Tested
                </h4>
                <ul className="space-y-2 text-slate-600">
                  <li><strong>1. Explicit Date Parsing:</strong> Agmarknet dumps use US <code>M/D/YYYY</code> format. Default day-first parsing lost 8,694 of 14,391 Karnataka rows to <code>NaT</code>. We pin the format with explicit fallback.</li>
                  <li><strong>2. Outlier Quarantining:</strong> Occasional Rs/kg unit errors (~10× too low) poisoned series (e.g. Shimoga onion at ₹14 vs ₹2,000 median). We drop quotes &lt; 10% of the mandi-commodity median while preserving real ₹13,000 tomato spikes.</li>
                  <li><strong>3. Complete Weekly Resampling:</strong> Mandis skip days. A 4-week interpolation limit starved STL. We resample to weekly medians and explicitly measure imputed share.</li>
                  <li><strong>4. Multi-State Geocoding:</strong> 1,611 mandis geocoded via Nominatim (1 req/sec) with full provenance tracking: <code>market</code> vs <code>district_fallback</code>.</li>
                </ul>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-5 rounded-xl space-y-3">
                <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  No Synthetic Fallback Policy
                </h4>
                <p>
                  Many commercial apps fill missing days with linear interpolation or generative synthetic prices. <strong>AgriLink-OR strictly forbids this.</strong>
                </p>
                <p>
                  If a mandi has not reported in the quote window, it is excluded. If a crop (like Tomato, Wheat, Rice in this dump) has only one partial season, hold-vs-sell is disabled with an honest error stating that two full annual cycles (104 weeks) are missing.
                </p>
                <div className="p-3 bg-white rounded-lg border border-slate-200 font-mono text-[11px] text-slate-600">
                  <code>python -m src.data.clean &amp;&amp; python -m src.geo.geocode_mandis</code>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: M1 STL */}
      {activeSection === 'm1' && (
        <div className="space-y-8">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6">
            <div>
              <span className="text-xs font-mono font-bold text-crimson-brand uppercase">Stage 02 · Pure Econometrics</span>
              <h2 className="text-2xl font-black text-slate-900 mt-1">M1 · Seasonal-Trend LOESS Decomposition (STL)</h2>
              <p className="text-sm text-slate-600 mt-1">
                Extracting true agronomic seasonal cycles and generating the deterministic price path <code>p(d)</code> for M3.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                <ChartStl />
                <ChartSeasonalIndex />
              </div>

              <div className="bg-slate-50 border border-slate-200 p-5 rounded-xl space-y-4 text-xs text-slate-700">
                <h4 className="font-bold text-sm text-slate-900">Mathematical Specification</h4>
                
                <div>
                  <span className="font-semibold text-slate-900 block mb-1">1. Log-Additive Formulation:</span>
                  <code className="bg-white p-2 rounded border border-slate-200 block font-mono text-[11px]">
                    log(Price) = Trend + Seasonal + Residual
                  </code>
                  <p className="mt-1 text-slate-500">Log transform reflects proportional economic swings: ₹500 move matters at ₹1,000, not at ₹5,000.</p>
                </div>

                <div>
                  <span className="font-semibold text-slate-900 block mb-1">2. ±2σ Residual Volatility Bands:</span>
                  <code className="bg-white p-2 rounded border border-slate-200 block font-mono text-[11px]">
                    Upper = exp(Trend + Seasonal + μ + 2σ)
                    Lower = exp(Trend + Seasonal + μ − 2σ)
                  </code>
                  <p className="mt-1 text-slate-500">Rolling 12-week residual standard deviation σ establishes normal price noise.</p>
                </div>

                <div>
                  <span className="font-semibold text-slate-900 block mb-1">3. GLUT &amp; SPIKE Outlier Flags:</span>
                  <code className="bg-white p-2 rounded border border-slate-200 block font-mono text-[11px]">
                    z = (Residual − μ) / σ
                    z &lt; −2 → GLUT | z &gt; +2 → SPIKE
                  </code>
                  <p className="mt-1 text-slate-500">GLUT signals seasonal buy windows; SPIKE signals temporary liquidity squeezes.</p>
                </div>

                <div>
                  <span className="font-semibold text-slate-900 block mb-1">4. Projected Price Path p(d):</span>
                  <code className="bg-white p-2 rounded border border-slate-200 block font-mono text-[11px]">
                    p(d) = exp(trend_last + slope·(d/7) + seasonal[d/7])
                  </code>
                  <p className="mt-1 text-slate-500">26-week OLS trend slope + replayed calendar seasonality.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: M2 NIHR */}
      {activeSection === 'm2' && (
        <div className="space-y-8">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6">
            <div>
              <span className="text-xs font-mono font-bold text-crimson-brand uppercase">Stage 03 · W1 · Where to Sell?</span>
              <h2 className="text-2xl font-black text-slate-900 mt-1">M2 · Net-in-Hand Realisation (NIHR) Spatial Arbitrage</h2>
              <p className="text-sm text-slate-600 mt-1">
                Walking the cash out of the FPO's pocket quintal by quintal across local Karnataka and national interstate mandis.
              </p>
            </div>

            <CostWalkStrip />

            {/* Real Mandi Ranking Table */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-extrabold text-slate-900">
                  Live Mandi Ranking Matrix (Ship-From: Davangere Depot)
                </h4>
                <span className="text-xs text-slate-500 font-mono">
                  Board Rank ≠ Net Rank is Pure Arbitrage
                </span>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="p-3">Net Rank</th>
                      <th className="p-3">Mandi Market</th>
                      <th className="p-3">State</th>
                      <th className="p-3">Km (1.3× Circuity)</th>
                      <th className="p-3">Board Price</th>
                      <th className="p-3">Transit Shrink</th>
                      <th className="p-3">Freight/qtl</th>
                      <th className="p-3">Cess/Fees</th>
                      <th className="p-3 font-bold text-crimson-brand">NET IN HAND</th>
                      <th className="p-3">Board Rank</th>
                      <th className="p-3">Arbitrage vs Nearest</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {SAMPLE_MANDIS.map((m) => (
                      <tr key={m.market} className={`hover:bg-slate-50/80 ${m.rank === 1 ? 'bg-crimson-50/40 font-semibold' : ''}`}>
                        <td className="p-3 font-bold text-slate-900">#{m.rank}</td>
                        <td className="p-3 font-sans font-semibold text-slate-900">
                          {m.market}
                          {m.state !== 'Karnataka' && (
                            <span className="ml-1 text-[9px] bg-crimson-100 text-crimson-brand px-1 py-0.2 rounded font-mono">
                              INTERSTATE
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-slate-600 font-sans">{m.state}</td>
                        <td className="p-3">{m.km} km</td>
                        <td className="p-3">₹{m.board_price.toLocaleString()}</td>
                        <td className="p-3 text-crimson-brand">-₹{m.transit_loss}</td>
                        <td className="p-3 text-crimson-brand">-₹{m.freight}</td>
                        <td className="p-3 text-crimson-brand">-₹{m.fees + m.handling}</td>
                        <td className="p-3 font-black text-sm text-crimson-brand">
                          ₹{m.net_per_qtl.toLocaleString()}
                        </td>
                        <td className="p-3">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] ${m.rank === m.rank_board ? 'bg-slate-100' : 'bg-amber-100 text-amber-900 font-bold'}`}>
                            #{m.rank_board}
                          </span>
                        </td>
                        <td className="p-3 font-bold text-emerald-700">
                          {m.arbitrage_vs_nearest > 0 ? `+₹${m.arbitrage_vs_nearest}` : `₹${m.arbitrage_vs_nearest}`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Freight and Shrinkage Formulas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <span className="font-bold text-slate-900 block mb-1">Freight Calculation (Two-Way Leg Billed):</span>
                <code className="text-slate-700 font-mono text-[11px] block">
                  r_km = (diesel / mileage) + driver_batta = (90 / 4) + 8 = 30.5 ₹/km<br/>
                  trucks = ceil(Q / 100 qtl) = 2<br/>
                  freight = trucks × [fixed_trip + (2.0 × r_km × km)]
                </code>
              </div>
              <div>
                <span className="font-bold text-slate-900 block mb-1">Transit Loss &amp; Road Circuity:</span>
                <code className="text-slate-700 font-mono text-[11px] block">
                  km = Haversine_Distance × 1.30 (Circuity Factor)<br/>
                  transit_shrink = 0.005%/km × km (Dehydration &amp; bruising)<br/>
                  gross = Q × (1 - transit_shrink) × board_price
                </code>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 4: M3 HOLD VS SELL */}
      {activeSection === 'm3' && (
        <div className="space-y-8">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6">
            <div>
              <span className="text-xs font-mono font-bold text-crimson-brand uppercase">Stage 04 · W2 · When to Sell?</span>
              <h2 className="text-2xl font-black text-slate-900 mt-1">M3 · Hold vs Sell Break-Even &amp; CBC MILP Liquidation</h2>
              <p className="text-sm text-slate-600 mt-1">
                Modeling continuous storage shrinkage (θᵗ), pledge loan interest, discrete rent blocks, and multi-tranche sales.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Value Curve */}
              <div className="md:col-span-2 bg-slate-50 border border-slate-200 p-5 rounded-xl space-y-4">
                <h4 className="font-bold text-sm text-slate-900">The Continuous Value Curve V(t)</h4>
                <div className="bg-white p-3 rounded-lg border border-slate-200 font-mono text-xs">
                  <code>V(t) = θᵗ · p(t) − c·t − Entry_Fee · [t &gt; 0], with V(0) = p₀</code>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Notice the exponential factor <strong className="text-slate-900 font-mono">θᵗ</strong>: you cannot sell what you put into the warehouse. At 1%/month moisture shrinkage over 180 days, θ¹⁸⁰ = 0.942. An FPO storing 200 quintals can only liquidate ~188 quintals. Price-only models completely miss this 11.6 quintal loss.
                </p>

                <div className="grid grid-cols-3 gap-3 pt-2">
                  <div className="bg-white p-3 rounded border border-slate-200">
                    <span className="text-[10px] text-slate-400 font-mono uppercase block">Daily Carry Cost</span>
                    <span className="text-lg font-black font-mono text-slate-900">₹0.92/qtl/day</span>
                    <span className="text-[10px] text-slate-500 block">Rent + LTV 70% Loan</span>
                  </div>
                  <div className="bg-white p-3 rounded border border-slate-200">
                    <span className="text-[10px] text-slate-400 font-mono uppercase block">Break-Even Day</span>
                    <span className="text-lg font-black font-mono text-crimson-brand">Day 4</span>
                    <span className="text-[10px] text-slate-500 block">First t where V(t) ≥ V(0)</span>
                  </div>
                  <div className="bg-white p-3 rounded border border-slate-200">
                    <span className="text-[10px] text-slate-400 font-mono uppercase block">Optimal Peak</span>
                    <span className="text-lg font-black font-mono text-emerald-700">Day 157</span>
                    <span className="text-[10px] text-slate-500 block">Gain: +₹2,182/qtl</span>
                  </div>
                </div>
              </div>

              {/* MILP CBC Solver */}
              <div className="bg-slate-50 border border-slate-200 p-5 rounded-xl space-y-4 text-xs text-slate-700">
                <h4 className="font-bold text-sm text-slate-900">CBC MILP Constraints</h4>
                <p className="text-slate-600">
                  Instead of assuming a clairvoyant single-day sale that floods the market, AgriLink-OR solves a true Mixed-Integer Linear Program (MILP) with realistic operational bounds:
                </p>
                <ul className="space-y-2 text-slate-600 font-mono text-[11px]">
                  <li>• <strong>Max Tranches:</strong> ∑ z(t) ≤ 3 sales</li>
                  <li>• <strong>Min Lot Size:</strong> q(t) ≥ 10% · Q₀</li>
                  <li>• <strong>Inventory Balance:</strong> I(t) = θ·I(t−1) − q(t)</li>
                  <li>• <strong>Terminal Depletion:</strong> I(T) = 0</li>
                  <li>• <strong>30-Day Block Charge:</strong> Discrete rent binary b(k)</li>
                </ul>
                <div className="p-3 bg-emerald-50 text-emerald-800 rounded border border-emerald-200 font-mono text-[11px]">
                  Solver: COIN-OR CBC 2.10 (Open Source, In-Process, Deterministic)
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* SECTION 5: M4 KNAPSACK */}
      {activeSection === 'm4' && (
        <div className="space-y-8">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6">
            <div>
              <span className="text-xs font-mono font-bold text-crimson-brand uppercase">Stage 05 · W3 · To Whom to Sell?</span>
              <h2 className="text-2xl font-black text-slate-900 mt-1">M4 · Bounded Knapsack Aggregation &amp; DP Cross-Check</h2>
              <p className="text-sm text-slate-600 mt-1">
                Fulfilling institutional procurement contracts without excess waste and enforcing fair cooperative quotas.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="bg-slate-50 border border-slate-200 p-5 rounded-xl space-y-4 text-xs text-slate-700">
                <h4 className="font-bold text-sm text-slate-900">The Institutional Contract Problem</h4>
                <p>
                  A food processor issues a firm purchase order for <strong>400 quintals</strong> at a guaranteed price, with a strict surplus tolerance limit of <strong>≤ 3%</strong> (at most 412 quintals accepted).
                </p>
                <p>
                  The FPO holds a roster of 25 smallholder farmer lots ranging from 8 to 45 quintals. Naive manual assignment either results in huge surplus loss (unsold crops rotting at the depot) or allows 1–2 large farmers to monopolize the entire contract.
                </p>

                <div className="bg-white p-3 rounded-lg border border-slate-200 font-mono text-[11px] space-y-1">
                  <div><strong>Target (T):</strong> 400 quintals</div>
                  <div><strong>Tolerance (ε):</strong> 3.0% (max 412 qtl)</div>
                  <div><strong>Concentration Cap:</strong> No farmer &gt; 40% (max 160 qtl)</div>
                  <div><strong>Multiplicity:</strong> Lot count xᵢ ≤ cᵢ</div>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-5 rounded-xl space-y-4 text-xs text-slate-700">
                <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Dual-Engine Verification: MILP + DP
                </h4>
                <p>
                  AgriLink-OR solves the aggregation twice through two completely independent mathematical algorithms:
                </p>
                
                <div className="space-y-2">
                  <div className="p-3 bg-white rounded border border-slate-200">
                    <span className="font-bold text-slate-900 block">1. COIN-OR CBC MILP</span>
                    <span className="text-slate-600 font-mono text-[11px]">
                      Result: 8 farmers selected · Total 400.0 qtl · Surplus: 0.0 qtl
                    </span>
                  </div>

                  <div className="p-3 bg-white rounded border border-slate-200">
                    <span className="font-bold text-slate-900 block">2. 0/1 Subset-Sum Dynamic Programming (O(N·S))</span>
                    <span className="text-slate-600 font-mono text-[11px]">
                      Result: DP surplus 0.0 qtl · Status: Dual Solvers Agree (100% Verified)
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 font-mono">
                  When both solvers agree on 0 surplus, the FPO has a mathematical guarantee that procurement waste is zero.
                </p>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
};
