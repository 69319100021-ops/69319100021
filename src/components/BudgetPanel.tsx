import { useEffect, useState, type FormEvent } from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { MonthlySummary } from '../types/finance';
import { formatTHB, formatThaiMonth } from '../utils/finance';

interface BudgetPanelProps {
  monthKey: string;
  summary: MonthlySummary;
  defaultMonthlyBudget: number;
  onSaveMonthBudget: (amount: number) => Promise<void>;
  onSaveDefaultBudget: (amount: number) => Promise<void>;
}

export function BudgetPanel({
  monthKey,
  summary,
  defaultMonthlyBudget,
  onSaveMonthBudget,
  onSaveDefaultBudget,
}: BudgetPanelProps) {
  const [monthLimitStr, setMonthLimitStr] = useState(String(summary.budgetLimit));
  const [defaultLimitStr, setDefaultLimitStr] = useState(String(defaultMonthlyBudget));
  const [savingMonth, setSavingMonth] = useState(false);
  const [savingDefault, setSavingDefault] = useState(false);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  useEffect(() => {
    setMonthLimitStr(String(summary.budgetLimit));
  }, [summary.budgetLimit, monthKey]);

  useEffect(() => {
    setDefaultLimitStr(String(defaultMonthlyBudget));
  }, [defaultMonthlyBudget]);

  const remaining = summary.budgetLimit - summary.totalExpense;
  const progressClamped = Math.min(100, Math.max(0, summary.budgetUsedPercent));

  const handleSaveMonth = async (e: FormEvent) => {
    e.preventDefault();
    const val = Number(monthLimitStr);
    if (!Number.isFinite(val) || val < 0) return;
    setSavingMonth(true);
    try {
      await onSaveMonthBudget(val);
      setSavedNotice(`บันทึกงบประมาณเดือน ${formatThaiMonth(monthKey)} เรียบร้อยแล้ว`);
    } finally {
      setSavingMonth(false);
    }
  };

  const handleSaveDefault = async (e: FormEvent) => {
    e.preventDefault();
    const val = Number(defaultLimitStr);
    if (!Number.isFinite(val) || val < 0) return;
    setSavingDefault(true);
    try {
      await onSaveDefaultBudget(val);
      setSavedNotice('บันทึกงบประมาณมาตรฐานรายเดือนเรียบร้อยแล้ว');
    } finally {
      setSavingDefault(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              สถานะงบประมาณรายจ่าย — {formatThaiMonth(monthKey)}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              ติดตามยอดใช้จ่ายจริงเทียบกับเพดานงบประมาณที่ตั้งไว้สำหรับเดือนนี้
            </p>
          </div>
          <div className="text-right tabular-nums">
            <span className="text-xs text-slate-500 block">ใช้ไปแล้ว</span>
            <span
              className={`text-lg font-bold font-mono-tabular ${
                summary.isOverBudget
                  ? 'text-[#DC2626]'
                  : summary.isNearBudget
                    ? 'text-[#D97706]'
                    : 'text-[#0F766E]'
              }`}
            >
              {summary.budgetLimit > 0 ? `${summary.budgetUsedPercent.toFixed(1)}%` : 'ไม่จำกัด'}
            </span>
          </div>
        </div>

        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-200 ${
              summary.isOverBudget
                ? 'bg-[#DC2626]'
                : summary.isNearBudget
                  ? 'bg-[#D97706]'
                  : 'bg-[#0F766E]'
            }`}
            style={{ width: `${progressClamped}%` }}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100 text-sm">
          <div>
            <span className="text-xs text-slate-500 block">รายจ่ายสะสมเดือนนี้</span>
            <span className="font-semibold text-slate-900 font-mono-tabular">
              {formatTHB(summary.totalExpense)}
            </span>
          </div>
          <div>
            <span className="text-xs text-slate-500 block">เพดานงบประมาณเดือนนี้</span>
            <span className="font-semibold text-slate-900 font-mono-tabular">
              {formatTHB(summary.budgetLimit)}
            </span>
          </div>
          <div>
            <span className="text-xs text-slate-500 block">
              {remaining >= 0 ? 'งบประมาณคงเหลือ' : 'เกินงบประมาณ'}
            </span>
            <span
              className={`font-semibold font-mono-tabular ${
                remaining >= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'
              }`}
            >
              {formatTHB(Math.abs(remaining))}
            </span>
          </div>
        </div>

        {(summary.isOverBudget || summary.isNearBudget) && (
          <div
            className={`p-3.5 rounded-lg border text-xs flex items-center gap-2.5 ${
              summary.isOverBudget
                ? 'bg-red-50 border-red-200 text-red-800'
                : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}
          >
            <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>
              {summary.isOverBudget
                ? `รายจ่ายเดือนนี้เกินงบประมาณที่กำหนดแล้ว ${formatTHB(Math.abs(remaining))}`
                : 'รายจ่ายเดือนนี้ใช้ไปแล้วมากกว่า 80% ของงบประมาณที่ตั้งไว้'}
            </span>
          </div>
        )}
      </section>

      {savedNotice && (
        <div
          role="status"
          className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{savedNotice}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <form
          onSubmit={handleSaveMonth}
          className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
        >
          <div>
            <h4 className="text-sm font-semibold text-slate-900">
              ตั้งค่างบประมาณเฉพาะเดือน {formatThaiMonth(monthKey)}
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              ใช้สำหรับปรับเพดานรายจ่ายเฉพาะเดือนที่มีค่าใช้จ่ายพิเศษ
            </p>
          </div>
          <div>
            <label htmlFor="month-budget-input" className="block text-xs font-medium text-slate-700 mb-1.5">
              งบประมาณรายจ่าย (บาท)
            </label>
            <input
              id="month-budget-input"
              type="number"
              min="0"
              step="100"
              value={monthLimitStr}
              onChange={(e) => setMonthLimitStr(e.target.value)}
              className="w-full min-h-[42px] px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono-tabular text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
            />
          </div>
          <button
            type="submit"
            disabled={savingMonth}
            className="min-h-[40px] px-4 py-2 rounded-lg bg-[#0F766E] hover:bg-[#0D655E] disabled:opacity-60 text-white text-xs font-semibold cursor-pointer"
          >
            {savingMonth ? 'กำลังบันทึก...' : 'บันทึกงบประมาณเดือนนี้'}
          </button>
        </form>

        <form
          onSubmit={handleSaveDefault}
          className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
        >
          <div>
            <h4 className="text-sm font-semibold text-slate-900">
              งบประมาณมาตรฐานรายเดือน (ค่าเริ่มต้น)
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              ระบบจะใช้วงเงินนี้กับทุกเดือนที่ไม่ได้ตั้งค่างบประมาณเฉพาะเจาะจง
            </p>
          </div>
          <div>
            <label htmlFor="default-budget-input" className="block text-xs font-medium text-slate-700 mb-1.5">
              งบประมาณมาตรฐาน (บาท / เดือน)
            </label>
            <input
              id="default-budget-input"
              type="number"
              min="0"
              step="100"
              value={defaultLimitStr}
              onChange={(e) => setDefaultLimitStr(e.target.value)}
              className="w-full min-h-[42px] px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono-tabular text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
            />
          </div>
          <button
            type="submit"
            disabled={savingDefault}
            className="min-h-[40px] px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-60 text-slate-800 text-xs font-semibold cursor-pointer"
          >
            {savingDefault ? 'กำลังบันทึก...' : 'บันทึกเป็นค่าเริ่มต้น'}
          </button>
        </form>
      </div>
    </div>
  );
}
