import { ArrowDownLeft, ArrowUpRight, Download, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  type Transaction,
  type TransactionType,
} from '../types/finance';
import { formatTHB, formatThaiDate } from '../utils/finance';

interface TransactionTableProps {
  transactions: Transaction[];
  loading: boolean;
  typeFilter: 'all' | TransactionType;
  onChangeTypeFilter: (t: 'all' | TransactionType) => void;
  categoryFilter: string;
  onChangeCategoryFilter: (cat: string) => void;
  searchQuery: string;
  onChangeSearchQuery: (q: string) => void;
  onEdit: (tx: Transaction) => void;
  onDelete: (tx: Transaction) => void;
  onAddNew: () => void;
  onExportCsv: () => void;
  title?: string;
  compact?: boolean;
}

export function TransactionTable({
  transactions,
  loading,
  typeFilter,
  onChangeTypeFilter,
  categoryFilter,
  onChangeCategoryFilter,
  searchQuery,
  onChangeSearchQuery,
  onEdit,
  onDelete,
  onAddNew,
  onExportCsv,
  title = 'รายการเดินบัญชีประจำเดือน',
  compact = false,
}: TransactionTableProps) {
  const allCategories =
    typeFilter === 'income'
      ? INCOME_CATEGORIES
      : typeFilter === 'expense'
        ? EXPENSE_CATEGORIES
        : Array.from(new Set([...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES]));

  const hasFilters = typeFilter !== 'all' || categoryFilter !== 'all' || searchQuery.trim() !== '';

  return (
    <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="p-5 border-b border-slate-200 flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-slate-900">{title}</h3>
            <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
              แสดง {transactions.length} รายการ
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onExportCsv}
              disabled={transactions.length === 0}
              className="min-h-[38px] px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 text-xs font-medium text-slate-700 inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
              <span>ส่งออก CSV</span>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div
            className="inline-flex items-center p-1 bg-slate-100 rounded-lg"
            role="tablist"
            aria-label="กรองตามประเภทรายการ"
          >
            {(
              [
                { id: 'all', label: 'ทั้งหมด' },
                { id: 'income', label: 'รายรับ' },
                { id: 'expense', label: 'รายจ่าย' },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={typeFilter === item.id}
                onClick={() => onChangeTypeFilter(item.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  typeFilter === item.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2.5 flex-1 justify-end min-w-[240px]">
            <div className="relative flex-1 max-w-xs min-w-[180px]">
              <Search
                className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="search"
                aria-label="ค้นหารายการ"
                placeholder="ค้นหาบันทึกหรือหมวดหมู่..."
                value={searchQuery}
                onChange={(e) => onChangeSearchQuery(e.target.value)}
                className="w-full min-h-[38px] pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F766E] focus:border-[#0F766E]"
              />
            </div>

            <select
              aria-label="กรองตามหมวดหมู่"
              value={categoryFilter}
              onChange={(e) => onChangeCategoryFilter(e.target.value)}
              className="min-h-[38px] px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0F766E] focus:border-[#0F766E]"
            >
              <option value="all">ทุกหมวดหมู่</option>
              {allCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="divide-y divide-slate-100" aria-busy="true" aria-label="กำลังโหลดข้อมูล">
          {[1, 2, 3, 4].map((row) => (
            <div key={row} className="px-5 py-3.5 flex items-center justify-between gap-4">
              <div className="space-y-1.5 flex-1">
                <div className="h-4 w-40 bg-slate-100 rounded animate-pulse" />
                <div className="h-3 w-56 bg-slate-100 rounded animate-pulse" />
              </div>
              <div className="h-4 w-24 bg-slate-100 rounded animate-pulse" />
            </div>
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <div className="py-12 px-6 text-center space-y-3">
          <p className="text-sm font-medium text-slate-700">
            {hasFilters
              ? 'ไม่พบรายการที่ตรงกับเงื่อนไขการค้นหา'
              : 'ยังไม่มีรายการรายรับ-รายจ่ายในเดือนนี้'}
          </p>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {hasFilters
              ? 'ลองล้างตัวกรองหรือเปลี่ยนคำค้นหาเพื่อดูรายการทั้งหมดในเดือนนี้'
              : 'เริ่มต้นบันทึกรายรับหรือรายจ่ายรายการแรกของเดือน เพื่อดูสรุปยอดและกราฟวิเคราะห์อัตโนมัติ'}
          </p>
          <div className="pt-1 flex items-center justify-center gap-2">
            {hasFilters ? (
              <button
                type="button"
                onClick={() => {
                  onChangeTypeFilter('all');
                  onChangeCategoryFilter('all');
                  onChangeSearchQuery('');
                }}
                className="min-h-[38px] px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-medium text-slate-700 cursor-pointer"
              >
                ล้างตัวกรองทั้งหมด
              </button>
            ) : (
              <button
                type="button"
                onClick={onAddNew}
                className="min-h-[40px] px-4 py-2 rounded-lg bg-[#0F766E] hover:bg-[#0D655E] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
                <span>บันทึกรายการแรกของเดือนนี้</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-500">
                <th scope="col" className="py-2.5 pl-5 pr-3 whitespace-nowrap">วันที่</th>
                <th scope="col" className="py-2.5 px-3 whitespace-nowrap">หมวดหมู่และบันทึก</th>
                <th scope="col" className="py-2.5 px-3 whitespace-nowrap">ประเภท</th>
                <th scope="col" className="py-2.5 px-3 text-right whitespace-nowrap">จำนวนเงิน</th>
                <th scope="col" className="py-2.5 pl-3 pr-5 text-right whitespace-nowrap">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {(compact ? transactions.slice(0, 8) : transactions).map((tx) => {
                const isIncome = tx.type === 'income';
                const labelName = tx.note || tx.category;
                return (
                  <tr
                    key={tx.id}
                    className="hover:bg-slate-50/80 transition-colors group"
                  >
                    <td className="py-3 pl-5 pr-3 text-xs text-slate-500 font-mono-tabular whitespace-nowrap">
                      {formatThaiDate(tx.date)}
                    </td>
                    <td className="py-3 px-3 min-w-[200px]">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-slate-900">
                          {tx.category}
                        </span>
                        {tx.note && (
                          <span className="text-xs text-slate-500 line-clamp-1">
                            {tx.note}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-medium ${
                          isIncome ? 'text-[#16A34A]' : 'text-[#DC2626]'
                        }`}
                      >
                        {isIncome ? (
                          <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
                        ) : (
                          <ArrowDownLeft className="w-3.5 h-3.5" aria-hidden="true" />
                        )}
                        {isIncome ? 'รายรับ' : 'รายจ่าย'}
                      </span>
                    </td>
                    <td
                      className={`py-3 px-3 text-right font-mono-tabular font-semibold whitespace-nowrap ${
                        isIncome ? 'text-[#16A34A]' : 'text-[#DC2626]'
                      }`}
                    >
                      {formatTHB(isIncome ? tx.amount : -tx.amount, true)}
                    </td>
                    <td className="py-3 pl-3 pr-5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onEdit(tx)}
                          aria-label={`แก้ไขรายการ ${labelName}`}
                          className="p-2 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(tx)}
                          aria-label={`ลบรายการ ${labelName}`}
                          className="p-2 rounded-lg text-slate-400 hover:text-[#DC2626] hover:bg-red-50 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
