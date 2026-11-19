import { useState } from 'react';
import type { MonthlyTrendPoint } from '../../types/finance';
import { formatTHB } from '../../utils/finance';

interface MonthlyBarChartProps {
  data: MonthlyTrendPoint[];
  selectedMonthKey: string;
  onSelectMonth: (monthKey: string) => void;
}

export function MonthlyBarChart({
  data,
  selectedMonthKey,
  onSelectMonth,
}: MonthlyBarChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const maxVal = Math.max(
    10000,
    ...data.flatMap((d) => [d.income, d.expense])
  );
  // Round nice ceiling to nearest 10k or 5k
  const step = maxVal > 100000 ? 50000 : maxVal > 30000 ? 15000 : 5000;
  const niceMax = Math.ceil(maxVal / step) * step;

  const width = 680;
  const height = 260;
  const padLeft = 64;
  const padRight = 16;
  const padTop = 20;
  const padBottom = 38;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => ({
    value: Math.round(niceMax * ratio),
    y: padTop + plotH * (1 - ratio),
  }));

  const groupWidth = plotW / Math.max(1, data.length);
  const barWidth = Math.min(22, groupWidth * 0.28);
  const gapBetweenBars = 5;

  const activePoint =
    hoveredIndex !== null ? data[hoveredIndex] : data.find((d) => d.monthKey === selectedMonthKey) ?? data[data.length - 1];

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900">
            เปรียบเทียบรายรับและรายจ่าย 6 เดือนย้อนหลัง
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            คลิกที่แท่งเดือนเพื่อสลับดูข้อมูลของเดือนนั้น
          </p>
        </div>

        <div className="flex items-center gap-5 text-xs text-slate-600">
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#16A34A]" aria-hidden="true" />
            รายรับ
          </span>
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#DC2626]" aria-hidden="true" />
            รายจ่าย
          </span>
        </div>
      </div>

      {activePoint && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs border-b border-slate-100 pb-3 text-slate-600">
          <span className="font-semibold text-slate-900">{activePoint.fullLabel}</span>
          <span className="tabular-nums">
            รายรับ: <strong className="text-[#16A34A] font-mono-tabular">{formatTHB(activePoint.income)}</strong>
          </span>
          <span className="tabular-nums">
            รายจ่าย: <strong className="text-[#DC2626] font-mono-tabular">{formatTHB(activePoint.expense)}</strong>
          </span>
          <span className="tabular-nums">
            คงเหลือสุทธิ:{' '}
            <strong
              className={`font-mono-tabular ${
                activePoint.net >= 0 ? 'text-slate-900' : 'text-[#DC2626]'
              }`}
            >
              {formatTHB(activePoint.net, true)}
            </strong>
          </span>
        </div>
      )}

      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto min-w-[460px]"
          role="img"
          aria-label="กราฟแท่งเปรียบเทียบรายรับและรายจ่าย 6 เดือน"
        >
          {yTicks.map((tick) => (
            <g key={tick.value}>
              <line
                x1={padLeft}
                x2={width - padRight}
                y1={tick.y}
                y2={tick.y}
                stroke="#E2E8F0"
                strokeDasharray={tick.value === 0 ? undefined : '3 3'}
                strokeWidth="1"
              />
              <text
                x={padLeft - 10}
                y={tick.y + 4}
                textAnchor="end"
                className="fill-slate-400 text-[11px] font-mono-tabular"
              >
                {tick.value >= 1000
                  ? `฿${Math.round(tick.value / 1000)}k`
                  : `฿${tick.value}`}
              </text>
            </g>
          ))}

          {data.map((point, index) => {
            const centerX = padLeft + groupWidth * (index + 0.5);
            const isSelected = point.monthKey === selectedMonthKey;
            const isHovered = hoveredIndex === index;

            const incomeH = (point.income / niceMax) * plotH;
            const expenseH = (point.expense / niceMax) * plotH;
            const incomeY = padTop + plotH - incomeH;
            const expenseY = padTop + plotH - expenseH;

            const incomeX = centerX - barWidth - gapBetweenBars / 2;
            const expenseX = centerX + gapBetweenBars / 2;

            return (
              <g
                key={point.monthKey}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                onClick={() => onSelectMonth(point.monthKey)}
              >
                <rect
                  x={padLeft + groupWidth * index + 4}
                  y={padTop}
                  width={groupWidth - 8}
                  height={plotH}
                  rx={6}
                  fill={isSelected ? '#F1F5F9' : isHovered ? '#F8FAFC' : 'transparent'}
                />

                <rect
                  x={incomeX}
                  y={Math.min(incomeY, padTop + plotH - 2)}
                  width={barWidth}
                  height={Math.max(2, incomeH)}
                  rx={3}
                  fill={isSelected || isHovered ? '#15803D' : '#16A34A'}
                  opacity={point.income === 0 ? 0.2 : 1}
                />

                <rect
                  x={expenseX}
                  y={Math.min(expenseY, padTop + plotH - 2)}
                  width={barWidth}
                  height={Math.max(2, expenseH)}
                  rx={3}
                  fill={isSelected || isHovered ? '#B91C1C' : '#DC2626'}
                  opacity={point.expense === 0 ? 0.2 : 1}
                />

                <text
                  x={centerX}
                  y={height - 12}
                  textAnchor="middle"
                  className={`text-[11px] ${
                    isSelected
                      ? 'fill-slate-900 font-semibold'
                      : 'fill-slate-500 font-normal'
                  }`}
                >
                  {point.shortLabel}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
