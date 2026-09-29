import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';
import type { M1Response } from '../api/types';

interface InteractiveStlChartProps {
  m1: M1Response;
}

export const InteractiveStlChart: React.FC<InteractiveStlChartProps> = ({ m1 }) => {
  const [playHead, setPlayHead] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [hoverIndex, setHoverIndex] = useState<{ type: 'series' | 'path'; index: number } | null>(null);
  const timerRef = useRef<any>(null);

  const series = m1.series || [];
  const path = m1.path || [];

  // Animation controller
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setPlayHead((prev) => {
          if (prev === null) return 0;
          if (prev >= path.length - 1) {
            setIsPlaying(false);
            return path.length - 1;
          }
          return prev + 1;
        });
      }, 70);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, path.length]);

  if (series.length === 0 && path.length === 0) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center text-slate-500 text-xs font-mono">
        No time-series decomposition data available for this selection.
      </div>
    );
  }

  // Calculate scales
  const allY = [
    ...series.flatMap((s) => [s.price, s.upper, s.lower]),
    ...path.map((p) => p.p),
  ].filter((v) => v != null && !isNaN(v));

  const minY = Math.max(0, Math.floor(Math.min(...allY) * 0.9));
  const maxY = Math.ceil(Math.max(...allY) * 1.1) || 1000;
  const rangeY = Math.max(1, maxY - minY);

  // Total points along X axis
  const totalPoints = series.length + path.length;
  const svgWidth = 840;
  const svgHeight = 400;
  const margin = { top: 30, right: 30, bottom: 45, left: 60 };
  const innerWidth = svgWidth - margin.left - margin.right;
  const innerHeight = svgHeight - margin.top - margin.bottom;

  const getX = (idx: number) => margin.left + (idx / Math.max(1, totalPoints - 1)) * innerWidth;
  const getY = (val: number) => margin.top + innerHeight - ((val - minY) / rangeY) * innerHeight;

  // Build SVG Paths
  const upperLowerPoints: string[] = [];
  const pricePoints: string[] = [];
  const trendPoints: string[] = [];
  const trendSeasonalPoints: string[] = [];

  series.forEach((pt, i) => {
    const x = getX(i);
    const yPrice = getY(pt.price);
    const yTrend = getY(pt.trend);
    const yTrendSeasonal = getY(pt.trend_seasonal);
    pricePoints.push(`${x},${yPrice}`);
    trendPoints.push(`${x},${yTrend}`);
    trendSeasonalPoints.push(`${x},${yTrendSeasonal}`);
  });

  // Band area: upper forward, lower backward
  for (let i = 0; i < series.length; i++) {
    upperLowerPoints.push(`${getX(i)},${getY(series[i].upper)}`);
  }
  for (let i = series.length - 1; i >= 0; i--) {
    upperLowerPoints.push(`${getX(i)},${getY(series[i].lower)}`);
  }

  // Projected path points
  const activePathLength = playHead !== null ? playHead + 1 : path.length;
  const pathPoints: string[] = [];
  for (let j = 0; j < activePathLength; j++) {
    const idx = series.length + j;
    pathPoints.push(`${getX(idx)},${getY(path[j].p)}`);
  }

  // Projected area to zero line
  const pathAreaPoints = [...pathPoints];
  if (pathPoints.length > 0) {
    const lastIdx = series.length + activePathLength - 1;
    pathAreaPoints.push(`${getX(lastIdx)},${getY(minY)}`);
    pathAreaPoints.push(`${getX(series.length)},${getY(minY)}`);
  }

  // Y-axis grid ticks
  const yTicks = [minY, Math.round(minY + rangeY * 0.25), Math.round(minY + rangeY * 0.5), Math.round(minY + rangeY * 0.75), maxY];

  // Active hover info
  let hoverDetails: { date: string; label: string; value: number; flag?: string } | null = null;
  if (hoverIndex) {
    if (hoverIndex.type === 'series' && series[hoverIndex.index]) {
      const s = series[hoverIndex.index];
      hoverDetails = {
        date: s.date,
        label: `Historical: ₹${Math.round(s.price).toLocaleString()}/qtl`,
        value: s.price,
        flag: s.flag,
      };
    } else if (hoverIndex.type === 'path' && path[hoverIndex.index]) {
      const p = path[hoverIndex.index];
      hoverDetails = {
        date: p.date,
        label: `Projected p(d): ₹${Math.round(p.p).toLocaleString()}/qtl`,
        value: p.p,
      };
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-crimson-brand bg-crimson-50 px-2 py-0.5 rounded border border-crimson-200">
              M1 · STL DECOMPOSITION
            </span>
            <span className="text-xs text-slate-500 font-medium">
              52-Week Periodicity · ±2σ LOESS Residual Bands
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Red continuous path is deterministic projection <strong>p(d)</strong> fed into M3 hold-vs-sell.
          </p>
        </div>

        {/* Animation Play/Pause buttons */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <button
            onClick={() => {
              if (playHead === null || playHead >= path.length - 1) {
                setPlayHead(0);
              }
              setIsPlaying(!isPlaying);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-crimson-brand hover:bg-crimson-brandDark text-white font-bold transition-all shadow-sm"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isPlaying ? 'Pause' : 'Play projection'}</span>
          </button>
          <button
            onClick={() => {
              setIsPlaying(false);
              setPlayHead(null);
            }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors font-medium"
            title="Reset to full horizon"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Show all</span>
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-600 px-2">
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-0.5 bg-slate-900 inline-block"></span>
          <span>Price history</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-0.5 bg-slate-400 border-t border-dashed inline-block"></span>
          <span>Trend</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-2 bg-crimson-100 border border-crimson-200 inline-block rounded-xs"></span>
          <span>±2σ Bands</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-crimson-brand font-black text-sm">✕</span>
          <span>GLUT weeks</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-emerald-600 font-black text-sm">✕</span>
          <span>SPIKE weeks</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-1 bg-crimson-brand inline-block rounded-sm"></span>
          <span>Projected p(d)</span>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative overflow-x-auto">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto max-h-[440px] select-none"
        >
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

          {/* Division Line between History and Projection */}
          {series.length > 0 && (
            <line
              x1={getX(series.length - 1)}
              y1={margin.top}
              x2={getX(series.length - 1)}
              y2={svgHeight - margin.bottom}
              stroke="#CBD5E1"
              strokeDasharray="4 4"
              strokeWidth="1.5"
            />
          )}

          {/* ±2σ Band Polygon */}
          {upperLowerPoints.length > 0 && (
            <polygon
              points={upperLowerPoints.join(' ')}
              fill="rgba(215, 38, 61, 0.08)"
              stroke="rgba(215, 38, 61, 0.25)"
              strokeWidth="1"
            />
          )}

          {/* Trend line */}
          {trendPoints.length > 0 && (
            <polyline
              points={trendPoints.join(' ')}
              fill="none"
              stroke="#94A3B8"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />
          )}

          {/* Price history line */}
          {pricePoints.length > 0 && (
            <polyline
              points={pricePoints.join(' ')}
              fill="none"
              stroke="#0F172A"
              strokeWidth="2"
            />
          )}

          {/* GLUT / SPIKE Markers */}
          {series.map((pt, i) => {
            if (pt.flag === 'GLUT') {
              const x = getX(i);
              const y = getY(pt.price);
              return (
                <g key={`flag-${i}`}>
                  <line x1={x - 4} y1={y - 4} x2={x + 4} y2={y + 4} stroke="#D7263D" strokeWidth="2.5" />
                  <line x1={x - 4} y1={y + 4} x2={x + 4} y2={y - 4} stroke="#D7263D" strokeWidth="2.5" />
                </g>
              );
            }
            if (pt.flag === 'SPIKE') {
              const x = getX(i);
              const y = getY(pt.price);
              return (
                <g key={`flag-${i}`}>
                  <line x1={x - 4} y1={y - 4} x2={x + 4} y2={y + 4} stroke="#16A34A" strokeWidth="2.5" />
                  <line x1={x - 4} y1={y + 4} x2={x + 4} y2={y - 4} stroke="#16A34A" strokeWidth="2.5" />
                </g>
              );
            }
            return null;
          })}

          {/* Projected p(d) area */}
          {pathAreaPoints.length > 0 && (
            <polygon
              points={pathAreaPoints.join(' ')}
              fill="rgba(215, 38, 61, 0.08)"
            />
          )}

          {/* Projected p(d) line */}
          {pathPoints.length > 0 && (
            <polyline
              points={pathPoints.join(' ')}
              fill="none"
              stroke="#D7263D"
              strokeWidth="2.5"
            />
          )}

          {/* Animated Playhead Marker */}
          {playHead !== null && path[playHead] && (
            <g>
              <line
                x1={getX(series.length + playHead)}
                y1={margin.top}
                x2={getX(series.length + playHead)}
                y2={svgHeight - margin.bottom}
                stroke="#D7263D"
                strokeDasharray="2 2"
                strokeWidth="1.5"
              />
              <circle
                cx={getX(series.length + playHead)}
                cy={getY(path[playHead].p)}
                r="6"
                fill="#ffffff"
                stroke="#D7263D"
                strokeWidth="3"
              />
            </g>
          )}

          {/* Interactive invisible hover triggers */}
          {series.map((_, i) => (
            <rect
              key={`h-series-${i}`}
              x={getX(i) - 5}
              y={margin.top}
              width={10}
              height={innerHeight}
              fill="transparent"
              onMouseEnter={() => setHoverIndex({ type: 'series', index: i })}
              onMouseLeave={() => setHoverIndex(null)}
              className="cursor-crosshair"
            />
          ))}

          {path.map((_, j) => (
            <rect
              key={`h-path-${j}`}
              x={getX(series.length + j) - 5}
              y={margin.top}
              width={10}
              height={innerHeight}
              fill="transparent"
              onMouseEnter={() => setHoverIndex({ type: 'path', index: j })}
              onMouseLeave={() => setHoverIndex(null)}
              className="cursor-crosshair"
            />
          ))}
        </svg>

        {/* Floating Tooltip Card */}
        {hoverDetails && (
          <div className="absolute top-4 left-20 bg-slate-900/90 backdrop-blur-xs text-white p-3 rounded-xl text-xs font-mono shadow-xl border border-slate-700 pointer-events-none">
            <div className="text-slate-400 font-semibold">{hoverDetails.date}</div>
            <div className="text-white font-bold text-sm mt-0.5">{hoverDetails.label}</div>
            {hoverDetails.flag && hoverDetails.flag !== 'NONE' && (
              <div className={`mt-1 font-bold text-[10px] px-1.5 py-0.5 rounded w-max ${
                hoverDetails.flag === 'GLUT' ? 'bg-crimson-600 text-white' : 'bg-emerald-600 text-white'
              }`}>
                {hoverDetails.flag} RESIDUAL OUTLIER (|z| &gt; 2)
              </div>
            )}
          </div>
        )}
      </div>

      {/* Date Span Footer */}
      <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 border-t border-slate-100 pt-2">
        <span>History Start: {series[0]?.date || '—'}</span>
        <span>Cutoff: {series[series.length - 1]?.date || '—'}</span>
        <span>Projection End: {path[path.length - 1]?.date || '—'} ({path.length} days)</span>
      </div>
    </div>
  );
};
