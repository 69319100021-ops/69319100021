import { useState } from 'react';
import type { CategoryBreakdownItem, TransactionType } from '../../types/finance';
import { formatTHB } from '../../utils/finance';

interface CategoryDonutChartProps {
  expenseItems: CategoryBreakdownItem[];
  incomeItems: CategoryBreakdownItem[];
  activeType: TransactionType;
  onChangeType: (type: TransactionType) => void;
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  lockType?: boolean;
}

export function CategoryDonutChart({
  expenseItems,
  incomeItems,
  activeType,
  onChangeType,
  selectedCategory,
  onSelectCategory,
  lockType = false,
}: CategoryDonutChartProps) {
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

  const items = activeType === 'expense' ? expenseItems : incomeItems;
  const total = items.reduce((sum, item) => sum + item.amount, 0);

  const size = 180;
  const center = size / 2;
  const radius = 64;
  const strokeWidth = 22;
  const circumference = 2 * Math.PI * radius;

  let cumulativeOffset = 0;

  const highlighted =
    items.find((i) => i.category === hoveredCategory) ??
    items.find((i) => i.category === selectedCategory) ??
    null;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900">
            {lockType
              ? activeType === 'expense'
                ? 'สัดส่วนรายจ่ายตามหมวดหมู่'
                : 'สัดส่วนรายรับตามหมวดหมู่'
              : 'สัดส่วนตามหมวดหมู่'}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            คลิกหมวดหมู่เพื่อกรองรายการด้านล่าง
          </p>
        </div>

        {!lockType && (
          <div className="inline-flex items-center p-1 bg-slate-100 rounded-lg shrink-0" role="tablist" aria-label="เลือกประเภทสัดส่วน">
            <button
              type="button"
              role="tab"
              aria-selected={activeType === 'expense'}
              onClick={() => onChangeType('expense')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeType === 'expense'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              รายจ่าย
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeType === 'income'}
              onClick={() => onChangeType('income')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeType === 'income'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              รายรับ
            </button>
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <div className="py-12 text-center text-sm text-slate-500">
          ยังไม่มีข้อมูล{activeType === 'expense' ? 'รายจ่าย' : 'รายรับ'}ในเดือนนี้
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-[156px_1fr] items-center gap-5">
          <div className="relative mx-auto w-[156px] h-[156px] flex items-center justify-center">
            <svg
              viewBox={`0 0 ${size} ${size}`}
              className="w-full h-full -rotate-90"
              role="img"
              aria-label={`กราฟวงแหวนสัดส่วน${activeType === 'expense' ? 'รายจ่าย' : 'รายรับ'}ตามหมวดหมู่`}
            >
              <circle
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke="#F1F5F9"
                strokeWidth={strokeWidth}
              />
              {items.map((item) => {
                const segLength = (item.amount / total) * circumference;
                const dashArray = `${Math.max(0, segLength - 2)} ${circumference}`;
                const dashOffset = -cumulativeOffset;
                cumulativeOffset += segLength;

                const isActive =
                  hoveredCategory === item.category ||
                  selectedCategory === item.category;

                return (
                  <circle
                    key={item.category}
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="none"
                    stroke={item.color}
                    strokeWidth={isActive ? strokeWidth + 4 : strokeWidth}
                    strokeDasharray={dashArray}
                    strokeDashoffset={dashOffset}
                    className="cursor-pointer transition-all duration-150"
                    opacity={
                      hoveredCategory && hoveredCategory !== item.category
                        ? 0.45
                        : 1
                    }
                    onMouseEnter={() => setHoveredCategory(item.category)}
                    onMouseLeave={() => setHoveredCategory(null)}
                    onClick={() =>
                      onSelectCategory(
                        selectedCategory === item.category ? 'all' : item.category
                      )
                    }
                  />
                );
              })}
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-3">
              <span className="text-[11px] text-slate-500 truncate max-w-[100px]">
                {highlighted ? highlighted.category : 'ยอดรวม'}
              </span>
              <span className="text-xs font-semibold text-slate-900 font-mono-tabular mt-0.5">
                {formatTHB(highlighted ? highlighted.amount : total)}
              </span>
              {highlighted && (
                <span className="text-[11px] text-slate-500 font-mono-tabular">
                  {highlighted.percentage}%
                </span>
              )}
            </div>
          </div>

          <ul className="divide-y divide-slate-100 max-h-[210px] overflow-y-auto pr-1">
            {items.map((item) => {
              const isSelected = selectedCategory === item.category;
              return (
                <li key={item.category}>
                  <button
                    type="button"
                    onMouseEnter={() => setHoveredCategory(item.category)}
                    onMouseLeave={() => setHoveredCategory(null)}
                    onClick={() =>
                      onSelectCategory(isSelected ? 'all' : item.category)
                    }
                    className={`w-full py-2 px-2 rounded-lg flex items-center justify-between gap-2 text-left transition-colors cursor-pointer ${
                      isSelected ? 'bg-teal-50/70' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-xs shrink-0"
                        style={{ backgroundColor: item.color }}
                        aria-hidden="true"
                      />
                      <span className="text-xs font-medium text-slate-800 truncate">
                        {item.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 text-xs tabular-nums">
                      <span className="text-slate-400 font-mono-tabular">
                        {item.percentage.toFixed(1)}%
                      </span>
                      <span className="font-semibold text-slate-900 font-mono-tabular">
                        {formatTHB(item.amount)}
                      </span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
