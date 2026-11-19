import { useState } from 'react';
import type { DailyCashflowPoint } from '../../types/finance';
import { formatTHB, formatThaiDate } from '../../utils/finance';

interface DailyCashflowChartProps {
  data: DailyCashflowPoint[];
}

export function DailyCashflowChart({ data }: DailyCashflowChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const width = 680;
  const height = 220;
  const padLeft = 64;
  const padRight = 18;
  const padTop = 18;
  const padBottom = 32;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const values = data.map((d) => d.cumulativeNet);
  const rawMin = Math.min(0, ...values);
  const rawMax = Math.max(1000, ...values);
  const span = Math.max(1000, rawMax - rawMin);
  const minVal = rawMin - span * 0.08;
  const maxVal = rawMax + span * 0.08;
  const range = maxVal - minVal || 1;

  const toX = (idx: number) =>
    padLeft + (data.length > 1 ? (idx / (data.length - 1)) * plotW : plotW / 2);
  const toY = (val: number) => padTop + plotH - ((val - minVal) / range) * plotH;

  const linePath = data
    .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(1)} ${toY(pt.cumulativeNet).toFixed(1)}`)
    .join(' ');

  const zeroY = toY(0);
  const areaPath =
    data.length > 0
      ? `${linePath} L ${toX(data.length - 1).toFixed(1)} ${Math.min(padTop + plotH, Math.max(padTop, zeroY)).toFixed(1)} L ${toX(0).toFixed(1)} ${Math.min(padTop + plotH, Math.max(padTop, zeroY)).toFixed(1)} Z`
      : '';

  const active = hoveredIdx !== null ? data[hoveredIdx] : data[data.length - 1];

  const yGridValues = [minVal, (minVal + maxVal) / 2, maxVal];
  const dayLabels = data.filter((d) => d.day === 1 || d.day % 5 === 0 || d.day === data.length);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900">
            แนวโน้มยอดเงินคงเหลือสะสมรายวัน
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            แสดงการเปลี่ยนแปลงของกระแสเงินสดสุทธิตั้งแต่วันที่ 1 จนถึงสิ้นเดือน
          </p>
        </div>

        {active && (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-600 tabular-nums">
            <span className="font-medium text-slate-900">{formatThaiDate(active.date)}</span>
            <span>
              รับ: <strong className="text-[#16A34A] font-mono-tabular">{formatTHB(active.income)}</strong>
            </span>
            <span>
              จ่าย: <strong className="text-[#DC2626] font-mono-tabular">{formatTHB(active.expense)}</strong>
            </span>
            <span>
              สะสม:{' '}
              <strong
                className={`font-mono-tabular ${
                  active.cumulativeNet >= 0 ? 'text-[#0F766E]' : 'text-[#DC2626]'
                }`}
              >
                {formatTHB(active.cumulativeNet, true)}
              </strong>
            </span>
          </div>
        )}
      </div>

      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto min-w-[460px]"
          role="img"
          aria-label="กราฟเส้นแนวโน้มยอดคงเหลือสะสมรายวัน"
        >
          <defs>
            <linearGradient id="cashflowAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0F766E" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#0F766E" stopOpacity="0.01" />
            </linearGradient>
          </defs>

          {yGridValues.map((val, i) => {
            const y = toY(val);
            return (
              <g key={i}>
                <line
                  x1={padLeft}
                  x2={width - padRight}
                  y1={y}
                  y2={y}
                  stroke="#E2E8F0"
                  strokeDasharray="3 3"
                  strokeWidth="1"
                />
                <text
                  x={padLeft - 10}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-slate-400 text-[11px] font-mono-tabular"
                >
                  {Math.abs(val) >= 1000
                    ? `฿${Math.round(val / 1000)}k`
                    : `฿${Math.round(val)}`}
                </text>
              </g>
            );
          })}

          {zeroY >= padTop && zeroY <= padTop + plotH && (
            <line
              x1={padLeft}
              x2={width - padRight}
              y1={zeroY}
              y2={zeroY}
              stroke="#CBD5E1"
              strokeWidth="1"
            />
          )}

          {areaPath && <path d={areaPath} fill="url(#cashflowAreaGrad)" />}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke="#0F766E"
              strokeWidth="2.25"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}

          {dayLabels.map((pt) => {
            const idx = pt.day - 1;
            return (
              <text
                key={pt.day}
                x={toX(idx)}
                y={height - 8}
                textAnchor="middle"
                className="fill-slate-400 text-[11px] font-mono-tabular"
              >
                {pt.day}
              </text>
            );
          })}

          {hoveredIdx !== null && data[hoveredIdx] && (
            <g>
              <line
                x1={toX(hoveredIdx)}
                x2={toX(hoveredIdx)}
                y1={padTop}
                y2={padTop + plotH}
                stroke="#94A3B8"
                strokeDasharray="2 2"
                strokeWidth="1"
              />
              <circle
                cx={toX(hoveredIdx)}
                cy={toY(data[hoveredIdx].cumulativeNet)}
                r={4.5}
                fill="#0F766E"
                stroke="#FFFFFF"
                strokeWidth="2"
              />
            </g>
          )}

          {data.map((pt, idx) => {
            const colW = plotW / Math.max(1, data.length);
            return (
              <rect
                key={pt.date}
                x={toX(idx) - colW / 2}
                y={padTop}
                width={colW}
                height={plotH}
                fill="transparent"
                className="cursor-crosshair"
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              />
            );
          })}
        </svg>
      </div>
    </div>
  );
}
