import { describe, expect, it } from 'vitest';
import { tx } from '@/test/factories';
import { averageOf } from './calculations';
import { buildDailyReport, canGoToNextDay, clampReportDate, compareDays, describeDayChange, mostUsedCategory, shiftReportDate } from './dailyReport';

const TODAY = '2026-11-04';
const YESTERDAY = '2026-11-03';
const ctx = { today: TODAY, trackingStart: '2026-10-01' };

const day = [
  tx({ date: TODAY, type: 'expense', amountPaise: 25000, categoryId: 'exp-food', paymentMethod: 'upi', createdAt: '2026-11-04T03:00:00.000Z' }),
  tx({ date: TODAY, type: 'expense', amountPaise: 20000, categoryId: 'exp-food', paymentMethod: 'cash', createdAt: '2026-11-04T05:00:00.000Z' }),
  tx({ date: TODAY, type: 'expense', amountPaise: 10000, categoryId: 'exp-transport', paymentMethod: 'upi', createdAt: '2026-11-04T06:00:00.000Z' }),
  tx({ date: TODAY, type: 'expense', amountPaise: 50000, categoryId: 'exp-petrol', paymentMethod: 'debit_card', createdAt: '2026-11-04T07:00:00.000Z' }),
  tx({ date: TODAY, type: 'expense', amountPaise: 35050, categoryId: 'exp-shopping', paymentMethod: 'debit_card', createdAt: '2026-11-04T08:00:00.000Z' }),
  tx({ date: TODAY, type: 'transfer', amountPaise: 500000, categoryId: 'tr-father', paymentMethod: 'upi', createdAt: '2026-11-04T09:00:00.000Z' }),
  tx({ date: TODAY, type: 'income', amountPaise: 300000, categoryId: 'inc-salary', paymentMethod: 'other', createdAt: '2026-11-04T09:30:00.000Z' }),
  tx({ date: TODAY, type: 'savings', amountPaise: 100000, categoryId: 'sav-general', paymentMethod: 'upi', createdAt: '2026-11-04T10:00:00.000Z' }),
  tx({ date: TODAY, type: 'investment', amountPaise: 200000, categoryId: 'inv-sip', paymentMethod: 'upi', createdAt: '2026-11-04T10:30:00.000Z' }),
];
const yesterday = [
  tx({ date: YESTERDAY, type: 'expense', amountPaise: 90000, categoryId: 'exp-food', paymentMethod: 'upi' }),
  tx({ date: YESTERDAY, type: 'transfer', amountPaise: 1000000, categoryId: 'tr-father' }),
];
const other = [tx({ date: '2026-11-02', type: 'expense', amountPaise: 777700 })];
const all = [...day, ...yesterday, ...other];

describe('daily totals', () => {
  it("calculates today's personal expenses from expenses only", () => {
    const r = buildDailyReport(all, TODAY, ctx);
    expect(r.totals.expense).toBe(25000 + 20000 + 10000 + 50000 + 35050);
    expect(r.totals.count).toBe(9);
    expect(r.txs).toHaveLength(9);
  });

  it("calculates the previous day's expenses without leaking other days", () => {
    const r = buildDailyReport(all, YESTERDAY, ctx);
    expect(r.totals.expense).toBe(90000);
    expect(r.totals.count).toBe(2);
  });

  it('keeps income and transfers separate from expenses', () => {
    const r = buildDailyReport(all, TODAY, ctx);
    expect(r.totals.income).toBe(300000);
    expect(r.totals.transfer).toBe(500000);
    expect(r.totals.expense).toBe(140050);
  });

  it('keeps savings and investments separate from expenses', () => {
    const r = buildDailyReport(all, TODAY, ctx);
    expect(r.totals.savings).toBe(100000);
    expect(r.totals.investment).toBe(200000);
    expect(r.totals.expense).toBe(140050);
  });

  it('lists the day newest-recorded first', () => {
    const r = buildDailyReport(all, TODAY, ctx);
    expect(r.txs[0]!.type).toBe('investment');
    expect(r.txs.at(-1)!.amountPaise).toBe(25000);
  });
});

describe('daily breakdowns', () => {
  it('breaks expenses down by category with counts and percentages', () => {
    const r = buildDailyReport(all, TODAY, ctx);
    expect(r.categories.map((c) => c.key)).toEqual(['exp-petrol', 'exp-food', 'exp-shopping', 'exp-transport']);
    const food = r.categories.find((c) => c.key === 'exp-food')!;
    expect(food).toMatchObject({ totalPaise: 45000, count: 2, percent: 32.1 });
    expect(r.categories.some((c) => c.key === 'tr-father' || c.key === 'inc-salary')).toBe(false);
  });

  it('totals payment methods for expenses only', () => {
    const r = buildDailyReport(all, TODAY, ctx);
    expect(r.insights.methodTotals).toEqual({ upi: 35000, debit_card: 85050, cash: 20000, other: 0 });
    // the ₹5,000 UPI transfer and UPI savings/investment are not spending
    expect(r.paymentMethods.reduce((s, p) => s + p.totalPaise, 0)).toBe(r.totals.expense);
  });
});

