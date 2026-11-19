export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  category: string;
  note: string;
  date: string; // YYYY-MM-DD
  monthKey: string; // YYYY-MM
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface TransactionInput {
  type: TransactionType;
  amount: number;
  category: string;
  note: string;
  date: string; // YYYY-MM-DD
}

export interface MonthlyBudget {
  id: string; // YYYY-MM
  userId: string;
  monthKey: string; // YYYY-MM
  limitAmount: number;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  defaultMonthlyBudget: number;
  currency: 'THB';
}

export interface MonthlySummary {
  monthKey: string;
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  savingsRate: number; // percentage 0..100 or negative if deficit
  transactionCount: number;
  incomeCount: number;
  expenseCount: number;
  budgetLimit: number;
  budgetUsedPercent: number;
  isOverBudget: boolean;
  isNearBudget: boolean;
}

export interface CategoryBreakdownItem {
  category: string;
  amount: number;
  percentage: number;
  count: number;
  color: string;
}

export interface MonthlyTrendPoint {
  monthKey: string;
  shortLabel: string;
  fullLabel: string;
  income: number;
  expense: number;
  net: number;
}

export interface DailyCashflowPoint {
  day: number;
  date: string;
  income: number;
  expense: number;
  cumulativeNet: number;
}

export const BLUEPRINT_LIMITS = {
  MAX_AMOUNT: 100_000_000,
  MIN_CATEGORY_LEN: 1,
  MAX_CATEGORY_LEN: 60,
  MAX_NOTE_LEN: 200,
  MAX_NAME_LEN: 100,
  DATE_REGEX: /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/,
  MONTH_KEY_REGEX: /^[0-9]{4}-[0-9]{2}$/,
} as const;

export const INCOME_CATEGORIES: readonly string[] = [
  'เงินเดือน',
  'โบนัสและค่าล่วงเวลา',
  'รายได้เสริม / ฟรีแลนซ์',
  'เงินปันผลและดอกเบี้ย',
  'ขายสินค้า / ออนไลน์',
  'รายรับอื่นๆ',
];

export const EXPENSE_CATEGORIES: readonly string[] = [
  'อาหารและเครื่องดื่ม',
  'ค่าเดินทางและน้ำมัน',
  'ที่อยู่อาศัยและสาธารณูปโภค',
  'ช้อปปิ้งและของใช้ส่วนตัว',
  'สุขภาพและการแพทย์',
  'ความบันเทิงและท่องเที่ยว',
  'การศึกษาและพัฒนาตนเอง',
  'การออมและการลงทุน',
  'รายจ่ายอื่นๆ',
];

export const CATEGORY_PALETTE: readonly string[] = [
  '#0F766E',
  '#2563EB',
  '#D97706',
  '#DC2626',
  '#7C3AED',
  '#0891B2',
  '#4F46E5',
  '#EA580C',
  '#64748B',
];
