import React, { useState } from 'react';
import { TrendingUp, Info } from 'lucide-react';

interface ChartStlProps {
  conservative?: boolean;
}

export const ChartStl: React.FC<ChartStlProps> = ({ conservative = false }) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // 24 simulated weekly points representing 2023-2025 Onion price dynamics
  const dataPoints = [
    { week: "W1 Jun 23", price: 2100, trend: 2050, upper: 2350, lower: 1850, flag: null },
    { week: "W5 Jul 23", price: 2180, trend: 2120, upper: 2420, lower: 1910, flag: null },
    { week: "W9 Aug 23", price: 2450, trend: 2200, upper: 2550, lower: 2010, flag: "SPIKE" },
    { week: "W13 Sep 23", price: 2780, trend: 2310, upper: 2880, lower: 2150, flag: null },
    { week: "W17 Oct 23", price: 3400, trend: 2450, upper: 3600, lower: 2300, flag: null },
    { week: "W21 Nov 23", price: 4100, trend: 2600, upper: 4350, lower: 2480, flag: "SPIKE" },
    { week: "W25 Dec 23", price: 3600, trend: 2720, upper: 3900, lower: 2500, flag: null },
    { week: "W29 Jan 24", price: 2800, trend: 2800, upper: 3100, lower: 2450, flag: null },
    { week: "W33 Feb 24", price: 2300, trend: 2850, upper: 2900, lower: 2100, flag: null },
    { week: "W37 Mar 24", price: 1950, trend: 2880, upper: 2600, lower: 1850, flag: null },
    { week: "W41 Apr 24", price: 1650, trend: 2900, upper: 2300, lower: 1550, flag: "GLUT" },
    { week: "W45 May 24", price: 1450, trend: 2910, upper: 2100, lower: 1350, flag: "GLUT" },
    { week: "W49 Jun 24", price: 1850, trend: 2920, upper: 2350, lower: 1550, flag: null },
    { week: "W53 Jul 24", price: 2250, trend: 2940, upper: 2650, lower: 1850, flag: null },
    { week: "W57 Aug 24", price: 2850, trend: 2960, upper: 3150, lower: 2350, flag: null },
    { week: "W61 Sep 24", price: 3500, trend: 2990, upper: 3800, lower: 2650, flag: null },
    { week: "W65 Oct 24", price: 4400, trend: 3020, upper: 4700, lower: 2900, flag: "SPIKE" },
    { week: "W69 Nov 24", price: 4950, trend: 3050, upper: 5300, lower: 3150, flag: "SPIKE" },
    { week: "W73 Dec 24", price: 4100, trend: 3080, upper: 4500, lower: 2900, flag: null },
    { week: "W77 Jan 25", price: 3200, trend: 3100, upper: 3600, lower: 2700, flag: null },
    { week: "W81 Feb 25", price: 2600, trend: 3120, upper: 3100, lower: 2300, flag: null },
    { week: "W85 Mar 25", price: 2200, trend: 3140, upper: 2700, lower: 2000, flag: null },
    { week: "W89 Apr 25", price: 1850, trend: 3150, upper: 2400, lower: 1700, flag: "GLUT" },
    { week: "W93 Jun 25", price: 2484, trend: 3160, upper: 2950, lower: 2150, flag: null },
  ];

  // Projected 60-180 days path p(d) starting from W93 Jun 25
  const projection = [
    { day: "d0", price: 2484 },
    { day: "d30", price: conservative ? 2750 : 3081 },
    { day: "d60", price: conservative ? 3420 : 3890 },
    { day: "d90", price: conservative ? 4100 : 4615 },
    { day: "d120", price: conservative ? 4450 : 4980 },
    { day: "d157 (Peak)", price: conservative ? 4520 : 5073 },
    { day: "d180", price: conservative ? 4050 : 4541 },
  ];

  const minVal = 1000;
  const maxVal = 5500;
  const svgWidth = 800;
  const svgHeight = 280;
  const padL = 50;
  const padR = 20;
  const padT = 20;
  const padB = 40;

  const chartW = svgWidth - padL - padR;
  const chartH = svgHeight - padT - padB;

  const getY = (val: number) => {
    return padT + chartH - ((val - minVal) / (maxVal - minVal)) * chartH;
  };

  const getX = (idx: number, total: number) => {
    return padL + (idx / (total - 1)) * (chartW * 0.72);
  };

  const getProjX = (idx: number, total: number) => {
    const startX = padL + chartW * 0.72;
    const remainingW = chartW * 0.28;
    return startX + (idx / (total - 1)) * remainingW;
  };

  // Build SVG path for upper/lower band polygon
  const upperPts = dataPoints.map((d, i) => `${getX(i, dataPoints.length)},${getY(d.upper)}`);
  const lowerPts = [...dataPoints].reverse().map((d, i) => `${getX(dataPoints.length - 1 - i, dataPoints.length)},${getY(d.lower)}`);
  const bandPolygon = `${upperPts.join(' ')} ${lowerPts.join(' ')}`;

  // Actual price path
  const pricePolyline = dataPoints.map((d, i) => `${getX(i, dataPoints.length)},${getY(d.price)}`).join(' ');

  // Trend line
  const trendPolyline = dataPoints.map((d, i) => `${getX(i, dataPoints.length)},${getY(d.trend)}`).join(' ');

  // Projection path
  const projPolyline = projection.map((p, i) => `${getProjX(i, projection.length)},${getY(p.price)}`).join(' ');

  return (
    <div className="w-full bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-crimson-brand" />
          <h4 className="text-sm font-extrabold text-slate-900">
            52-Week STL Decomposition with ±2σ Residual Volatility Bands
          </h4>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-mono">
          <span className="flex items-center gap-1.5 text-slate-600">
            <span className="w-2.5 h-0.5 bg-slate-900"></span> Actual Modal Price
          </span>
          <span className="flex items-center gap-1.5 text-slate-500">
            <span className="w-2.5 h-0.5 bg-slate-400 border-dashed border-b"></span> Trend
          </span>
          <span className="flex items-center gap-1.5 text-crimson-brand font-bold">
            <span className="w-2.5 h-0.5 bg-crimson-brand"></span> Projected p(d)
          </span>
        </div>
      </div>

      <div className="w-full overflow-x-auto">
        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto min-w-[650px] font-mono text-[10px]">
          
          {/* Y-Axis Gridlines */}
          {[1500, 2500, 3500, 4500].map((tick) => (
            <g key={tick}>
              <line 
                x1={padL} 
                y1={getY(tick)} 
                x2={svgWidth - padR} 
                y2={getY(tick)} 
                stroke="#F1F5F9" 
                strokeWidth="1" 
              />
              <text x={padL - 8} y={getY(tick) + 3} textAnchor="end" fill="#94A3B8" className="select-none text-[10px]">
                ₹{tick}
              </text>
            </g>
          ))}

          {/* Division Line for History vs Projection */}
          <line
            x1={padL + chartW * 0.72}
            y1={padT}
            x2={padL + chartW * 0.72}
            y2={padT + chartH}
            stroke="#DC2626"
            strokeDasharray="3 3"
            strokeWidth="1.5"
          />
          <text 
            x={padL + chartW * 0.72 - 6} 
            y={padT + 12} 
            textAnchor="end" 
            fill="#64748B" 
            className="font-bold text-[10px]"
          >
            Historical History (June 2023 → June 2025)
          </text>
          <text 
            x={padL + chartW * 0.72 + 6} 
            y={padT + 12} 
            textAnchor="start" 
            fill="#DC2626" 
            className="font-bold text-[10px]"
          >
            M3 Planning Horizon (p(d))
          </text>

          {/* ±2σ Volatility Band Shading */}
          <polygon points={bandPolygon} fill="rgba(215, 38, 61, 0.08)" stroke="rgba(215, 38, 61, 0.25)" strokeWidth="0.8" />

          {/* Trend Line (Dashed) */}
          <polyline points={trendPolyline} fill="none" stroke="#94A3B8" strokeWidth="1.5" strokeDasharray="4 4" />

          {/* Actual Price Polyline */}
          <polyline points={pricePolyline} fill="none" stroke="#0F172A" strokeWidth="2" strokeLinejoin="round" />

          {/* Projected Price Polyline */}
          <polyline points={projPolyline} fill="none" stroke="#DC2626" strokeWidth="2.5" strokeLinejoin="round" strokeDasharray="5 3" />

          {/* Outlier Markers: GLUT (low) and SPIKE (high) */}
          {dataPoints.map((d, i) => {
            if (!d.flag) return null;
            const x = getX(i, dataPoints.length);
            const y = getY(d.price);
            const isGlut = d.flag === "GLUT";
            return (
              <g key={i}>
                <circle 
                  cx={x} 
                  cy={y} 
                  r="5" 
                  fill={isGlut ? "#DC2626" : "#059669"} 
                  stroke="#FFFFFF" 
                  strokeWidth="1.5" 
                />
                <text 
                  x={x} 
                  y={isGlut ? y + 14 : y - 8} 
                  textAnchor="middle" 
                  fill={isGlut ? "#DC2626" : "#059669"} 
                  className="font-extrabold text-[9px]"
                >
                  {d.flag}
                </text>
              </g>
            );
          })}

          {/* Projection Points with hover */}
          {projection.map((p, i) => {
            const x = getProjX(i, projection.length);
            const y = getY(p.price);
            const isPeak = p.day.includes("Peak");
            return (
              <g 
                key={i} 
                className="cursor-pointer"
                onMouseEnter={() => setHoverIndex(i)}
                onMouseLeave={() => setHoverIndex(null)}
              >
                <circle 
                  cx={x} 
                  cy={y} 
                  r={isPeak ? "6" : "4"} 
                  fill={isPeak ? "#DC2626" : "#FFFFFF"} 
                  stroke="#DC2626" 
                  strokeWidth="2" 
                />
                {isPeak && (
                  <text x={x} y={y - 10} textAnchor="middle" fill="#DC2626" className="font-extrabold text-[10px]">
                    Peak ₹{p.price}
                  </text>
                )}
              </g>
            );
          })}

          {/* X-Axis Labels */}
          {["Jun 23", "Oct 23", "Feb 24", "Jun 24", "Oct 24", "Feb 25", "Jun 25"].map((dateLabel, idx) => {
            const stepIdx = Math.floor((idx / 6) * (dataPoints.length - 1));
            const x = getX(stepIdx, dataPoints.length);
            return (
              <text key={idx} x={x} y={padT + chartH + 18} textAnchor="middle" fill="#64748B" className="text-[10px]">
                {dateLabel}
              </text>
            );
          })}
          <text x={svgWidth - padR - 30} y={padT + chartH + 18} textAnchor="middle" fill="#DC2626" className="font-bold text-[10px]">
            +180 Days
          </text>

        </svg>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
        <div className="flex items-center gap-1.5 font-mono">
          <Info className="w-3.5 h-3.5 text-slate-400" />
          <span>F_seasonal: <strong>0.9996</strong> · F_trend: <strong>0.9993</strong> (LOESS period=52, robust=True)</span>
        </div>
        <div className="font-mono text-crimson-brand font-semibold">
          Break-Even Day: <strong>d4</strong> · Peak Liquidation: <strong>d157</strong> (gain +₹2,182/qtl)
        </div>
      </div>
    </div>
  );
};
