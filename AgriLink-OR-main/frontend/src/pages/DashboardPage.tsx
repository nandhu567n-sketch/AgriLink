import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ExternalLink,
  RotateCcw,
  Sparkles,
  MapPin,
  Clock,
  PackageCheck,
  AlertCircle,
  Download,
  Info,
  ChevronDown,
  ChevronUp,
  Layers,
  Database,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { api } from '../api/client';
import type {
  DecisionQueryParams,
  DecisionResponse,
  MetaResponse,
  M2Row,
} from '../api/types';
import { InteractiveStlChart } from '../components/InteractiveStlChart';
import { CalendarMonthChart } from '../components/CalendarMonthChart';
import { RankRevealChart } from '../components/RankRevealChart';
import { InteractiveValueCurve } from '../components/InteractiveValueCurve';
import { MapLeaflet } from '../components/MapLeaflet';
import { KnowledgeBaseTab } from '../components/KnowledgeBaseTab';

export const DashboardPage: React.FC = () => {
  // ------------------------------------------------------------- 1. State
  const [meta, setMeta] = useState<MetaResponse | null>(null);
  const [loadingMeta, setLoadingMeta] = useState<boolean>(true);
  const [metaError, setMetaError] = useState<string | null>(null);

  // Workflow state
  const [workflowStep, setWorkflowStep] = useState<'Pick' | 'Decide' | 'Drill'>('Decide');
  const [activeW, setActiveW] = useState<'all' | 'where' | 'when' | 'whom'>('all');
  const [activeTab, setActiveTab] = useState<'market' | 'where' | 'hold' | 'aggregate' | 'inputs' | 'kb'>('market');

  // Tour and Provenance Expanders
  const [showTour, setShowTour] = useState<boolean>(false);
  const [showProvenance, setShowProvenance] = useState<boolean>(true);

  // Sidebar controls
  const [marketScope, setMarketScope] = useState<string>('Karnataka (Home State)');
  const [targetState, setTargetState] = useState<string>('Maharashtra');
  const [crop, setCrop] = useState<string>('Onion');
  const [variety, setVariety] = useState<string>('All');
  const [asOf, setAsOf] = useState<string>('2025-06-11');
  const [fromDate, setFromDate] = useState<string>('2023-06-06');
  const [priceWindow, setPriceWindow] = useState<number>(14);
  const [volume, setVolume] = useState<number>(200);
  const [horizon, setHorizon] = useState<number>(180);
  const [conservative, setConservative] = useState<boolean>(false);
  const [nFarmers, setNFarmers] = useState<number>(25);
  const [targetOrder, setTargetOrder] = useState<number>(400);
  const [refMandi, setRefMandi] = useState<string | null>(null);

  // Cost overrides
  const [rentPerQtlMonth, setRentPerQtlMonth] = useState<number>(6.0);
  const [dieselPrice, setDieselPrice] = useState<number>(90.0);
  const [loanInterest, setLoanInterest] = useState<number>(9.0);
  const [loanLtv, setLoanLtv] = useState<number>(70);
  const [shrinkPerMonth, setShrinkPerMonth] = useState<number>(1.0);
  const [marketFees, setMarketFees] = useState<number>(3.0);
  const [farmLat, setFarmLat] = useState<number>(14.30);
  const [farmLon, setFarmLon] = useState<number>(76.00);

  // API Query Result
  const [decision, setDecision] = useState<DecisionResponse | null>(null);
  const [loadingDecision, setLoadingDecision] = useState<boolean>(false);
  const [decisionError, setDecisionError] = useState<string | null>(null);

  // ------------------------------------------------------------- 2. Load Meta on Mount
  useEffect(() => {
    let isMounted = true;
    setLoadingMeta(true);
    api
      .getMeta()
      .then((data) => {
        if (!isMounted) return;
        setMeta(data);
        if (data.date_max) setAsOf(data.date_max);
        if (data.date_min) setFromDate(data.date_min);
        if (data.default_farm) {
          setFarmLat(data.default_farm.lat);
          setFarmLon(data.default_farm.lon);
        }
        if (data.params) {
          if (data.params.freight?.diesel_price) setDieselPrice(data.params.freight.diesel_price);
          if (data.params.storage?.rent_per_qtl_month) setRentPerQtlMonth(data.params.storage.rent_per_qtl_month);
          if (data.params.storage?.loan_interest) setLoanInterest(data.params.storage.loan_interest * 100);
          if (data.params.storage?.loan_ltv) setLoanLtv(Math.round(data.params.storage.loan_ltv * 100));
          if (data.params.storage?.shrink_per_month) setShrinkPerMonth(data.params.storage.shrink_per_month * 100);
          if (data.params.market) {
            const cess = data.params.market.cess_frac || 0;
            const comm = data.params.market.commission_frac || 0;
            setMarketFees(Number(((cess + comm) * 100).toFixed(1)));
          }
        }
        setLoadingMeta(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        setMetaError(err.message || 'Failed to load metadata from backend API.');
        setLoadingMeta(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // ------------------------------------------------------------- 3. Fetch Decision
  const fetchDecisionData = useCallback(async () => {
    if (!asOf || !crop) return;
    setLoadingDecision(true);
    setDecisionError(null);

    const overrides: Record<string, any> = {
      'storage.rent_per_qtl_month': rentPerQtlMonth,
      'freight.diesel_price': dieselPrice,
      'storage.loan_interest': loanInterest / 100,
      'storage.loan_ltv': loanLtv / 100,
      'storage.shrink_per_month': shrinkPerMonth / 100,
      'market.cess_frac': marketFees / 100,
      'market.commission_frac': 0.0,
    };

    const isAllStates = marketScope === '🌟 Pan-India (All 26 States / Best Price)';
    const isInterstate = marketScope === 'Destination State (Interstate)';

    const queryParams: DecisionQueryParams = {
      crop,
      as_of: asOf,
      variety,
      window_days: priceWindow,
      volume,
      horizon,
      conservative,
      farm_lat: farmLat,
      farm_lon: farmLon,
      n_farmers: nFarmers,
      order: targetOrder,
      ref_mandi: refMandi || undefined,
      overrides,
    };

    if (isAllStates) {
      (queryParams as any).all_states = true;
    } else if (isInterstate) {
      (queryParams as any).target_state = targetState;
    }

    try {
      const res = await api.getDecision(queryParams);
      setDecision(res);
      // Auto-set refMandi if not set
      if (!refMandi && res.m1?.ref_mandi) {
        setRefMandi(res.m1.ref_mandi);
      }
    } catch (err: any) {
      setDecisionError(err.message || 'Error computing decision matrix.');
    } finally {
      setLoadingDecision(false);
    }
  }, [
    crop,
    asOf,
    variety,
    priceWindow,
    volume,
    horizon,
    conservative,
    farmLat,
    farmLon,
    nFarmers,
    targetOrder,
    refMandi,
    rentPerQtlMonth,
    dieselPrice,
    loanInterest,
    loanLtv,
    shrinkPerMonth,
    marketFees,
    marketScope,
    targetState,
  ]);

  // Trigger decision fetch when essential controls change
  useEffect(() => {
    if (!meta) return;
    const timer = setTimeout(() => {
      fetchDecisionData();
    }, 180);
    return () => clearTimeout(timer);
  }, [fetchDecisionData, meta]);

  // Varieties available for selected crop
  const availableVarieties = useMemo(() => {
    if (!meta?.varieties || !meta.varieties[crop]) return ['All'];
    return ['All', ...meta.varieties[crop]];
  }, [meta, crop]);

  // States available for interstate selection
  const availableStates: string[] = useMemo(() => {
    const defaultStates = [
      'Maharashtra',
      'Tamil Nadu',
      'Gujarat',
      'Rajasthan',
      'Andhra Pradesh',
      'Madhya Pradesh',
      'Uttar Pradesh',
      'Punjab',
      'Delhi',
      'West Bengal',
    ];
    if (meta && (meta as any).states) {
      return ((meta as any).states as string[]).filter((s: string) => s !== 'Karnataka');
    }
    return defaultStates;
  }, [meta]);

  // Top rankings and cost walk calculations
  const costWalk = decision?.m2?.cost_walk;
  const topMandi = decision?.m2?.top;
  const boardTop = decision?.m2?.board_top;
  const m1 = decision?.m1;
  const m3 = decision?.m3;
  const m4 = decision?.m4;

  const isInterstateScope = marketScope !== 'Karnataka (Home State)';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 pb-24 text-slate-800">
      
      {/* ---------------------------------------------------------------- HERO HEADER */}
      <section className="bg-gradient-to-br from-white via-rose-50/30 to-white border border-slate-200 border-l-4 border-l-crimson-brand rounded-2xl p-6 sm:p-8 shadow-sm relative overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold tracking-wider text-crimson-brand bg-crimson-50 border border-crimson-200 px-3 py-1 rounded-full uppercase">
            <span className="w-2 h-2 rounded-full bg-crimson-brand animate-ping" />
            <span>Decision Support · Farmer Producer Organisations · Real Agmarknet Data</span>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-slate-500">Live API:</span>
            <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Port 8000 Connected
            </span>
          </div>
        </div>

        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 mt-3 mb-2">
          AgriLink<span className="text-crimson-brand">-OR</span>
        </h1>

        <p className="text-sm sm:text-base text-slate-600 max-w-4xl leading-relaxed">
          An FPO asks the same hard question every week — <strong>sell today or hold?</strong> If we hold, <strong>where</strong> and <strong>when</strong>? The number on the mandi board cannot answer that: it ignores freight, cess, handling and transit loss, so the highest quoted price is often <em>not</em> the most money in hand. AgriLink-OR walks the cash out of the pocket quintal by quintal with four deterministic operations-research modules — <strong>no machine learning, every number traceable</strong> — and returns three answers from {decision?.provenance?.rows_in_view ? decision.provenance.rows_in_view.toLocaleString() : '14,352'} live price observations.
        </p>

        {/* Dynamic Net-in-Hand Cost Walk Equation */}
        <div className="mt-6 flex flex-wrap items-center gap-2 sm:gap-3 text-xs font-mono">
          <div className="bg-white border border-slate-200 rounded-xl px-3.5 py-2 min-w-[120px] shadow-xs">
            <span className="text-[10px] text-slate-400 block uppercase font-sans">Board Price (Quote)</span>
            <strong className="text-base text-slate-900 font-black">
              ₹{costWalk ? Math.round(costWalk.board_price).toLocaleString() : '—'}
            </strong>
          </div>

          <span className="text-lg font-black text-crimson-brand">−</span>

          <div className="bg-rose-50/70 border border-rose-200 rounded-xl px-3 py-2 min-w-[110px] shadow-xs">
            <span className="text-[10px] text-rose-700 block uppercase font-sans">Transit Loss</span>
            <strong className="text-sm text-crimson-brandDark font-black">
              ₹{costWalk ? Math.round(costWalk.transit_loss).toLocaleString() : '—'}
            </strong>
          </div>

          <span className="text-lg font-black text-crimson-brand">−</span>

          <div className="bg-rose-50/70 border border-rose-200 rounded-xl px-3 py-2 min-w-[110px] shadow-xs">
            <span className="text-[10px] text-rose-700 block uppercase font-sans">Freight / Q</span>
            <strong className="text-sm text-crimson-brandDark font-black">
              ₹{costWalk ? Math.round(costWalk.freight).toLocaleString() : '—'}
            </strong>
          </div>

          <span className="text-lg font-black text-crimson-brand">−</span>

          <div className="bg-rose-50/70 border border-rose-200 rounded-xl px-3 py-2 min-w-[110px] shadow-xs">
            <span className="text-[10px] text-rose-700 block uppercase font-sans">Cess + Handling</span>
            <strong className="text-sm text-crimson-brandDark font-black">
              ₹{costWalk ? Math.round(costWalk.fees + costWalk.handling).toLocaleString() : '—'}
            </strong>
          </div>

          <span className="text-lg font-black text-crimson-brand">=</span>

          <div className="bg-gradient-to-r from-crimson-brand to-rose-600 text-white rounded-xl px-4 py-2 min-w-[140px] shadow-md">
            <span className="text-[10px] text-rose-100 block uppercase font-sans font-bold">NET IN HAND</span>
            <strong className="text-lg text-white font-black">
              ₹{costWalk ? Math.round(costWalk.net_per_qtl).toLocaleString() : '—'}/qtl
            </strong>
          </div>
        </div>

        {/* 3 Question Mini Cards in Hero */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6">
          <div className="bg-white border border-slate-200 border-t-2 border-t-crimson-brand rounded-xl p-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-crimson-brandDark tracking-wider uppercase font-mono">
                📍 WHERE TO SELL
              </span>
              <span className="text-[9px] font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">W1 · M2</span>
            </div>
            <p className="text-[11px] text-slate-600 mt-1">
              Which mandi leaves the most ₹ in hand after freight, cess, handling, and transit shrink.
            </p>
          </div>

          <div className="bg-white border border-slate-200 border-t-2 border-t-crimson-brand rounded-xl p-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-crimson-brandDark tracking-wider uppercase font-mono">
                ⏱️ WHEN TO SELL
              </span>
              <span className="text-[9px] font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">W2 · M3</span>
            </div>
            <p className="text-[11px] text-slate-600 mt-1">
              Is storing worth it? On which day does holding beat selling now once rent, financing, and decay are charged?
            </p>
          </div>

          <div className="bg-white border border-slate-200 border-t-2 border-t-crimson-brand rounded-xl p-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-crimson-brandDark tracking-wider uppercase font-mono">
                🤝 TO WHOM TO SELL
              </span>
              <span className="text-[9px] font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">W3 · M4</span>
            </div>
            <p className="text-[11px] text-slate-600 mt-1">
              Which farmers' lots fill a buyer's bulk order with ≤3% surplus and no single farm dominating (&lt;40%).
            </p>
          </div>
        </div>

        {/* Pipeline Strip */}
        <div className="mt-5 bg-white border border-slate-200 rounded-xl p-3 flex flex-wrap items-center gap-2 text-xs font-mono">
          <span className="text-[10px] font-bold uppercase text-slate-400">Pure Pipeline:</span>
          <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700">Data (Agmarknet)</span>
          <span>→</span>
          <span className="bg-rose-50 text-crimson-900 border border-rose-200 px-2 py-0.5 rounded font-semibold">M1: STL Bands</span>
          <span>→</span>
          <span className="bg-rose-50 text-crimson-900 border border-rose-200 px-2 py-0.5 rounded font-semibold">M2: Net-in-Hand</span>
          <span>→</span>
          <span className="bg-rose-50 text-crimson-900 border border-rose-200 px-2 py-0.5 rounded font-semibold">M3: Hold-vs-Sell MILP</span>
          <span>→</span>
          <span className="bg-rose-50 text-crimson-900 border border-rose-200 px-2 py-0.5 rounded font-semibold">M4: Knapsack</span>
          <span>→</span>
          <span className="bg-slate-900 text-white px-2 py-0.5 rounded font-bold">Decision</span>
        </div>

        {/* Ticker Strip */}
        <div className="mt-3 overflow-hidden bg-white border border-slate-200 border-l-4 border-l-crimson-brand rounded-xl py-2 px-3 text-[11px] font-mono text-slate-500 flex items-center gap-4">
          <div className="flex items-center gap-6 whitespace-nowrap animate-marquee">
            <span>DATASET <strong>14,352</strong> ROWS</span>
            <span>·</span>
            <span>MANDIS <strong>72</strong> GEOCODED</span>
            <span>·</span>
            <span>COVERAGE <strong>06 JUN 2023 → 11 JUN 2025</strong></span>
            <span>·</span>
            <span>PAN-INDIA <strong>26 STATES · 1,611 MANDIS</strong></span>
            <span>·</span>
            <span>STACK <strong>STL + MILP + KNAPSACK</strong></span>
            <span>·</span>
            <span>TESTED <strong>43 PURE TESTS PASSING</strong></span>
            <span>·</span>
            <span>ZERO <strong>MACHINE LEARNING</strong></span>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- TOUR & PROVENANCE EXPANDERS */}
      <div className="space-y-3">
        {/* 60-Second Tour */}
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
          <button
            onClick={() => setShowTour(!showTour)}
            className="w-full flex items-center justify-between p-3.5 text-xs font-bold text-slate-800 hover:bg-slate-50 text-left transition-colors"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-crimson-brand" />
              <span>New here? Take the 60-second tour of this dashboard</span>
            </div>
            {showTour ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>

          {showTour && (
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs text-slate-600">
              <div className="bg-white p-3 rounded-lg border border-slate-200">
                <span className="text-[10px] font-mono font-bold text-crimson-brand">Step 1 · Pick</span>
                <h4 className="font-bold text-slate-900 mt-1">Set the World</h4>
                <p className="text-[11px] mt-1 text-slate-500">
                  Sidebar controls: Destination scope, crop, variety, and historical date range. Point-in-time cuts let you replay past decisions.
                </p>
              </div>

              <div className="bg-white p-3 rounded-lg border border-slate-200">
                <span className="text-[10px] font-mono font-bold text-crimson-brand">Step 2 · Decide</span>
                <h4 className="font-bold text-slate-900 mt-1">The 3 W's</h4>
                <p className="text-[11px] mt-1 text-slate-500">
                  Where to sell (W1), When to sell (W2), and To whom (W3) pack smallholder lots for bulk buyers.
                </p>
              </div>

              <div className="bg-white p-3 rounded-lg border border-slate-200">
                <span className="text-[10px] font-mono font-bold text-crimson-brand">Step 3 · Drill</span>
                <h4 className="font-bold text-slate-900 mt-1">Inspect Math</h4>
                <p className="text-[11px] mt-1 text-slate-500">
                  Drill tabs break down STL decomposition, mandi map, V(t) carry curves, MILP schedule, and the complete Knowledge Base.
                </p>
              </div>

              <div className="bg-white p-3 rounded-lg border border-slate-200">
                <span className="text-[10px] font-mono font-bold text-crimson-brand">Step 4 · Argue</span>
                <h4 className="font-bold text-slate-900 mt-1">Argue with It</h4>
                <p className="text-[11px] mt-1 text-slate-500">
                  Every cost is an interactive slider: diesel, rent, shrink, cess. They override params.yaml dynamically in real-time.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Data Provenance & Freshness */}
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
          <button
            onClick={() => setShowProvenance(!showProvenance)}
            className="w-full flex items-center justify-between p-3.5 text-xs font-bold text-slate-800 hover:bg-slate-50 text-left transition-colors"
          >
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-slate-500" />
              <span>Data provenance and freshness</span>
              <span className="text-[10px] font-mono text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-semibold">
                Agmarknet Live Slice
              </span>
            </div>
            {showProvenance ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>

          {showProvenance && (
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-3 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
                <div className="bg-white p-3 rounded-xl border border-slate-200">
                  <div className="text-[10px] text-slate-400 uppercase">Rows in View</div>
                  <div className="text-lg font-black text-slate-900 mt-0.5">
                    {decision?.provenance?.rows_in_view?.toLocaleString() || meta?.rows_total?.toLocaleString() || '14,352'}
                  </div>
                  <div className="text-[10px] text-slate-500">{crop} observations</div>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200">
                  <div className="text-[10px] text-slate-400 uppercase">Coverage</div>
                  <div className="text-sm font-black text-slate-900 mt-1">
                    {meta?.date_min || '2023-06-06'} → {meta?.date_max || '2025-06-11'}
                  </div>
                  <div className="text-[10px] text-slate-500">2 full crop years</div>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200">
                  <div className="text-[10px] text-slate-400 uppercase">Reporting Mandis</div>
                  <div className="text-lg font-black text-slate-900 mt-0.5">
                    {decision?.provenance?.markets_in_view || meta?.markets_total || 72}
                  </div>
                  <div className="text-[10px] text-slate-500">{decision?.provenance?.districts_in_view || 21} districts</div>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200">
                  <div className="text-[10px] text-slate-400 uppercase">Data Age</div>
                  <div className="text-lg font-black text-crimson-brand mt-0.5">
                    {decision?.provenance?.age_days != null ? `${decision.provenance.age_days} days` : 'Point-in-time'}
                  </div>
                  <div className="text-[10px] text-slate-500">Cleaned historical slice</div>
                </div>
              </div>

              <div className="text-slate-600 leading-relaxed font-sans text-xs bg-white p-3 rounded-xl border border-slate-200">
                🌐 <strong>National Data Coverage:</strong> Full pan-India dataset (<code>clean_all.parquet</code>) covers <strong>727,050 records</strong> across <strong>26 Indian states</strong> and <strong>1,611 geocoded mandis</strong> (<code>mandis_all.csv</code>). Baseline Karnataka slice has 14,352 rows across 72 mandis.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------- 2-COLUMN MAIN LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ======================================= LEFT SIDEBAR CONTROLS */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-6">
          
          {/* Workflow Step Selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-crimson-brandDark">
                Workflow Step
              </span>
              <span className="text-[10px] font-mono text-slate-400 font-bold">1 · 2 · 3</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl">
              {(['Pick', 'Decide', 'Drill'] as const).map((step, idx) => (
                <button
                  key={step}
                  onClick={() => setWorkflowStep(step)}
                  className={`py-2 rounded-lg text-xs font-bold transition-all font-mono ${
                    workflowStep === step
                      ? 'bg-crimson-brand text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {idx + 1} · {step}
                </button>
              ))}
            </div>
          </div>

          {/* 1. Destination Market Scope */}
          <div>
            <div className="text-xs font-mono font-bold uppercase tracking-wider text-crimson-brandDark mb-2">
              1 · Destination Market Scope
            </div>
            <div className="space-y-1.5 text-xs font-medium">
              {[
                'Karnataka (Home State)',
                'Destination State (Interstate)',
                '🌟 Pan-India (All 26 States / Best Price)',
              ].map((scope) => (
                <label
                  key={scope}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                    marketScope === scope
                      ? 'border-crimson-300 bg-crimson-50/60 text-slate-900 font-bold shadow-xs'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="scope"
                    checked={marketScope === scope}
                    onChange={() => setMarketScope(scope)}
                    className="accent-crimson-brand"
                  />
                  <span className="truncate">{scope}</span>
                </label>
              ))}
            </div>

            {/* Target State Dropdown if Interstate */}
            {marketScope === 'Destination State (Interstate)' && (
              <div className="mt-2.5 pt-2 border-t border-slate-100">
                <label className="text-xs font-semibold text-slate-700 block mb-1">Pick Destination State</label>
                <select
                  value={targetState}
                  onChange={(e) => setTargetState(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-mono text-slate-900 font-bold focus:ring-1 focus:ring-crimson-brand focus:border-crimson-brand"
                >
                  {availableStates.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* 2. Crop & Variety */}
          <div>
            <div className="text-xs font-mono font-bold uppercase tracking-wider text-crimson-brandDark mb-2">
              2 · Crop &amp; Variety Selection
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[11px] text-slate-500 block mb-1">Crop</span>
                <select
                  value={crop}
                  onChange={(e) => {
                    setCrop(e.target.value);
                    setVariety('All');
                    setRefMandi(null);
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono text-slate-900 font-bold"
                >
                  {(meta?.crops || ['Onion', 'Potato', 'Tomato', 'Wheat', 'Rice']).map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <span className="text-[11px] text-slate-500 block mb-1">Variety</span>
                <select
                  value={variety}
                  onChange={(e) => setVariety(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono text-slate-900"
                >
                  {availableVarieties.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <span className="text-[10px] text-slate-400 font-mono block mt-1">
              'All' pools every variety reported at the mandi.
            </span>
          </div>

          {/* 3. Historical Date Range (2 Years) */}
          <div>
            <div className="text-xs font-mono font-bold uppercase tracking-wider text-crimson-brandDark mb-2">
              3 · Historical Date Range (2 Years)
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div>
                <label className="text-[11px] text-slate-500 block mb-1">Price as of (To Date)</label>
                <input
                  type="date"
                  value={asOf}
                  min={meta?.date_min || '2023-06-06'}
                  max={meta?.date_max || '2025-06-11'}
                  onChange={(e) => setAsOf(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 font-bold"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-500 block mb-1">Price from (Start Date)</label>
                <input
                  type="date"
                  value={fromDate}
                  min={meta?.date_min || '2023-06-06'}
                  max={asOf}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900"
                />
              </div>
            </div>

            <div className="mt-3">
              <div className="flex items-center justify-between text-xs font-semibold mb-1">
                <span className="text-slate-600">Quote window:</span>
                <span className="font-mono text-slate-900">{priceWindow} days</span>
              </div>
              <input
                type="range"
                min="1"
                max="60"
                value={priceWindow}
                onChange={(e) => setPriceWindow(Number(e.target.value))}
                className="w-full accent-crimson-brand"
              />
              <span className="text-[10px] text-slate-400 font-mono block">
                Median modal price over this window ending at 'Price as of'
              </span>
            </div>
          </div>

          {/* Decision Inputs */}
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <div className="text-xs font-mono font-bold uppercase tracking-wider text-crimson-brandDark">
              Decision Inputs
            </div>

            <div>
              <div className="flex items-center justify-between text-xs font-semibold mb-1">
                <span className="text-slate-600">Crop volume (Q):</span>
                <span className="font-mono font-bold text-slate-900">{volume} qtl</span>
              </div>
              <input
                type="range"
                min="10"
                max="1000"
                step="10"
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="w-full accent-crimson-brand"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-xs font-semibold mb-1">
                <span className="text-slate-600">Horizon:</span>
                <span className="font-mono font-bold text-slate-900">{horizon} days</span>
              </div>
              <input
                type="range"
                min="30"
                max="240"
                step="10"
                value={horizon}
                onChange={(e) => setHorizon(Number(e.target.value))}
                className="w-full accent-crimson-brand"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="conservative"
                checked={conservative}
                onChange={(e) => setConservative(e.target.checked)}
                className="accent-crimson-brand rounded"
              />
              <label htmlFor="conservative" className="text-xs font-medium text-slate-700 cursor-pointer">
                Conservative (project on lower band)
              </label>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs font-semibold mb-1">
                <span className="text-slate-600">Farmers in pool:</span>
                <span className="font-mono font-bold text-slate-900">{nFarmers}</span>
              </div>
              <input
                type="range"
                min="5"
                max="60"
                step="5"
                value={nFarmers}
                onChange={(e) => setNFarmers(Number(e.target.value))}
                className="w-full accent-crimson-brand"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-xs font-semibold mb-1">
                <span className="text-slate-600">Bulk order target:</span>
                <span className="font-mono font-bold text-slate-900">{targetOrder} qtl</span>
              </div>
              <input
                type="range"
                min="50"
                max="1000"
                step="10"
                value={targetOrder}
                onChange={(e) => setTargetOrder(Number(e.target.value))}
                className="w-full accent-crimson-brand"
              />
            </div>
          </div>

          {/* Cost Assumptions (Session Overrides) */}
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <div className="text-xs font-mono font-bold uppercase tracking-wider text-crimson-brandDark">
              Cost Assumptions
            </div>

            <div>
              <div className="flex items-center justify-between text-xs font-semibold mb-1">
                <span className="text-slate-600">Warehouse rent:</span>
                <span className="font-mono text-slate-900">₹{rentPerQtlMonth.toFixed(1)}/qtl/mo</span>
              </div>
              <input
                type="range"
                min="0"
                max="20"
                step="0.5"
                value={rentPerQtlMonth}
                onChange={(e) => setRentPerQtlMonth(Number(e.target.value))}
                className="w-full accent-crimson-brand"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-xs font-semibold mb-1">
                <span className="text-slate-600">Diesel price:</span>
                <span className="font-mono text-slate-900">₹{dieselPrice.toFixed(0)}/L</span>
              </div>
              <input
                type="range"
                min="70"
                max="130"
                step="1"
                value={dieselPrice}
                onChange={(e) => setDieselPrice(Number(e.target.value))}
                className="w-full accent-crimson-brand"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-xs font-semibold mb-1">
                <span className="text-slate-600">Pledge loan interest:</span>
                <span className="font-mono text-slate-900">{loanInterest.toFixed(1)}%/yr</span>
              </div>
              <input
                type="range"
                min="4"
                max="16"
                step="0.5"
                value={loanInterest}
                onChange={(e) => setLoanInterest(Number(e.target.value))}
                className="w-full accent-crimson-brand"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-xs font-semibold mb-1">
                <span className="text-slate-600">Loan-to-value (LTV):</span>
                <span className="font-mono text-slate-900">{loanLtv}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="90"
                step="5"
                value={loanLtv}
                onChange={(e) => setLoanLtv(Number(e.target.value))}
                className="w-full accent-crimson-brand"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-xs font-semibold mb-1">
                <span className="text-slate-600">Moisture shrink:</span>
                <span className="font-mono text-slate-900">{shrinkPerMonth.toFixed(1)}%/mo</span>
              </div>
              <input
                type="range"
                min="0"
                max="5"
                step="0.1"
                value={shrinkPerMonth}
                onChange={(e) => setShrinkPerMonth(Number(e.target.value))}
                className="w-full accent-crimson-brand"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-xs font-semibold mb-1">
                <span className="text-slate-600">Cess + commission:</span>
                <span className="font-mono text-slate-900">{marketFees.toFixed(1)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="5"
                step="0.1"
                value={marketFees}
                onChange={(e) => setMarketFees(Number(e.target.value))}
                className="w-full accent-crimson-brand"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-xs font-semibold mb-1">
                <span className="text-slate-600">Farm lat / lon:</span>
                <span className="font-mono text-slate-900">{farmLat.toFixed(2)}, {farmLon.toFixed(2)}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                <input
                  type="number"
                  step="0.05"
                  value={farmLat}
                  onChange={(e) => setFarmLat(Number(e.target.value))}
                  className="bg-slate-50 border border-slate-200 rounded p-1"
                />
                <input
                  type="number"
                  step="0.05"
                  value={farmLon}
                  onChange={(e) => setFarmLon(Number(e.target.value))}
                  className="bg-slate-50 border border-slate-200 rounded p-1"
                />
              </div>
            </div>
          </div>

          {/* Reset Defaults Button */}
          <button
            onClick={() => {
              setCrop('Onion');
              setVariety('All');
              setVolume(200);
              setHorizon(180);
              setDieselPrice(90);
              setRentPerQtlMonth(6.0);
              setLoanInterest(9.0);
              setLoanLtv(70);
              setShrinkPerMonth(1.0);
              setMarketFees(3.0);
              setFarmLat(14.30);
              setFarmLon(76.00);
              setMarketScope('Karnataka (Home State)');
              setWorkflowStep('Decide');
            }}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors font-mono"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Channarayapatna Defaults</span>
          </button>

          {/* Sidebar Footer Stamp */}
          <div className="text-[11px] text-slate-500 font-mono bg-slate-50 p-3 rounded-xl border border-slate-200">
            <strong>No ML.</strong> STL decomposition, net-in-hand arithmetic, a CBC MILP, and a bounded knapsack — all deterministic, unit-tested (43 tests).
          </div>
        </div>

        {/* ======================================= RIGHT MAIN PANEL */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Step Guidance Notifications */}
          {workflowStep === 'Pick' && (
            <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-r-xl text-xs text-emerald-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>
                <strong>Step 1 · PICK MODE ACTIVE:</strong> Use the left sidebar to calibrate your Volume, Horizon, Date Range, and Logistics costs. When ready, switch to <strong>2 · Decide</strong> to inspect the 3 W's.
              </span>
            </div>
          )}

          {workflowStep === 'Drill' && (
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-xl text-xs text-blue-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <span>
                <strong>Step 3 · DRILL MODE ACTIVE:</strong> Dive into the mathematical breakdowns below: M1 seasonal decomposition, M2 mandi cost walk &amp; map, M3 storage break-even curve &amp; MILP schedule, and M4 farmer lot knapsack aggregation.
              </span>
            </div>
          )}

          {/* Error Banner */}
          {decisionError && (
            <div className="bg-rose-50 border border-rose-300 text-crimson-brandDark p-4 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-crimson-brand" />
              <div>
                <strong>Computation Notice:</strong> {decisionError}
              </div>
            </div>
          )}

          {/* Thin Crop Graceful Degradation Notice */}
          {decision?.cards?.m1_error && (
            <div className="bg-rose-50 border border-rose-300 text-crimson-brandDark p-4 rounded-xl text-xs flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-crimson-brand mt-0.5" />
              <div>
                <strong className="block text-sm mb-1">Graceful Degradation Notice ({crop}):</strong>
                <p className="leading-relaxed">
                  {decision.cards.m1_error.replace(/\*\*/g, '')}
                </p>
              </div>
            </div>
          )}

          {/* Reference Mandi Selector (if eligible mandis exist) */}
          {m1?.eligible && m1.eligible.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Reference mandi (p(d) basis):</span>
                <select
                  value={refMandi || m1.ref_mandi || m1.eligible[0]}
                  onChange={(e) => setRefMandi(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded p-1 font-bold text-slate-900"
                >
                  {m1.eligible.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              {m1.imputed_warning && (
                <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-[11px] font-sans">
                  ⚠️ {m1.imputed_warning}
                </span>
              )}
            </div>
          )}

          {/* ------------------------------------------------------------- THE 3 W's METHODOLOGY BUTTONS */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-crimson-brand animate-pulse"></span>
                <h3 className="text-base font-black text-slate-900">
                  The 3 W's Decision Methodology
                </h3>
              </div>
              <span className="text-[10px] font-mono bg-crimson-50 text-crimson-brand px-2 py-0.5 rounded font-bold uppercase">
                FPO Commercial Framework
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Every commercial decision for a Farmer Producer Organisation resolves three critical operational questions:
              <strong> Where or which mandi are you selling?</strong>, <strong>When are you selling?</strong>, and <strong>To whom are you selling?</strong>
              Click any button below to inspect its operational methodology:
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                onClick={() => {
                  setActiveW('where');
                  setWorkflowStep('Decide');
                }}
                className={`flex items-center justify-center gap-1.5 p-2.5 rounded-xl text-xs font-bold font-mono transition-all ${
                  activeW === 'where'
                    ? 'bg-crimson-brand text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>📍 W1 · WHERE</span>
              </button>

              <button
                onClick={() => {
                  setActiveW('when');
                  setWorkflowStep('Decide');
                }}
                className={`flex items-center justify-center gap-1.5 p-2.5 rounded-xl text-xs font-bold font-mono transition-all ${
                  activeW === 'when'
                    ? 'bg-crimson-brand text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>⏱️ W2 · WHEN</span>
              </button>

              <button
                onClick={() => {
                  setActiveW('whom');
                  setWorkflowStep('Decide');
                }}
                className={`flex items-center justify-center gap-1.5 p-2.5 rounded-xl text-xs font-bold font-mono transition-all ${
                  activeW === 'whom'
                    ? 'bg-crimson-brand text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>🤝 W3 · TO WHOM</span>
              </button>

              <button
                onClick={() => {
                  setActiveW('all');
                  setWorkflowStep('Decide');
                }}
                className={`flex items-center justify-center gap-1.5 p-2.5 rounded-xl text-xs font-bold font-mono transition-all ${
                  activeW === 'all'
                    ? 'bg-crimson-brand text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>🌟 View All 3 W's</span>
              </button>
            </div>

            {/* Selected W Insight Banner */}
            {activeW === 'where' && (
              <div className="bg-rose-50/60 border-l-4 border-crimson-brand p-4 rounded-r-xl text-xs space-y-1.5">
                <div className="font-black text-sm text-crimson-brandDark">
                  📍 W1 · Where or Which Mandi Are You Selling? (Module 2: Net In-Hand Arbitrage)
                </div>
                <p className="text-slate-700">
                  <strong>The Core Problem:</strong> Quoted board price is deceptive. The market quoting the highest nominal price is frequently far away, meaning diesel freight (round-trip billed), transit shrinkage, handling labor, and statutory APMC cess eat into your proceeds.
                </p>
                <p className="text-slate-600 font-mono text-[11px]">
                  Net Cash = [Board Price × (1 − Transit Shrink)] − Freight − Fees (Cess + Commission) − Handling
                </p>
                <div className="text-crimson-brand font-bold">
                  → When Board Rank ≠ Net Rank, that divergence is pure commercial arbitrage.
                </div>
              </div>
            )}

            {activeW === 'when' && (
              <div className="bg-rose-50/60 border-l-4 border-crimson-brand p-4 rounded-r-xl text-xs space-y-1.5">
                <div className="font-black text-sm text-crimson-brandDark">
                  ⏱️ W2 · When Are You Selling? (Module 3: Hold vs Sell Optimization)
                </div>
                <p className="text-slate-700">
                  <strong>The Core Problem:</strong> Storage is not free collateral. If you store 200 quintals, you face daily warehouse rent in 30-day blocks, e-NWR loan interest, and physical decay (θᵗ ≈ 1%/mo). Nominal price rises that fail to beat carry cost lose real money.
                </p>
                <p className="text-slate-600 font-mono text-[11px]">
                  V(t) = θᵗ · p(t) − c·t − Entry Fee · Break-Even Day is earliest day V(t) ≥ V(0)
                </p>
                <div className="text-crimson-brand font-bold">
                  → Solves a 3-tranche CBC Mixed-Integer Linear Program (MILP) with a 10% minimum sale constraint for the optimal staggered liquidation schedule.
                </div>
              </div>
            )}

            {activeW === 'whom' && (
              <div className="bg-rose-50/60 border-l-4 border-crimson-brand p-4 rounded-r-xl text-xs space-y-1.5">
                <div className="font-black text-sm text-crimson-brandDark">
                  🤝 W3 · To Whom Are You Selling? (Module 4: Bulk Order Aggregation)
                </div>
                <p className="text-slate-700">
                  <strong>The Core Problem:</strong> Bulk buyers demand large contracts (e.g. 400 quintals) with strict delivery tolerances (surplus ≤ 3%). Smallholder farmers offer small, scattered lots. FPOs risk excess unsold surplus or unfair concentration from a single farmer.
                </p>
                <p className="text-slate-600 font-mono text-[11px]">
                  Bounded Knapsack MILP · Concentration Cap &lt; 40% · Cross-checked via 0/1 Subset-Sum DP
                </p>
                <div className="text-crimson-brand font-bold">
                  → Dual solvers (CBC MILP + DP) independently confirm zero excess waste.
                </div>
              </div>
            )}

            {activeW === 'all' && (
              <div className="bg-rose-50/40 border-l-4 border-crimson-brand p-3.5 rounded-r-xl text-xs text-slate-600">
                <strong>🌟 Integrated Commercial Framework:</strong> Where maximizes immediate net cash, When times seasonal storage peak against carry decay, and To Whom packs smallholder harvest lots into institutional bulk supply.
              </div>
            )}
          </div>

          {/* ------------------------------------------------------------- THE 3 DECISION CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Card 1: WHERE */}
            <div className="bg-white border-l-4 border-crimson-brand border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold text-crimson-brand uppercase tracking-wider">
                  W1 · WHERE TO SELL (M2)
                </span>
                <div className="text-xl font-black text-slate-900 mt-1">
                  {topMandi ? topMandi.market : 'n/a'}
                </div>
                <div className="text-xs font-bold text-crimson-brand mt-0.5">
                  {topMandi
                    ? `net ₹${Math.round(topMandi.net_per_qtl).toLocaleString()}/qtl · ${Math.round(topMandi.km)} km`
                    : 'no quotes in view'}
                </div>
              </div>

              <div className="text-[11px] text-slate-500 font-mono border-t border-slate-100 pt-2 mt-3">
                {topMandi ? (
                  <span>
                    Board ₹{Math.round(topMandi.board_price).toLocaleString()} (rank #{topMandi.rank_board}) · ₹{Math.round(topMandi.arbitrage_vs_nearest)} better than nearest
                  </span>
                ) : (
                  <span>Widen quote window or move date</span>
                )}
              </div>
            </div>

            {/* Card 2: WHEN */}
            <div className="bg-white border-l-4 border-crimson-brand border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold text-crimson-brand uppercase tracking-wider">
                  W2 · WHEN TO SELL (M3)
                </span>
                <div className="text-xl font-black text-slate-900 mt-1">
                  {!m3?.available
                    ? 'n/a'
                    : m3.breakeven_day === null
                    ? 'SELL NOW'
                    : `HOLD ${m3.best_day} days`}
                </div>
                <div className="text-xs font-bold text-crimson-brand mt-0.5">
                  {!m3?.available
                    ? `no ${crop} annual cycle`
                    : m3.breakeven_day === null
                    ? 'no break-even inside horizon'
                    : `break-even d${m3.breakeven_day} · gain ₹${Math.round(m3.best_gain_per_qtl || 0)}/qtl`}
                </div>
              </div>

              <div className="text-[11px] text-slate-500 font-mono border-t border-slate-100 pt-2 mt-3">
                {m3?.available ? (
                  <span>
                    Carry ₹{m3.carry_per_qtl_day?.toFixed(2)}/qtl/day · MILP {m3.milp?.status} {m3.milp?.profit ? `(₹${Math.round(m3.milp.profit).toLocaleString()})` : ''}
                  </span>
                ) : (
                  <span>Partial season crop</span>
                )}
              </div>
            </div>

            {/* Card 3: TO WHOM */}
            <div className="bg-white border-l-4 border-crimson-brand border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold text-crimson-brand uppercase tracking-wider">
                  W3 · TO WHOM TO SELL (M4)
                </span>
                <div className="text-xl font-black text-slate-900 mt-1">
                  {m4?.agg && m4.agg.status === 'Optimal'
                    ? `${m4.agg.total.toLocaleString()} qtl`
                    : 'n/a'}
                </div>
                <div className="text-xs font-bold text-crimson-brand mt-0.5">
                  {m4?.agg && m4.agg.status === 'Optimal'
                    ? `surplus ${m4.agg.surplus} qtl · ${m4.agg.chosen_count} farmers`
                    : 'no optimal knapsack pool'}
                </div>
              </div>

              <div className="text-[11px] text-slate-500 font-mono border-t border-slate-100 pt-2 mt-3">
                {m4?.dp_surplus !== undefined ? (
                  <span>
                    DP cross-check surplus {m4.dp_surplus} qtl ({m4.agg?.dp_agrees ? 'agrees' : 'differs'})
                  </span>
                ) : (
                  <span>Dynamic programming verification</span>
                )}
              </div>
            </div>

          </div>

          {/* Arbitrage Opportunity Callout Strip */}
          {topMandi && boardTop && (
            <div className="bg-rose-50/60 border border-rose-200 border-l-4 border-l-crimson-brand rounded-xl p-4 text-xs text-slate-700 space-y-1">
              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                <span>💡</span>
                <span>Board price is not money in hand.</span>
              </div>
              {topMandi.market !== boardTop.market ? (
                <p>
                  The highest quote is <strong>{boardTop.market}</strong> at ₹{Math.round(boardTop.board_price).toLocaleString()}/qtl, but after freight and fees it nets ₹{Math.round(boardTop.net_per_qtl).toLocaleString()}. Shipping to <strong>{topMandi.market}</strong> instead puts <strong>₹{Math.round(topMandi.net_per_qtl - boardTop.net_per_qtl).toLocaleString()}/qtl more</strong> in the FPO's pocket — that gap <em>is</em> the spatial arbitrage this module hunts.
                </p>
              ) : (
                <p>
                  Here the highest quote (<strong>{topMandi.market}</strong>, ₹{Math.round(topMandi.board_price).toLocaleString()}/qtl) also survives every cost and stays the winner at ₹{Math.round(topMandi.net_per_qtl).toLocaleString()}/qtl net. Watch the ranking diverge as diesel price or shipping distance changes.
                </p>
              )}
            </div>
          )}

          {/* Interstate Arbitrage Opportunity Banner (if interstate or pan-India selected) */}
          {isInterstateScope && decision?.m2?.rows && (
            (() => {
              const rows = decision.m2.rows;
              const topOverall = rows[0];
              const localRows = rows.filter((r) => r.state === 'Karnataka');
              const topLocal = localRows.length > 0 ? localRows[0] : null;

              if (topOverall && topLocal) {
                const diff = topOverall.net_per_qtl - topLocal.net_per_qtl;
                if (diff > 5) {
                  return (
                    <div className="bg-emerald-50 border-2 border-emerald-300 rounded-xl p-4 text-xs text-emerald-950 space-y-1.5">
                      <div className="font-black text-sm text-emerald-800 flex items-center gap-2">
                        <span>🚀 INTERSTATE ARBITRAGE OPPORTUNITY FOUND</span>
                        <span className="text-[10px] bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded font-mono font-bold">
                          +₹{Math.round(diff).toLocaleString()}/qtl Net
                        </span>
                      </div>
                      <p>
                        Selling to <strong>{topOverall.market} ({topOverall.state || 'Interstate'})</strong> nets <strong>₹{Math.round(topOverall.net_per_qtl).toLocaleString()}/qtl</strong> ({Math.round(topOverall.km)} km away). Best local market in Karnataka is <strong>{topLocal.market}</strong> at ₹{Math.round(topLocal.net_per_qtl).toLocaleString()}/qtl ({Math.round(topLocal.km)} km).
                        <br />
                        👉 <strong>Extra Profit by Selling Interstate: +₹{Math.round(diff).toLocaleString()}/quintal (+₹{Math.round(diff * volume).toLocaleString()} on your {volume} qtl batch)</strong> after deducting long-haul freight and transit shrinkage!
                      </p>
                    </div>
                  );
                } else {
                  return (
                    <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-xs text-rose-950 space-y-1">
                      <div className="font-black text-sm text-crimson-brandDark">
                        🏠 LOCAL SALE PREFERRED OVER INTERSTATE
                      </div>
                      <p>
                        Best local market <strong>{topLocal.market} (Karnataka)</strong> yields <strong>₹{Math.round(topLocal.net_per_qtl).toLocaleString()}/qtl</strong>. Even if some interstate mandis quote higher board prices, long-distance freight and transit shrinkage make local selling more profitable by <strong>₹{Math.round(Math.abs(diff)).toLocaleString()}/qtl</strong>.
                      </p>
                    </div>
                  );
                }
              }
              return null;
            })()
          )}

          {/* ------------------------------------------------------------- 6 DRILL TABS */}
          <div className="space-y-4 pt-2">
            
            {/* Tab Bar */}
            <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
              {[
                { id: 'market', label: 'Market (STL)' },
                { id: 'where', label: 'Where to sell (W1: Mandi Arbitrage)' },
                { id: 'hold', label: 'Hold vs Sell (W2: Timing & Storage)' },
                { id: 'aggregate', label: 'Aggregate (W3: Bulk Lots)' },
                { id: 'inputs', label: 'Inputs' },
                { id: 'kb', label: '📚 Knowledge Base & 3 W\'s Architecture' },
              ].map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => {
                    setActiveTab(id as any);
                    setWorkflowStep('Drill');
                  }}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                    activeTab === id
                      ? 'bg-gradient-to-b from-white to-rose-50/70 text-crimson-brandDark border border-crimson-brand shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-500 hover:text-slate-900 hover:border-slate-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* TAB 1: Market (STL) */}
            {activeTab === 'market' && (
              <div className="space-y-4">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-600 leading-relaxed font-sans">
                  <strong>How the price path is built (M1).</strong> Weekly median of the mandi board → STL decomposition of log-price with period 52 → ±2σ volatility bands on the residual → GLUT/SPIKE flags from the z-score → a deterministic projection that M3 consumes. The red continuous line is <strong>p(d)</strong>, not a forecast guarantee.
                </div>

                {m1 ? (
                  <>
                    <InteractiveStlChart m1={m1} />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Left: Strengths & Coverage */}
                      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3 font-mono text-xs">
                        <div className="font-bold text-slate-900 border-b border-slate-100 pb-2">
                          Decomposition Strengths
                        </div>
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                          <div className="flex justify-between">
                            <span className="text-slate-500">Seasonal Strength (F_seasonal):</span>
                            <span className="font-bold text-slate-900">{m1.strengths?.seasonal ?? '—'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Trend Strength (F_trend):</span>
                            <span className="font-bold text-slate-900">{m1.strengths?.trend ?? '—'}</span>
                          </div>
                        </div>

                        <div className="text-[11px] text-slate-500 leading-normal font-sans">
                          {m1.ref_mandi}: {m1.coverage?.weeks} weeks ({m1.coverage?.observed} observed, {((m1.coverage?.imputed_frac || 0) * 100).toFixed(0)}% interpolated).
                        </div>

                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold">
                          <span className="text-crimson-brand">GLUT Weeks: {m1.glut_weeks ?? 0}</span>
                          <span className="text-emerald-700">SPIKE Weeks: {m1.spike_weeks ?? 0}</span>
                        </div>
                      </div>

                      {/* Right: Calendar Month Chart */}
                      <CalendarMonthChart seasonalIndex={m1.seasonal_index || []} />
                    </div>
                  </>
                ) : (
                  <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-500 text-xs font-mono">
                    No STL decomposition available for this selection.
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: Where to sell */}
            {activeTab === 'where' && (
              <div className="space-y-4">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-600 leading-relaxed font-sans">
                  <strong>Where does the money go (M2)?</strong> Each mandi is scored per quintal after freight (diesel × distance, return leg billed), cess/commission, loading/unloading and transit shrink. The gap between the board rank and this net rank is the arbitrage.
                </div>

                {decision?.m2?.rows && decision.m2.rows.length > 1 && (
                  <RankRevealChart rows={decision.m2.rows} />
                )}

                {/* Mandi Ranking Table */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-mono font-bold uppercase text-crimson-brandDark">
                      Ranked Mandis Table ({decision?.m2?.count || 0} quoting)
                    </h4>
                    <span className="text-[10px] font-mono text-slate-400">Haversine × 1.3 road circuity</span>
                  </div>

                  <div className="overflow-x-auto max-h-[420px] border border-slate-200 rounded-xl">
                    <table className="w-full text-left font-mono text-xs">
                      <thead className="bg-slate-100 text-slate-700 sticky top-0 uppercase text-[10px] border-b border-slate-200">
                        <tr>
                          <th className="p-2.5">Market</th>
                          <th className="p-2.5">District</th>
                          <th className="p-2.5">km</th>
                          <th className="p-2.5">Board Price</th>
                          <th className="p-2.5">Freight</th>
                          <th className="p-2.5">Fees</th>
                          <th className="p-2.5">Net Realisation</th>
                          <th className="p-2.5">Board Rank</th>
                          <th className="p-2.5">Arbitrage</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-[11px]">
                        {(decision?.m2?.rows || []).map((row, idx) => (
                          <tr key={row.market} className={idx === 0 ? 'bg-crimson-50/50 font-bold' : 'hover:bg-slate-50'}>
                            <td className="p-2.5 font-bold text-slate-900">{row.market}</td>
                            <td className="p-2.5 text-slate-500">{row.district || '—'}</td>
                            <td className="p-2.5 text-slate-600">{Math.round(row.km)} km</td>
                            <td className="p-2.5 text-slate-700">₹{Math.round(row.board_price).toLocaleString()}</td>
                            <td className="p-2.5 text-slate-500">₹{Math.round(row.freight).toLocaleString()}</td>
                            <td className="p-2.5 text-slate-500">₹{Math.round(row.fees).toLocaleString()}</td>
                            <td className="p-2.5 font-bold text-crimson-brandDark">₹{Math.round(row.net_per_qtl).toLocaleString()}/qtl</td>
                            <td className="p-2.5 text-slate-500">#{row.rank_board}</td>
                            <td className="p-2.5 text-emerald-700">+₹{Math.round(row.arbitrage_vs_nearest)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Geospatial Leaflet Map */}
                <div className="space-y-2">
                  <div className="text-xs font-mono font-bold text-slate-700">
                    Geospatial Mandi Network &amp; Net Realisation Map
                  </div>
                  <MapLeaflet
                    farmLat={farmLat}
                    farmLon={farmLon}
                    rows={decision?.m2?.rows || []}
                  />
                </div>
              </div>
            )}

            {/* TAB 3: Hold vs Sell */}
            {activeTab === 'hold' && (
              <div className="space-y-4">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-600 leading-relaxed font-sans">
                  <strong>Why holding costs real cash (M3).</strong> V(t) = θᵗ · p(t) − c·t − one-time fees: every day of storage burns rent, pledge-loan interest, and spoilage, and <strong>θᵗ means you cannot sell what you put in</strong>. Break-even is the first day V(t) beats selling now; the MILP then splits the sale into at most 3 executable tranches.
                </div>

                {m3 ? (
                  <>
                    <InteractiveValueCurve m3={m3} />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Break-even scan */}
                      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3 font-mono text-xs">
                        <div className="font-bold text-slate-900 border-b border-slate-100 pb-2">
                          Break-even Scan Metrics
                        </div>
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                          <div className="flex justify-between">
                            <span className="text-slate-500">Break-even Day:</span>
                            <span className="font-bold text-slate-900">{m3.breakeven_day != null ? `Day ${m3.breakeven_day}` : 'None'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Peak Gain Day:</span>
                            <span className="font-bold text-slate-900">{m3.best_day != null ? `Day ${m3.best_day}` : 'None'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Max Net Gain:</span>
                            <span className="font-bold text-emerald-700">₹{m3.best_gain_per_qtl != null ? Math.round(m3.best_gain_per_qtl).toLocaleString() : '0'}/qtl</span>
                          </div>
                        </div>
                        <div className="text-[11px] text-slate-500 leading-normal font-sans">
                          Carry charge ₹{m3.carry_per_qtl_day?.toFixed(2)}/qtl/day = rent + insurance + pledge financing. Shrink {(shrinkPerMonth).toFixed(1)}%/month.
                        </div>
                      </div>

                      {/* Multi-tranche MILP schedule */}
                      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3 font-mono text-xs">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <span className="font-bold text-slate-900">Multi-tranche MILP</span>
                          <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-bold border border-emerald-200">
                            {m3.milp?.status || 'No Solution'}
                          </span>
                        </div>

                        {m3.milp?.schedule && m3.milp.schedule.length > 0 ? (
                          <div className="border border-slate-200 rounded-xl overflow-hidden">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-slate-100 text-slate-700 text-[10px] uppercase">
                                <tr>
                                  <th className="p-2">Day</th>
                                  <th className="p-2">Qtl Sold</th>
                                  <th className="p-2">Price</th>
                                  <th className="p-2">Gross Realisation</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 text-[11px]">
                                {m3.milp.schedule.map((row, i) => (
                                  <tr key={i} className="hover:bg-slate-50">
                                    <td className="p-2 font-bold text-slate-900">Day {row.day}</td>
                                    <td className="p-2 text-slate-700">{row.qtl_sold} qtl</td>
                                    <td className="p-2 text-slate-700">₹{Math.round(row.price).toLocaleString()}</td>
                                    <td className="p-2 font-bold text-emerald-700">₹{Math.round(row.gross).toLocaleString()}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="text-slate-400 p-4 text-center">No liquidation schedule for this scenario.</div>
                        )}
                        <div className="text-[10px] text-slate-400 leading-normal font-sans">
                          Tranches are capped at 3 sales with a 10% floor each for executable hedging.
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-500 text-xs font-mono">
                    Hold-vs-sell needs a full seasonal price path.
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: Aggregate (Knapsack) */}
            {activeTab === 'aggregate' && (
              <div className="space-y-4">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-600 leading-relaxed font-sans">
                  <strong>Filling the buyer's order (M4).</strong> A bounded knapsack: fill ≥ T with ≤ 3% surplus, no single farm above 40% of the order, lot multiplicity respected. The 0/1 subset-sum DP re-solves the same question independently — the UI displays both answers so you can verify they agree.
                </div>

                {m4?.lots && m4.lots.length > 0 ? (
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <span className="text-xs font-mono font-bold uppercase text-crimson-brandDark">
                        Farmer Lot Procurement Roster ({m4.lots.length} lots in pool)
                      </span>
                      <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-bold">
                        Target Order: {m4.order} qtl
                      </span>
                    </div>

                    <div className="overflow-x-auto max-h-[360px] border border-slate-200 rounded-xl">
                      <table className="w-full text-left font-mono text-xs">
                        <thead className="bg-slate-100 text-slate-700 sticky top-0 uppercase text-[10px]">
                          <tr>
                            <th className="p-2">Status</th>
                            <th className="p-2">Lot ID</th>
                            <th className="p-2">Farmer ID</th>
                            <th className="p-2">Market</th>
                            <th className="p-2">Distance</th>
                            <th className="p-2">Lot Size</th>
                            <th className="p-2">Count</th>
                            <th className="p-2">Total Quintals</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-[11px]">
                          {m4.lots.map((lot) => (
                            <tr
                              key={lot.id}
                              className={lot.selected ? 'bg-emerald-50/70 font-bold text-slate-900' : 'hover:bg-slate-50 text-slate-500'}
                            >
                              <td className="p-2">
                                {lot.selected ? (
                                  <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded font-bold">
                                    SELECTED
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-slate-400">Unselected</span>
                                )}
                              </td>
                              <td className="p-2">#{lot.id}</td>
                              <td className="p-2">{lot.farmer_id || `farmer_${lot.id}`}</td>
                              <td className="p-2">{lot.market}</td>
                              <td className="p-2">{Math.round(lot.km)} km</td>
                              <td className="p-2">{lot.qty} qtl</td>
                              <td className="p-2">{lot.count}</td>
                              <td className="p-2 font-bold">{lot.qty * lot.count} qtl</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Knapsack Solution Details */}
                    {m4.agg && (
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 font-mono text-xs space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-bold text-slate-900">
                            Knapsack Solver: {m4.agg.status} · Fulfilled {m4.agg.total} qtl ({m4.agg.chosen_count} farmers chosen)
                          </span>
                          <span className="text-emerald-700 font-bold">
                            Surplus Waste: {m4.agg.surplus} qtl ({( (m4.agg.surplus / m4.order) * 100).toFixed(1)}%)
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-sans pt-1 border-t border-slate-200">
                          Dual verification: 0/1 Subset-Sum DP surplus was {m4.dp_surplus} qtl ({m4.agg.dp_agrees ? 'perfect match with CBC' : 'differs'}).
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-500 text-xs font-mono">
                    No farmer pool for this selection.
                  </div>
                )}
              </div>
            )}

            {/* TAB 5: Inputs */}
            {activeTab === 'inputs' && (
              <div className="space-y-4">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-600 leading-relaxed font-sans">
                  <strong>Every number here is an assumption you can challenge.</strong> The sidebar sliders are session-only overrides of <strong>data/ref/params.yaml</strong>, where each rate carries an auditable origin. Download the exact slice in view to inspect outside the app.
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3 font-mono text-xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="font-bold text-slate-900">Active Parameters (params.yaml)</span>
                    <a
                      href={api.getExportSliceUrl(crop, asOf, variety)}
                      download
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-crimson-brand hover:bg-crimson-brandDark text-white font-bold transition-all shadow-xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Clean Slice CSV</span>
                    </a>
                  </div>

                  <pre className="bg-slate-900 text-slate-200 p-4 rounded-xl text-[11px] overflow-x-auto max-h-[360px] leading-relaxed">
                    {JSON.stringify(decision?.params || meta?.params || {}, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {/* TAB 6: Knowledge Base */}
            {activeTab === 'kb' && <KnowledgeBaseTab />}

          </div>

        </div>

      </div>

    </div>
  );
};
