import {
  BLUEPRINT_LIMITS,
  CATEGORY_PALETTE,
  type CategoryBreakdownItem,
  type DailyCashflowPoint,
  type MonthlyBudget,
  type MonthlySummary,
  type MonthlyTrendPoint,
  type Transaction,
  type TransactionInput,
  type TransactionType,
} from '../types/finance';

const THAI_MONTHS_SHORT = [
  'ม.ค.',
  'ก.พ.',
  'มี.ค.',
  'เม.ย.',
  'พ.ค.',
  'มิ.ย.',
  'ก.ค.',
  'ส.ค.',
  'ก.ย.',
  'ต.ค.',
  'พ.ย.',
  'ธ.ค.',
];

const THAI_MONTHS_FULL = [
  'มกราคม',
  'กุมภาพันธ์',
  'มีนาคม',
  'เมษายน',
  'พฤษภาคม',
  'มิถุนายน',
  'กรกฎาคม',
  'สิงหาคม',
  'กันยายน',
  'ตุลาคม',
  'พฤศจิกายน',
  'ธันวาคม',
];

export interface ValidationResult {
  valid: boolean;
  errors: Partial<Record<keyof TransactionInput, string>>;
}

export function deriveMonthKey(date: string): string {
  if (!BLUEPRINT_LIMITS.DATE_REGEX.test(date)) {
    return '';
  }
  return date.slice(0, 7);
}

