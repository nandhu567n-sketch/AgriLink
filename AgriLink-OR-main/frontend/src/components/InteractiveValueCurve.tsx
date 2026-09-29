import React, { useState } from 'react';
import type { M3Response } from '../api/types';

interface InteractiveValueCurveProps {
  m3: M3Response;
}

export const InteractiveValueCurve: React.FC<InteractiveValueCurveProps> = ({ m3 }) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const curve = m3.curve || [];
  if (!m3.available || curve.length === 0) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center text-slate-500 text-xs font-mono">
        Hold-vs-sell requires a 2-year seasonal price path, not estimable for this selection.
      </div>
    );
  }

  const v0 = curve[0]?.v ?? 0;
  const breakevenDay = m3.breakeven_day;
  const bestDay = m3.best_day;

  const allV = curve.map((c) => c.v);
  const minV = Math.floor(Math.min(...allV, v0) * 0.95);
  const maxV = Math.ceil(Math.max(...allV, v0) * 1.05);
  const rangeV = Math.max(1, maxV - minV);

  const maxT = curve[curve.length - 1]?.t || 180;

  const svgWidth = 840;
  const svgHeight = 360;
  const margin = { top: 30, right: 30, bottom: 45, left: 65 };
  const innerWidth = svgWidth - margin.left - margin.right;
  const innerHeight = svgHeight - margin.top - margin.bottom;

  const getX = (t: number) => margin.left + (t / maxT) * innerWidth;
  const getY = (v: number) => margin.top + innerHeight - ((v - minV) / rangeV) * innerHeight;

  // Build polygon points for area fill
  const curvePoints: string[] = [];
  curve.forEach((pt) => {
    curvePoints.push(`${getX(pt.t)},${getY(pt.v)}`);
  });

  const areaPoints = [
    ...curvePoints,
    `${getX(maxT)},${getY(minV)}`,
    `${getX(0)},${getY(minV)}`,
  ];

  // Y-axis grid ticks
  const yTicks = [minV, Math.round(minV + rangeV * 0.33), Math.round(minV + rangeV * 0.66), maxV];

  const hoveredPoint = hoverIndex !== null ? curve[hoverIndex] : null;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-crimson-brand bg-crimson-50 px-2 py-0.5 rounded border border-crimson-200">
              M3 · STORAGE VALUATION CURVE V(t)
            </span>
            <span className="text-xs text-slate-500 font-medium">
              Continuous Physical Decay θᵗ · Daily Carrying Charge c·t
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            V(t) = θᵗ · p(t) − c·t − Entry Fees. Holding only creates value if V(t) &gt; V(0).
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono font-semibold">
          <span className="text-slate-600">Sell now: ₹{Math.round(v0).toLocaleString()}/qtl</span>
          {bestDay !== null && (
            <span className="text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
              Peak: Day {bestDay} (+₹{Math.round(m3.best_gain_per_qtl || 0)}/qtl)
            </span>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-600 px-2">
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-1 bg-crimson-brand inline-block rounded-xs"></span>
          <span>V(t) Net Realisation</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-0.5 bg-slate-400 border-t border-dotted inline-block"></span>
          <span>Sell Today Line V(0)</span>
        </div>
        {breakevenDay !== null && (
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-0.5 bg-crimson-500 border-t border-dashed inline-block"></span>
            <span>Break-even Day {breakevenDay}</span>
          </div>
        )}
        {bestDay !== null && (
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-0.5 bg-emerald-600 border-t border-dashed inline-block"></span>
            <span>Peak Day {bestDay}</span>
          </div>
        )}
      </div>

      {/* SVG Curve */}
      <div className="relative overflow-x-auto">
        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto max-h-[380px] select-none">
          {/* Y-axis gridlines */}
          {yTicks.map((tick) => {
            const y = getY(tick);
            return (
              <g key={tick}>
                <line x1={margin.left} y1={y} x2={svgWidth - margin.right} y2={y} stroke="#F1F5F9" strokeWidth="1" />
                <text
                  x={margin.left - 8}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="10"
                  fill="#94A3B8"
                  fontFamily="ui-monospace, monospace"
                >
                  ₹{tick.toLocaleString()}
                </text>
              </g>
            );
          })}

          {/* Dotted "Sell Now" Baseline V(0) */}
          <line
            x1={margin.left}
            y1={getY(v0)}
            x2={svgWidth - margin.right}
            y2={getY(v0)}
            stroke="#94A3B8"
            strokeWidth="1.5"
            strokeDasharray="3 3"
          />
          <text
            x={svgWidth - margin.right - 5}
            y={getY(v0) - 6}
            textAnchor="end"
            fontSize="10"
            fill="#64748B"
            fontWeight="bold"
            fontFamily="ui-monospace, monospace"
          >
            Sell Now: ₹{Math.round(v0).toLocaleString()}
          </text>

          {/* Area under curve */}
          <polygon
            points={areaPoints.join(' ')}
            fill="rgba(215, 38, 61, 0.07)"
          />

          {/* V(t) curve line */}
          <polyline
            points={curvePoints.join(' ')}
            fill="none"
            stroke="#D7263D"
            strokeWidth="2.5"
          />

          {/* Break-even Vertical Line */}
          {breakevenDay !== null && (
            <g>
              <line
                x1={getX(breakevenDay)}
                y1={margin.top}
                x2={getX(breakevenDay)}
                y2={svgHeight - margin.bottom}
                stroke="#D7263D"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />
              <text
                x={getX(breakevenDay) + 4}
                y={margin.top + 16}
                fontSize="10"
                fill="#D7263D"
                fontWeight="bold"
                fontFamily="ui-monospace, monospace"
              >
                Break-even (d{breakevenDay})
              </text>
            </g>
          )}

          {/* Peak Vertical Line */}
          {bestDay !== null && (
            <g>
              <line
                x1={getX(bestDay)}
                y1={margin.top}
                x2={getX(bestDay)}
                y2={svgHeight - margin.bottom}
                stroke="#16A34A"
                strokeWidth="2"
                strokeDasharray="6 3"
              />
              <text
                x={getX(bestDay) + 4}
                y={margin.top + 32}
                fontSize="10"
                fill="#15803D"
                fontWeight="bold"
                fontFamily="ui-monospace, monospace"
              >
                Peak Value (d{bestDay})
              </text>
            </g>
          )}

          {/* Interactive hover lines */}
          {curve.map((pt, i) => (
            <rect
              key={`h-${pt.t}`}
              x={getX(pt.t) - 3}
              y={margin.top}
              width={6}
              height={innerHeight}
              fill="transparent"
              onMouseEnter={() => setHoverIndex(i)}
              onMouseLeave={() => setHoverIndex(null)}
              className="cursor-crosshair"
            />
          ))}

          {/* Active hover cursor indicator */}
          {hoveredPoint && (
            <g>
              <line
                x1={getX(hoveredPoint.t)}
                y1={margin.top}
                x2={getX(hoveredPoint.t)}
                y2={svgHeight - margin.bottom}
                stroke="#475569"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
              <circle
                cx={getX(hoveredPoint.t)}
                cy={getY(hoveredPoint.v)}
                r="5"
                fill="#D7263D"
                stroke="#ffffff"
                strokeWidth="2"
              />
            </g>
          )}
        </svg>

        {/* Hover Tooltip */}
        {hoveredPoint && (
          <div className="absolute top-4 right-20 bg-slate-900/90 backdrop-blur-xs text-white p-3 rounded-xl text-xs font-mono shadow-xl border border-slate-700 pointer-events-none">
            <div className="text-slate-400 font-semibold">Day {hoveredPoint.t} from today</div>
            <div className="text-white font-bold text-sm mt-0.5">
              V({hoveredPoint.t}) = ₹{Math.round(hoveredPoint.v).toLocaleString()}/qtl
            </div>
            <div className={`mt-1 font-bold ${hoveredPoint.v >= v0 ? 'text-emerald-400' : 'text-crimson-400'}`}>
              Gain vs Sell Now: {hoveredPoint.v >= v0 ? '+' : ''}₹{Math.round(hoveredPoint.v - v0).toLocaleString()}/qtl
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 border-t border-slate-100 pt-2">
        <span>Day 0 (Sell Today)</span>
        <span>Horizon: {maxT} days</span>
      </div>
    </div>
  );
};