describe('daily insights', () => {
  it('finds the highest expense and ignores larger non-expense records', () => {
    const r = buildDailyReport(all, TODAY, ctx);
    expect(r.insights.highestExpense?.amountPaise).toBe(50000);
    expect(r.insights.highestExpense?.type).toBe('expense');
  });

  it('averages per expense transaction in integer paise', () => {
    const r = buildDailyReport(all, TODAY, ctx);
    expect(r.insights.expenseCount).toBe(5);
    expect(r.insights.averageExpense).toBe(28010); // 140050 / 5
    expect(Number.isInteger(averageOf(10001, 3))).toBe(true);
    expect(averageOf(10001, 3)).toBe(3334);
  });

  it('picks the most-used category by count, breaking ties by amount', () => {
    const r = buildDailyReport(all, TODAY, ctx);
    expect(r.insights.mostUsedCategory?.key).toBe('exp-food');
    expect(mostUsedCategory([])).toBeNull();
    const tie = buildDailyReport([tx({ date: TODAY, amountPaise: 100, categoryId: 'a' }), tx({ date: TODAY, amountPaise: 900, categoryId: 'b' })], TODAY, ctx);
    expect(tie.insights.mostUsedCategory?.key).toBe('b');
  });
});

describe('day-to-day comparison', () => {
  it('compares with the previous day', () => {
    const c = compareDays(all, TODAY, ctx);
    expect(c).toMatchObject({ previousDate: YESTERDAY, current: 140050, previous: 90000, difference: 50050, direction: 'up', percent: 55.6 });
    expect(describeDayChange(c)).toBe('Increase: ₹500.50 (55.6%)');
  });

  it('matches the spec example (₹1,200 vs ₹900 → +₹300, 33.3%)', () => {
    const txs = [tx({ date: TODAY, amountPaise: 120000 }), tx({ date: YESTERDAY, amountPaise: 90000 })];
    const c = compareDays(txs, TODAY, ctx);
    expect(c.difference).toBe(30000);
    expect(c.percent).toBe(33.3);
    expect(describeDayChange(c)).toBe('Increase: ₹300 (33.3%)');
  });

  it('reports decreases', () => {
    const c = compareDays([tx({ date: TODAY, amountPaise: 45000 }), tx({ date: YESTERDAY, amountPaise: 90000 })], TODAY, ctx);
    expect(c).toMatchObject({ difference: -45000, percent: -50, direction: 'down' });
    expect(describeDayChange(c)).toBe('Decrease: ₹450 (50%)');
  });

  it('never produces Infinity or NaN when the previous day is ₹0', () => {
    const up = compareDays([tx({ date: TODAY, amountPaise: 50000 })], TODAY, ctx);
    expect(up.percent).toBeNull();
    expect(describeDayChange(up)).toBe('Increase: ₹500 (no spending the previous day)');
    const none = compareDays([], TODAY, ctx);
    expect(none).toMatchObject({ current: 0, previous: 0, difference: 0, percent: null, direction: 'same' });
    expect(describeDayChange(none)).toBe('No spending on either day');
    for (const s of [describeDayChange(up), describeDayChange(none)]) expect(s).not.toMatch(/NaN|Infinity/);
  });

  it('flags a previous day before records began', () => {
    expect(compareDays(all, '2026-10-01', ctx).previousCoverage).toBe('none');
    expect(compareDays(all, TODAY, ctx).previousCoverage).toBe('full');
  });
});

describe('empty days', () => {
  it('returns zeros and null insights instead of misleading numbers', () => {
    const r = buildDailyReport(all, '2026-10-20', ctx);
    expect(r.totals).toEqual({ expense: 0, income: 0, transfer: 0, savings: 0, investment: 0, count: 0 });
    expect(r.categories).toEqual([]);
    expect(r.insights).toEqual({
      highestExpense: null,
      mostUsedCategory: null,
      expenseCount: 0,
      averageExpense: null,
      methodTotals: { upi: 0, debit_card: 0, cash: 0, other: 0 },
    });
    expect(r.coverage).toBe('full');
  });

  it('gives no expense insights for a day with only a transfer', () => {
    const r = buildDailyReport([tx({ date: TODAY, type: 'transfer', amountPaise: 500000, categoryId: 'tr-father' })], TODAY, ctx);
    expect(r.totals.transfer).toBe(500000);
    expect(r.totals.expense).toBe(0);
    expect(r.insights.averageExpense).toBeNull();
    expect(r.insights.highestExpense).toBeNull();
  });

  it('marks days with no records at all', () => {
    expect(buildDailyReport([], TODAY, { today: TODAY, trackingStart: null }).coverage).toBe('none');
  });
});

describe('date navigation', () => {
  it('moves back and forward a day', () => {
    expect(shiftReportDate(TODAY, -1, TODAY)).toBe(YESTERDAY);
    expect(shiftReportDate(YESTERDAY, 1, TODAY)).toBe(TODAY);
    expect(shiftReportDate('2026-03-01', -1, TODAY)).toBe('2026-02-28');
    expect(shiftReportDate('2026-01-01', -1, TODAY)).toBe('2025-12-31');
  });

  it('never moves past today', () => {
    expect(shiftReportDate(TODAY, 1, TODAY)).toBe(TODAY);
    expect(canGoToNextDay(TODAY, TODAY)).toBe(false);
    expect(canGoToNextDay(YESTERDAY, TODAY)).toBe(true);
  });

  it('clamps picked dates to valid, non-future days', () => {
    expect(clampReportDate('2027-01-01', TODAY)).toBe(TODAY);
    expect(clampReportDate('2026-02-30', TODAY)).toBe(TODAY);
    expect(clampReportDate('', TODAY)).toBe(TODAY);
    expect(clampReportDate('2025-06-15', TODAY)).toBe('2025-06-15');
  });
});
