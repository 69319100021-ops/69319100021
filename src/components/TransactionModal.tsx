import { useEffect, useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import {
  BLUEPRINT_LIMITS,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  type Transaction,
  type TransactionInput,
  type TransactionType,
} from '../types/finance';
import { getTodayDateString, validateTransactionInput } from '../utils/finance';

interface TransactionModalProps {
  open: boolean;
  editingTransaction: Transaction | null;
  defaultMonthKey: string;
  onClose: () => void;
  onSave: (input: TransactionInput, existingId?: string) => Promise<void>;
}

export function TransactionModal({
  open,
  editingTransaction,
  defaultMonthKey,
  onClose,
  onSave,
}: TransactionModalProps) {
  const [type, setType] = useState<TransactionType>('expense');
  const [amountStr, setAmountStr] = useState('');
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [date, setDate] = useState(getTodayDateString());
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<Partial<Record<keyof TransactionInput, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;

    if (editingTransaction) {
      setType(editingTransaction.type);
      setAmountStr(String(editingTransaction.amount));
      setCategory(editingTransaction.category);
      setDate(editingTransaction.date);
      setNote(editingTransaction.note);
    } else {
      const today = getTodayDateString();
      const initialDate = today.startsWith(defaultMonthKey)
        ? today
        : `${defaultMonthKey}-01`;
      setType('expense');
      setAmountStr('');
      setCategory(EXPENSE_CATEGORIES[0]);
      setDate(initialDate);
      setNote('');
    }
    setErrors({});
    setSubmitting(false);
  }, [open, editingTransaction, defaultMonthKey]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const handleTypeChange = (nextType: TransactionType) => {
    setType(nextType);
    const nextList = nextType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    if (!nextList.includes(category)) {
      setCategory(nextList[0]);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const parsedAmount = Number(amountStr);
    const payload: TransactionInput = {
      type,
      amount: parsedAmount,
      category,
      note,
      date,
    };

    const result = validateTransactionInput(payload);
    if (!result.valid) {
      setErrors(result.errors);
      return;
    }

    setErrors({});
    setSubmitting(true);
    try {
      await onSave(payload, editingTransaction?.id);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/45"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="tx-modal-title"
        className="w-full max-w-lg bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 id="tx-modal-title" className="text-base font-bold text-slate-900">
            {editingTransaction ? 'แก้ไขรายการธุรกรรม' : 'บันทึกรายรับ / รายจ่ายใหม่'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิดหน้าต่างบันทึกรายการ"
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5" noValidate>
          <div>
            <span className="block text-xs font-medium text-slate-700 mb-2">
              ประเภทรายการ
            </span>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => handleTypeChange('expense')}
                className={`min-h-[40px] py-2 px-3 rounded-md text-sm font-semibold transition-colors cursor-pointer ${
                  type === 'expense'
                    ? 'bg-white text-[#DC2626] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                รายจ่าย
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('income')}
                className={`min-h-[40px] py-2 px-3 rounded-md text-sm font-semibold transition-colors cursor-pointer ${
                  type === 'income'
                    ? 'bg-white text-[#16A34A] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                รายรับ
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="tx-amount" className="block text-xs font-medium text-slate-700 mb-1.5">
                จำนวนเงิน (บาท)
              </label>
              <input
                id="tx-amount"
                type="number"
                step="0.01"
                min="0.01"
                max={BLUEPRINT_LIMITS.MAX_AMOUNT}
                placeholder="0.00"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                required
                className="w-full min-h-[42px] px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono-tabular text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0F766E] focus:border-[#0F766E]"
              />
              {errors.amount && (
                <p className="mt-1 text-xs text-[#DC2626]" role="alert">
                  {errors.amount}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="tx-date" className="block text-xs font-medium text-slate-700 mb-1.5">
                วันที่ทำรายการ
              </label>
              <input
                id="tx-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full min-h-[42px] px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono-tabular text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0F766E] focus:border-[#0F766E]"
              />
              {errors.date && (
                <p className="mt-1 text-xs text-[#DC2626]" role="alert">
                  {errors.date}
                </p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="tx-category" className="block text-xs font-medium text-slate-700 mb-1.5">
              หมวดหมู่
            </label>
            <select
              id="tx-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full min-h-[42px] px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#0F766E] focus:border-[#0F766E]"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            {errors.category && (
              <p className="mt-1 text-xs text-[#DC2626]" role="alert">
                {errors.category}
              </p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="tx-note" className="block text-xs font-medium text-slate-700">
                บันทึกเพิ่มเติม (ไม่บังคับ)
              </label>
              <span className="text-[11px] text-slate-400 font-mono-tabular">
                {note.length}/{BLUEPRINT_LIMITS.MAX_NOTE_LEN}
              </span>
            </div>
            <input
              id="tx-note"
              type="text"
              maxLength={BLUEPRINT_LIMITS.MAX_NOTE_LEN}
              placeholder="เช่น ค่ากาแฟประชุมงาน หรือ เงินเดือนรอบแรก"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full min-h-[42px] px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0F766E] focus:border-[#0F766E]"
            />
            {errors.note && (
              <p className="mt-1 text-xs text-[#DC2626]" role="alert">
                {errors.note}
              </p>
            )}
          </div>

          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[40px] px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer whitespace-nowrap"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="min-h-[40px] px-5 py-2 rounded-lg bg-[#0F766E] hover:bg-[#0D655E] disabled:opacity-60 text-white text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap"
            >
              {submitting ? 'กำลังบันทึก...' : editingTransaction ? 'บันทึกการแก้ไข' : 'บันทึกรายการ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
