import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';
import type { M2Row } from '../api/types';

interface RankRevealChartProps {
  rows: M2Row[];
}

export const RankRevealChart: React.FC<RankRevealChartProps> = ({ rows }) => {
  const sorted = [...rows].sort((a, b) => b.net_per_qtl - a.net_per_qtl);
  const [revealedCount, setRevealedCount] = useState<number>(sorted.length);
  const [isRevealing, setIsRevealing] = useState<boolean>(false);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (isRevealing) {
      timerRef.current = setInterval(() => {
        setRevealedCount((prev) => {
          if (prev >= sorted.length) {
            setIsRevealing(false);
            return sorted.length;
          }
          return prev + 1;
        });
      }, 120);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRevealing, sorted.length]);

  if (sorted.length === 0) return null;

  const maxNet = Math.max(...sorted.map((r) => r.net_per_qtl), 1);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <h4 className="text-xs font-mono font-bold text-crimson-brand uppercase">
            M2 · Net Realisation Rank Reveal
          </h4>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Net cash in hand per quintal after freight, transit loss, handling, and APMC cess.
          </p>
        </div>

        {/* Animation buttons */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <button
            onClick={() => {
              if (revealedCount >= sorted.length) {
                setRevealedCount(1);
              }
              setIsRevealing(!isRevealing);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-crimson-brand hover:bg-crimson-brandDark text-white font-bold transition-all shadow-sm"
          >
            {isRevealing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isRevealing ? 'Pause' : '▶ Rank reveal'}</span>
          </button>
          <button
            onClick={() => {
              setIsRevealing(false);
              setRevealedCount(sorted.length);
            }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors font-medium"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Show all</span>
          </button>
        </div>
      </div>

      {/* Horizontal Bar Stack */}
      <div className="space-y-2 max-h-[380px] overflow-y-auto pr-2">
        {sorted.slice(0, 15).map((row, idx) => {
          const isRevealed = idx < revealedCount;
          const pct = Math.max(8, (row.net_per_qtl / maxNet) * 100);
          const isTop = idx === 0;

          return (
            <div key={row.market} className="text-xs font-mono">
              <div className="flex items-center justify-between text-slate-700 mb-1">
                <span className="font-bold truncate max-w-[200px]">
                  #{idx + 1} {row.market} {row.district ? `(${row.district})` : ''}
                </span>
                <span className={`font-bold ${isRevealed ? (isTop ? 'text-crimson-brand text-sm' : 'text-slate-900') : 'text-slate-400'}`}>
                  ₹{Math.round(row.net_per_qtl).toLocaleString()}/qtl
                </span>
              </div>

              <div className="w-full bg-slate-100 rounded-full h-3.5 overflow-hidden flex items-center">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    isRevealed
                      ? isTop
                        ? 'bg-gradient-to-r from-crimson-brand to-rose-500 shadow-sm'
                        : 'bg-crimson-600/80'
                      : 'bg-rose-200'
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-400 mt-0.5">
                <span>Board: ₹{Math.round(row.board_price).toLocaleString()} (Rank #{row.rank_board})</span>
                <span>{Math.round(row.km)} km away</span>
              </div>
            </div>
          );
        })}
      </div>
      {sorted.length > 15 && (
        <div className="text-[11px] text-slate-400 font-mono text-center pt-2 border-t border-slate-100">
          Showing top 15 of {sorted.length} quoting mandis. See complete list in data table below.
        </div>
      )}
    </div>
  );
};