export function getCurrentMonthKey(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function getTodayDateString(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function shiftMonthKey(monthKey: string, deltaMonths: number): string {
  if (!BLUEPRINT_LIMITS.MONTH_KEY_REGEX.test(monthKey)) {
    return getCurrentMonthKey();
  }
  const [yearStr, monthStr] = monthKey.split('-');
  const date = new Date(Number(yearStr), Number(monthStr) - 1 + deltaMonths, 1);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function formatThaiMonth(monthKey: string, short = false): string {
  if (!BLUEPRINT_LIMITS.MONTH_KEY_REGEX.test(monthKey)) {
    return monthKey;
  }
  const [yearStr, monthStr] = monthKey.split('-');
  const monthIndex = Number(monthStr) - 1;
  const buddhistYear = Number(yearStr) + 543;
  if (short) {
    return `${THAI_MONTHS_SHORT[monthIndex]} ${String(buddhistYear).slice(-2)}`;
  }
  return `${THAI_MONTHS_FULL[monthIndex]} ${buddhistYear}`;
}

export function formatThaiDate(dateStr: string): string {
  if (!BLUEPRINT_LIMITS.DATE_REGEX.test(dateStr)) {
    return dateStr;
  }
  const [yearStr, monthStr, dayStr] = dateStr.split('-');
  const monthIndex = Number(monthStr) - 1;
  const buddhistYear = Number(yearStr) + 543;
  return `${Number(dayStr)} ${THAI_MONTHS_SHORT[monthIndex]} ${buddhistYear}`;
}

export function formatTHB(amount: number, showSign = false): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  const absFormatted = new Intl.NumberFormat('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(safe));

  if (showSign) {
    if (safe > 0) return `+฿${absFormatted}`;
    if (safe < 0) return `-฿${absFormatted}`;
  } else if (safe < 0) {
    return `-฿${absFormatted}`;
  }
  return `฿${absFormatted}`;
}

export function validateTransactionInput(input: TransactionInput): ValidationResult {
  const errors: Partial<Record<keyof TransactionInput, string>> = {};

  if (input.type !== 'income' && input.type !== 'expense') {
    errors.type = 'กรุณาเลือกประเภทรายการ';
  }

  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    errors.amount = 'จำนวนเงินต้องมากกว่า 0 บาท';
  } else if (input.amount > BLUEPRINT_LIMITS.MAX_AMOUNT) {
    errors.amount = 'จำนวนเงินต้องไม่เกิน 100,000,000 บาท';
  }

  const trimmedCategory = input.category.trim();
  if (trimmedCategory.length < BLUEPRINT_LIMITS.MIN_CATEGORY_LEN) {
    errors.category = 'กรุณาเลือกหรือระบุหมวดหมู่';
  } else if (trimmedCategory.length > BLUEPRINT_LIMITS.MAX_CATEGORY_LEN) {
    errors.category = `หมวดหมู่ต้องไม่เกิน ${BLUEPRINT_LIMITS.MAX_CATEGORY_LEN} ตัวอักษร`;
  }

  if (input.note.trim().length > BLUEPRINT_LIMITS.MAX_NOTE_LEN) {
    errors.note = `บันทึกเพิ่มเติมต้องไม่เกิน ${BLUEPRINT_LIMITS.MAX_NOTE_LEN} ตัวอักษร`;
  }

  if (!BLUEPRINT_LIMITS.DATE_REGEX.test(input.date)) {
    errors.date = 'รูปแบบวันที่ไม่ถูกต้อง (YYYY-MM-DD)';
  } else {
    const [y, m, d] = input.date.split('-').map(Number);
    const parsed = new Date(y, m - 1, d);
    if (
      parsed.getFullYear() !== y ||
      parsed.getMonth() !== m - 1 ||
      parsed.getDate() !== d
    ) {
      errors.date = 'วันที่ไม่อยู่ในปฏิทินจริง';
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function sanitizeTransactionInput(input: TransactionInput): TransactionInput {
  return {
    type: input.type,
    amount: Math.round(input.amount * 100) / 100,
    category: input.category.trim().slice(0, BLUEPRINT_LIMITS.MAX_CATEGORY_LEN),
    note: input.note.trim().slice(0, BLUEPRINT_LIMITS.MAX_NOTE_LEN),
    date: input.date,
  };
}

export interface TransactionFilterOptions {
  monthKey?: string;
  type?: 'all' | TransactionType;
  category?: string;
  searchQuery?: string;
}

export function filterTransactions(
  transactions: readonly Transaction[],
  options: TransactionFilterOptions
): Transaction[] {
  const query = (options.searchQuery ?? '').trim().toLowerCase();

  return transactions
    .filter((tx) => {
      if (options.monthKey && tx.monthKey !== options.monthKey) return false;
      if (options.type && options.type !== 'all' && tx.type !== options.type) return false;
      if (options.category && options.category !== 'all' && tx.category !== options.category) {
        return false;
      }
      if (query) {
        const hay = `${tx.category} ${tx.note} ${tx.date} ${tx.amount}`.toLowerCase();
        if (!hay.includes(query)) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      return b.id.localeCompare(a.id);
    });
}

export function resolveMonthBudgetLimit(
  monthKey: string,
  monthlyBudgets: readonly MonthlyBudget[],
  defaultMonthlyBudget: number
): number {
  const override = monthlyBudgets.find((b) => b.monthKey === monthKey);
  if (override) return override.limitAmount;
  return Math.max(0, defaultMonthlyBudget);
}

export function computeMonthlySummary(
  transactions: readonly Transaction[],
  monthKey: string,
  budgetLimit: number
): MonthlySummary {
  const monthly = transactions.filter((tx) => tx.monthKey === monthKey);

  let totalIncome = 0;
  let totalExpense = 0;
  let incomeCount = 0;
  let expenseCount = 0;

  for (const tx of monthly) {
    if (tx.type === 'income') {
      totalIncome += tx.amount;
      incomeCount += 1;
    } else {
      totalExpense += tx.amount;
      expenseCount += 1;
    }
  }

  totalIncome = Math.round(totalIncome * 100) / 100;
  totalExpense = Math.round(totalExpense * 100) / 100;
  const netBalance = Math.round((totalIncome - totalExpense) * 100) / 100;

  const savingsRate =
    totalIncome > 0
      ? Math.round(((totalIncome - totalExpense) / totalIncome) * 1000) / 10
      : totalExpense > 0
        ? -100
        : 0;

  const safeBudget = Math.max(0, budgetLimit);
  const budgetUsedPercent =
    safeBudget > 0 ? Math.round((totalExpense / safeBudget) * 1000) / 10 : 0;

  return {
    monthKey,
    totalIncome,
    totalExpense,
    netBalance,
    savingsRate,
    transactionCount: monthly.length,
    incomeCount,
    expenseCount,
    budgetLimit: safeBudget,
    budgetUsedPercent,
    isOverBudget: safeBudget > 0 && totalExpense > safeBudget,
    isNearBudget: safeBudget > 0 && budgetUsedPercent >= 80 && totalExpense <= safeBudget,
  };
}

export function computeCategoryBreakdown(
  transactions: readonly Transaction[],
  type: TransactionType
): CategoryBreakdownItem[] {
  const filtered = transactions.filter((tx) => tx.type === type);
  const totals = new Map<string, { amount: number; count: number }>();

  let grandTotal = 0;
  for (const tx of filtered) {
    grandTotal += tx.amount;
    const prev = totals.get(tx.category) ?? { amount: 0, count: 0 };
    totals.set(tx.category, {
      amount: prev.amount + tx.amount,
      count: prev.count + 1,
    });
  }

  if (grandTotal <= 0) return [];

  return Array.from(totals.entries())
    .sort((a, b) => b[1].amount - a[1].amount)
    .map(([category, data], idx) => ({
      category,
      amount: Math.round(data.amount * 100) / 100,
      percentage: Math.round((data.amount / grandTotal) * 1000) / 10,
      count: data.count,
      color: CATEGORY_PALETTE[idx % CATEGORY_PALETTE.length],
    }));
}

export function computeSixMonthTrend(
  transactions: readonly Transaction[],
  anchorMonthKey: string
): MonthlyTrendPoint[] {
  const points: MonthlyTrendPoint[] = [];

  for (let offset = -5; offset <= 0; offset += 1) {
    const mk = shiftMonthKey(anchorMonthKey, offset);
    let income = 0;
    let expense = 0;

    for (const tx of transactions) {
      if (tx.monthKey === mk) {
        if (tx.type === 'income') income += tx.amount;
        else expense += tx.amount;
      }
    }

    income = Math.round(income * 100) / 100;
    expense = Math.round(expense * 100) / 100;

    points.push({
      monthKey: mk,
      shortLabel: formatThaiMonth(mk, true),
      fullLabel: formatThaiMonth(mk, false),
      income,
      expense,
      net: Math.round((income - expense) * 100) / 100,
    });
  }

  return points;
}

export function computeDailyCashflow(
  transactions: readonly Transaction[],
  monthKey: string
): DailyCashflowPoint[] {
  if (!BLUEPRINT_LIMITS.MONTH_KEY_REGEX.test(monthKey)) {
    return [];
  }
  const [yearStr, monthStr] = monthKey.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const daysInMonth = new Date(year, month, 0).getDate();

  const dailyMap = new Map<number, { income: number; expense: number }>();
  for (const tx of transactions) {
    if (tx.monthKey !== monthKey) continue;
    const day = Number(tx.date.slice(8, 10));
    const curr = dailyMap.get(day) ?? { income: 0, expense: 0 };
    if (tx.type === 'income') curr.income += tx.amount;
    else curr.expense += tx.amount;
    dailyMap.set(day, curr);
  }

  const series: DailyCashflowPoint[] = [];
  let runningNet = 0;
  for (let day = 1; day <= daysInMonth; day += 1) {
    const entry = dailyMap.get(day) ?? { income: 0, expense: 0 };
    const income = Math.round(entry.income * 100) / 100;
    const expense = Math.round(entry.expense * 100) / 100;
    runningNet = Math.round((runningNet + income - expense) * 100) / 100;

    series.push({
      day,
      date: `${monthKey}-${String(day).padStart(2, '0')}`,
      income,
      expense,
      cumulativeNet: runningNet,
    });
  }

  return series;
}

function escapeCsvCell(value: string | number): string {
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function transactionsToCSV(transactions: readonly Transaction[]): string {
  const headers = ['วันที่', 'ประเภท', 'หมวดหมู่', 'จำนวนเงิน (บาท)', 'บันทึกเพิ่มเติม'];
  const rows = transactions.map((tx) => [
    escapeCsvCell(tx.date),
    escapeCsvCell(tx.type === 'income' ? 'รายรับ' : 'รายจ่าย'),
    escapeCsvCell(tx.category),
    escapeCsvCell(tx.amount.toFixed(2)),
    escapeCsvCell(tx.note),
  ]);
  // UTF-8 BOM ensures Thai characters render properly in Excel
  return '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}
