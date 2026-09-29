import React, { useState } from 'react';
import { Calendar, Flame, Snowflake, Info } from 'lucide-react';
import { SEASONAL_MONTHS } from '../data/siteData';

export const ChartSeasonalIndex: React.FC = () => {
  const [activeMonth, setActiveMonth] = useState<number | null>(11); // Default to Nov (Peak)

  const maxVal = 1.8;
  const svgHeight = 220;
  const svgWidth = 720;
  const padL = 35;
  const padR = 20;
  const padT = 20;
  const padB = 40;

  const chartW = svgWidth - padL - padR;
  const chartH = svgHeight - padT - padB;

  const getY = (val: number) => {
    return padT + chartH - (val / maxVal) * chartH;
  };

  const baselineY = getY(1.0);
  const barWidth = (chartW / SEASONAL_MONTHS.length) * 0.7;
  const barGap = chartW / SEASONAL_MONTHS.length;

  return (
    <div className="w-full bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-crimson-brand" />
          <h4 className="text-sm font-extrabold text-slate-900">
            Seasonal Index by Calendar Month & Dates (1.0 = Baseline)
          </h4>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1 text-crimson-brand font-bold">
            <Flame className="w-3.5 h-3.5 text-crimson-brand" /> Peak: Nov (01–30 Nov) 1.56 (+56%)
          </span>
          <span className="flex items-center gap-1 text-slate-500">
            <Snowflake className="w-3.5 h-3.5 text-slate-400" /> Trough: May (01–31 May) 0.62 (−38%)
          </span>
        </div>
      </div>

      <div className="w-full overflow-x-auto">
        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto min-w-[620px] font-mono text-[10px]">
          
          {/* Baseline 1.0 Line */}
          <line
            x1={padL}
            y1={baselineY}
            x2={svgWidth - padR}
            y2={baselineY}
            stroke="#94A3B8"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />
          <text x={padL + 6} y={baselineY - 4} fill="#64748B" className="font-bold text-[9px]">
            1.0 Baseline
          </text>

          {/* Grid lines */}
          {[0.5, 1.5].map((val) => (
            <line
              key={val}
              x1={padL}
              y1={getY(val)}
              x2={svgWidth - padR}
              y2={getY(val)}
              stroke="#F1F5F9"
              strokeWidth="1"
            />
          ))}

          {/* Bars */}
          {SEASONAL_MONTHS.map((m, idx) => {
            const x = padL + idx * barGap + (barGap - barWidth) / 2;
            const y = getY(m.index);
            const h = padT + chartH - y;
            const isAbove = m.index >= 1.0;
            const isSelected = activeMonth === m.monthNum;

            let barColor = isAbove ? "#DC2626" : "#FDA4AF";
            if (isSelected) {
              barColor = isAbove ? "#991B1B" : "#F43F5E";
            }

            return (
              <g
                key={m.month}
                className="cursor-pointer group"
                onClick={() => setActiveMonth(m.monthNum)}
              >
                {/* Bar rectangle */}
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={h}
                  rx="3"
                  fill={barColor}
                  className="transition-all hover:opacity-85"
                />

                {/* Index value above bar */}
                <text
                  x={x + barWidth / 2}
                  y={y - 5}
                  textAnchor="middle"
                  fill={isAbove ? "#991B1B" : "#64748B"}
                  className="font-bold text-[9px]"
                >
                  {m.index.toFixed(2)}
                </text>

                {/* Month label */}
                <text
                  x={x + barWidth / 2}
                  y={padT + chartH + 14}
                  textAnchor="middle"
                  fill={isSelected ? "#0F172A" : "#64748B"}
                  className={`text-[10px] ${isSelected ? 'font-black underline' : 'font-medium'}`}
                >
                  {m.month}
                </text>

                {/* Date snippet below month */}
                <text
                  x={x + barWidth / 2}
                  y={padT + chartH + 26}
                  textAnchor="middle"
                  fill="#94A3B8"
                  className="text-[8px]"
                >
                  {m.dates.split('–')[0].trim()}
                </text>
              </g>
            );
          })}

        </svg>
      </div>

      {/* Selected Month Detail Strip */}
      {activeMonth && (
        <div className="mt-3 bg-crimson-50/60 border border-crimson-roseBorder/60 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          {(() => {
            const item = SEASONAL_MONTHS.find(m => m.monthNum === activeMonth)!;
            return (
              <>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-slate-900">{item.month} Window:</span>
                  <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-700">
                    {item.dates}
                  </span>
                  <span className="font-mono font-bold text-crimson-brand">
                    Index: {item.index.toFixed(2)} ({item.variancePct > 0 ? `+${item.variancePct}%` : `${item.variancePct}%`} vs base)
                  </span>
                </div>
                <div className="text-slate-600 font-medium">
                  {item.variancePct >= 20 ? (
                    <span className="text-crimson-brand font-bold">🔥 High-Price Peak Season: Optimal window to liquidate stored crops.</span>
                  ) : item.variancePct <= -20 ? (
                    <span className="text-slate-700 font-bold">❄️ Harvest Inflow Trough: Low price window. Store produce to avoid distress sales.</span>
                  ) : (
                    <span>Balanced seasonal transition period.</span>
                  )}
                </div>
              </>
            );
          })()}
        </div>
      )}

      <div className="mt-2 text-[11px] text-slate-400 font-mono text-right flex items-center justify-end gap-1">
        <Info className="w-3 h-3 text-slate-400" />
        <span>Derived from 104+ weekly LOESS observations across 2 annual agricultural cycles</span>
      </div>
    </div>
  );
};
