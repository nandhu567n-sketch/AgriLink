import React from 'react';
import type { SeasonalIndexPoint } from '../api/types';

interface CalendarMonthChartProps {
  seasonalIndex: SeasonalIndexPoint[];
}

export const CalendarMonthChart: React.FC<CalendarMonthChartProps> = ({ seasonalIndex }) => {
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthFull = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const dateRanges = [
    '01–31 Jan', '01–28 Feb', '01–31 Mar', '01–30 Apr',
    '01–31 May', '01–30 Jun', '01–31 Jul', '01–31 Aug',
    '01–30 Sep', '01–31 Oct', '01–30 Nov', '01–31 Dec'
  ];

  // Map 1-12 to values
  const indexMap = new Map<number, number>();
  seasonalIndex.forEach((pt) => indexMap.set(pt.month, pt.index));

  const values: number[] = [];
  for (let m = 1; m <= 12; m++) {
    values.push(indexMap.get(m) ?? 1.0);
  }

  const maxVal = Math.max(...values, 1.25);
  const minVal = 0;
  const range = maxVal - minVal;

  let peakMonth = 1;
  let peakVal = values[0];
  let troughMonth = 1;
  let troughVal = values[0];

  values.forEach((v, idx) => {
    if (v > peakVal) {
      peakVal = v;
      peakMonth = idx + 1;
    }
    if (v < troughVal) {
      troughVal = v;
      troughMonth = idx + 1;
    }
  });

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <h4 className="text-xs font-mono font-bold text-crimson-brand uppercase">
            Calendar Month Seasonality Index
          </h4>
          <p className="text-[11px] text-slate-500 mt-0.5">
            1.0 = Annual modal baseline. Bars above 1.0 mark lean-season price premiums.
          </p>
        </div>
        <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
          12-Month Harmonic
        </span>
      </div>

      {/* SVG Bar Chart */}
      <div className="relative overflow-x-auto">
        <svg viewBox="0 0 720 250" className="w-full h-auto max-h-[260px] select-none">
          {/* Baseline 1.0 horizontal line */}
          {(() => {
            const y1 = 200 - ((1.0 - minVal) / range) * 170;
            return (
              <g>
                <line x1="40" y1={y1} x2="700" y2={y1} stroke="#94A3B8" strokeWidth="1.5" strokeDasharray="4 4" />
                <text x="45" y={y1 - 6} fill="#64748B" fontSize="10" fontFamily="ui-monospace, monospace" fontWeight="bold">
                  1.00 Baseline (Parity)
                </text>
              </g>
            );
          })()}

          {/* 12 Bars */}
          {values.map((val, idx) => {
            const barWidth = 36;
            const gap = (660 - barWidth * 12) / 11;
            const x = 50 + idx * (barWidth + gap);
            const barHeight = Math.max(4, ((val - minVal) / range) * 170);
            const y = 200 - barHeight;
            const isPeak = val >= 1.0;
            const barColor = isPeak ? '#D7263D' : '#F6A8B4';

            return (
              <g key={idx} className="group cursor-pointer">
                {/* Bar */}
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  fill={barColor}
                  rx="4"
                  className="transition-all hover:opacity-85"
                />

                {/* Index Value Label */}
                <text
                  x={x + barWidth / 2}
                  y={y - 6}
                  textAnchor="middle"
                  fill="#1E293B"
                  fontSize="10"
                  fontWeight="bold"
                  fontFamily="ui-monospace, monospace"
                >
                  {val.toFixed(2)}
                </text>

                {/* Month Name */}
                <text
                  x={x + barWidth / 2}
                  y={216}
                  textAnchor="middle"
                  fill="#334155"
                  fontSize="11"
                  fontWeight="bold"
                  fontFamily="ui-monospace, monospace"
                >
                  {monthNames[idx]}
                </text>

                {/* Date Window */}
                <text
                  x={x + barWidth / 2}
                  y={230}
                  textAnchor="middle"
                  fill="#94A3B8"
                  fontSize="8.5"
                  fontFamily="ui-monospace, monospace"
                >
                  {dateRanges[idx].split('–')[0]}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Peak & Trough Callout Footer */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 text-xs font-mono">
        <div className="bg-crimson-50/60 border border-crimson-200/80 rounded-xl p-2.5 flex items-center gap-2">
          <span className="text-crimson-brand font-bold text-sm">🔥</span>
          <div>
            <div className="text-[10px] text-slate-500 uppercase">Peak Window</div>
            <div className="font-bold text-slate-900">
              {monthFull[peakMonth - 1]} ({dateRanges[peakMonth - 1]}) · <span className="text-crimson-brand font-black">+{((peakVal - 1) * 100).toFixed(0)}%</span> (Index {peakVal.toFixed(2)})
            </div>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center gap-2">
          <span className="text-blue-500 font-bold text-sm">❄️</span>
          <div>
            <div className="text-[10px] text-slate-500 uppercase">Trough / Inflow Window</div>
            <div className="font-bold text-slate-900">
              {monthFull[troughMonth - 1]} ({dateRanges[troughMonth - 1]}) · <span className="text-slate-600 font-black">{((troughVal - 1) * 100).toFixed(0)}%</span> (Index {troughVal.toFixed(2)})
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
