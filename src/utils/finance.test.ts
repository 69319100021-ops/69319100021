import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeCategoryBreakdown,
  computeDailyCashflow,
  computeMonthlySummary,
  computeSixMonthTrend,
  deriveMonthKey,
  filterTransactions,
  formatTHB,
  formatThaiMonth,
  shiftMonthKey,
  transactionsToCSV,
  validateTransactionInput,
} from './finance';
import type { Transaction } from '../types/finance';

const SAMPLE_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx-1',
    userId: 'u1',
    type: 'income',
    amount: 45000,
    category: 'เงินเดือน',
    note: 'เงินเดือนประจำ',
    date: '2026-11-01',
    monthKey: '2026-11',
  },
  {
    id: 'tx-2',
    userId: 'u1',
    type: 'expense',
    amount: 12000,
    category: 'ที่อยู่อาศัยและสาธารณูปโภค',
    note: 'ค่าเช่าคอนโด',
    date: '2026-11-02',
    monthKey: '2026-11',
  },
  {
    id: 'tx-3',
    userId: 'u1',
    type: 'expense',
    amount: 3000,
    category: 'อาหารและเครื่องดื่ม',
    note: 'ซุปเปอร์มาร์เก็ต',
    date: '2026-11-05',
    monthKey: '2026-11',
  },
  {
    id: 'tx-4',
    userId: 'u1',
    type: 'income',
    amount: 38000,
    category: 'เงินเดือน',
    note: 'เงินเดือน ต.ค.',
    date: '2026-10-01',
    monthKey: '2026-10',
  },
  {
    id: 'tx-5',
    userId: 'u1',
    type: 'expense',
    amount: 20000,
    category: 'อาหารและเครื่องดื่ม',
    note: 'ค่าใช้จ่าย ต.ค.',
    date: '2026-10-15',
    monthKey: '2026-10',
  },
];

test('validateTransactionInput enforces bounds and calendar dates', () => {
  const valid = validateTransactionInput({
    type: 'expense',
    amount: 150.5,
    category: 'อาหารและเครื่องดื่ม',
    note: 'กาแฟ',
    date: '2026-11-15',
  });
  assert.equal(valid.valid, true);

  const zeroAmount = validateTransactionInput({
    type: 'expense',
    amount: 0,
    category: 'อาหารและเครื่องดื่ม',
    note: '',
    date: '2026-11-15',
  });
  assert.equal(zeroAmount.valid, false);
  assert.ok(zeroAmount.errors.amount);

  const invalidDate = validateTransactionInput({
    type: 'income',
    amount: 500,
    category: 'เงินเดือน',
    note: '',
    date: '2026-02-30',
  });
  assert.equal(invalidDate.valid, false);
  assert.ok(invalidDate.errors.date);
});

test('deriveMonthKey and shiftMonthKey handle month rollovers', () => {
  assert.equal(deriveMonthKey('2026-11-15'), '2026-11');
  assert.equal(shiftMonthKey('2026-01', -1), '2025-12');
  assert.equal(shiftMonthKey('2026-12', 1), '2027-01');
  assert.equal(formatThaiMonth('2026-11', false), 'พฤศจิกายน 2569');
});

test('computeMonthlySummary calculates totals, savings rate, and budget status', () => {
  const summary = computeMonthlySummary(SAMPLE_TRANSACTIONS, '2026-11', 20000);
  assert.equal(summary.totalIncome, 45000);
  assert.equal(summary.totalExpense, 15000);
  assert.equal(summary.netBalance, 30000);
  assert.equal(summary.savingsRate, 66.7);
  assert.equal(summary.budgetUsedPercent, 75);
  assert.equal(summary.isNearBudget, false);
  assert.equal(summary.isOverBudget, false);

  const tightBudget = computeMonthlySummary(SAMPLE_TRANSACTIONS, '2026-11', 16000);
  assert.equal(tightBudget.isNearBudget, true);
  assert.equal(tightBudget.isOverBudget, false);

  const overBudget = computeMonthlySummary(SAMPLE_TRANSACTIONS, '2026-11', 10000);
  assert.equal(overBudget.isOverBudget, true);
});

test('computeCategoryBreakdown sorts descending and totals 100%', () => {
  const novTx = filterTransactions(SAMPLE_TRANSACTIONS, { monthKey: '2026-11' });
  const breakdown = computeCategoryBreakdown(novTx, 'expense');
  assert.equal(breakdown.length, 2);
  assert.equal(breakdown[0].category, 'ที่อยู่อาศัยและสาธารณูปโภค');
  assert.equal(breakdown[0].percentage, 80);
  assert.equal(breakdown[1].category, 'อาหารและเครื่องดื่ม');
  assert.equal(breakdown[1].percentage, 20);
});

test('computeSixMonthTrend returns 6 ordered months ending at anchor', () => {
  const trend = computeSixMonthTrend(SAMPLE_TRANSACTIONS, '2026-11');
  assert.equal(trend.length, 6);
  assert.equal(trend[0].monthKey, '2026-06');
  assert.equal(trend[4].monthKey, '2026-10');
  assert.equal(trend[4].income, 38000);
  assert.equal(trend[4].expense, 20000);
  assert.equal(trend[5].monthKey, '2026-11');
  assert.equal(trend[5].net, 30000);
});

test('computeDailyCashflow computes cumulative running net balance', () => {
  const daily = computeDailyCashflow(SAMPLE_TRANSACTIONS, '2026-11');
  assert.equal(daily.length, 30);
  assert.equal(daily[0].income, 45000);
  assert.equal(daily[0].cumulativeNet, 45000);
  assert.equal(daily[1].expense, 12000);
  assert.equal(daily[1].cumulativeNet, 33000);
  assert.equal(daily[4].cumulativeNet, 30000);
});

test('formatTHB and transactionsToCSV format accurately', () => {
  assert.equal(formatTHB(12500), '฿12,500.00');
  assert.equal(formatTHB(-500, true), '-฿500.00');

  const csv = transactionsToCSV([SAMPLE_TRANSACTIONS[0]]);
  assert.ok(csv.startsWith('\uFEFF'));
  assert.ok(csv.includes('2026-11-01,รายรับ,เงินเดือน,45000.00,เงินเดือนประจำ'));
});
