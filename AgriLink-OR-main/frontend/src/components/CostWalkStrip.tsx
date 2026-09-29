import React from 'react';
import { Minus, Equal, Info } from 'lucide-react';
import { WORKED_EXAMPLE } from '../data/siteData';

interface CostWalkStripProps {
  interactive?: boolean;
}

export const CostWalkStrip: React.FC<CostWalkStripProps> = ({ interactive = true }) => {
  return (
    <div className="w-full bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-crimson-brand animate-pulse"></span>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Real In-Hand Realisation Cost Walk (NIHR)
          </span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-crimson-50 text-crimson-brand border border-crimson-roseBorder">
            Onion @ Channarayapatna (211 km)
          </span>
        </div>
        <div className="text-xs text-slate-400 font-mono flex items-center gap-1">
          <Info className="w-3.5 h-3.5 text-slate-400" />
          <span>Batch: 200 quintals (2 trucks)</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        
        {/* Step 1: Board Price */}
        <div className="flex-1 min-w-[140px] bg-slate-50 border border-slate-200/80 rounded-xl p-3 sm:p-4 transition-all hover:border-slate-300">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Board Price</div>
          <div className="text-xl sm:text-2xl font-black font-mono text-slate-900 mt-1">
            ₹{WORKED_EXAMPLE.boardPrice.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Mandi posted quote</div>
        </div>

        {/* Operator Minus */}
        <div className="text-crimson-brand font-black text-lg sm:text-xl flex items-center justify-center w-7 h-7 rounded-full bg-crimson-50 border border-crimson-roseBorder">
          <Minus className="w-4 h-4 stroke-[3]" />
        </div>

        {/* Step 2: Transit Shrinkage */}
        <div className="flex-1 min-w-[140px] bg-crimson-50/50 border border-crimson-roseBorder/60 rounded-xl p-3 sm:p-4 transition-all hover:border-crimson-roseBorder">
          <div className="text-[11px] font-bold uppercase tracking-wider text-crimson-brand">Transit Loss</div>
          <div className="text-xl sm:text-2xl font-black font-mono text-crimson-brand mt-1">
            ₹{WORKED_EXAMPLE.transitLoss}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">0.005%/km × 211 km</div>
        </div>

        {/* Operator Minus */}
        <div className="text-crimson-brand font-black text-lg sm:text-xl flex items-center justify-center w-7 h-7 rounded-full bg-crimson-50 border border-crimson-roseBorder">
          <Minus className="w-4 h-4 stroke-[3]" />
        </div>

        {/* Step 3: Freight */}
        <div className="flex-1 min-w-[140px] bg-crimson-50/50 border border-crimson-roseBorder/60 rounded-xl p-3 sm:p-4 transition-all hover:border-crimson-roseBorder">
          <div className="text-[11px] font-bold uppercase tracking-wider text-crimson-brand">Freight</div>
          <div className="text-xl sm:text-2xl font-black font-mono text-crimson-brand mt-1">
            ₹{WORKED_EXAMPLE.freightPerQtl}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Round trip diesel billed</div>
        </div>

        {/* Operator Minus */}
        <div className="text-crimson-brand font-black text-lg sm:text-xl flex items-center justify-center w-7 h-7 rounded-full bg-crimson-50 border border-crimson-roseBorder">
          <Minus className="w-4 h-4 stroke-[3]" />
        </div>

        {/* Step 4: Cess + Handling */}
        <div className="flex-1 min-w-[140px] bg-crimson-50/50 border border-crimson-roseBorder/60 rounded-xl p-3 sm:p-4 transition-all hover:border-crimson-roseBorder">
          <div className="text-[11px] font-bold uppercase tracking-wider text-crimson-brand">Cess + Handling</div>
          <div className="text-xl sm:text-2xl font-black font-mono text-crimson-brand mt-1">
            ₹{WORKED_EXAMPLE.cessAndHandling}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">APMC fee (1.5%) + labor</div>
        </div>

        {/* Operator Equals */}
        <div className="text-white font-black text-lg sm:text-xl flex items-center justify-center w-7 h-7 rounded-full bg-crimson-brand shadow-sm">
          <Equal className="w-4 h-4 stroke-[3]" />
        </div>

        {/* Step 5: NET IN HAND */}
        <div className="flex-1 min-w-[170px] bg-gradient-to-br from-crimson-brand to-crimson-700 text-white rounded-xl p-3 sm:p-4 shadow-md shadow-crimson-200">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-crimson-100 flex items-center justify-between">
            <span>NET IN HAND</span>
            <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded font-mono">Bankable</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-white mt-1">
            ₹{WORKED_EXAMPLE.netInHand.toLocaleString()}
            <span className="text-xs font-semibold opacity-90 text-crimson-100 ml-1">/qtl</span>
          </div>
          <div className="text-[11px] text-crimson-100 mt-0.5 font-medium">
            Cash deposited to FPO
          </div>
        </div>

      </div>

      {interactive && (
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-700">Formula:</span>
            <code className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded font-mono text-[11px]">
              Net = [Board × (1 - shrink)] - Freight - Cess - Handling
            </code>
          </div>
          <div className="text-crimson-brand font-semibold flex items-center gap-1">
            <span>Arbitrage Gap: +₹184/qtl vs nearest Davangere APMC</span>
          </div>
        </div>
      )}
    </div>
  );
};
