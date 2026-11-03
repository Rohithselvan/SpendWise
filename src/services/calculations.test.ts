import { describe, expect, it } from 'vitest';
import { tx } from '@/test/factories';
import {
  averageDaily,
  categoryBreakdown,
  comparisonRanges,
  computeTotals,
  coverage,
  dailySeries,
  monthlySeries,
  paymentMethodBreakdown,
  percentChange,
  totalByType,
  trackedDays,
  weeklySeries,
} from './calculations';
import { buildPeriodReport, evaluateBudgets } from './reports';

const mixed = [
  tx({ type: 'expense', amountPaise: 25050, categoryId: 'exp-food', paymentMethod: 'upi' }),
  tx({ type: 'expense', amountPaise: 100000, categoryId: 'exp-petrol', paymentMethod: 'debit_card' }),
  tx({ type: 'transfer', amountPaise: 4500000, categoryId: 'tr-father' }),
  tx({ type: 'income', amountPaise: 5000000, categoryId: 'inc-salary' }),
  tx({ type: 'income', amountPaise: 5000, categoryId: 'inc-cashback' }),
  tx({ type: 'savings', amountPaise: 200000, categoryId: 'sav-general' }),
  tx({ type: 'investment', amountPaise: 300000, categoryId: 'inv-sip' }),
];

describe('totals', () => {
  it('sums only expenses as personal spending', () => {
    expect(totalByType(mixed, 'expense')).toBe(125050);
    expect(computeTotals(mixed).expense).toBe(125050);
  });
  it('excludes transfers from expenses and totals them separately', () => {
    const t = computeTotals(mixed);
    expect(t.transfer).toBe(4500000);
    expect(t.expense).not.toBeGreaterThan(125050);
  });
  it('calculates income separately', () => {
    expect(computeTotals(mixed).income).toBe(5005000);
  });
  it('excludes savings and investments from expenses', () => {
    const t = computeTotals(mixed);
    expect(t.savings).toBe(200000);
    expect(t.investment).toBe(300000);
    expect(t.expense).toBe(125050);
    expect(t.count).toBe(7);
  });
  it('never double-counts a repeated record', () => {
    const dup = [mixed[0]!, mixed[0]!];
    expect(computeTotals(dup).expense).toBe(25050);
    expect(computeTotals(dup).count).toBe(1);
  });
});

describe('breakdowns', () => {
  it('builds category breakdown sorted by amount with percentages', () => {
    const rows = categoryBreakdown([...mixed, tx({ amountPaise: 24950, categoryId: 'exp-food' })]);
    expect(rows.map((r) => r.key)).toEqual(['exp-petrol', 'exp-food']);
    expect(rows[0]).toMatchObject({ totalPaise: 100000, count: 1, percent: 66.7 });
    expect(rows[1]).toMatchObject({ totalPaise: 50000, count: 2, percent: 33.3 });
  });
  it('builds payment method breakdown for expenses only', () => {
    const rows = paymentMethodBreakdown(mixed);
    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.key === 'upi')?.totalPaise).toBe(25050);
    expect(rows.find((r) => r.key === 'debit_card')?.totalPaise).toBe(100000);
  });
});

describe('comparisons', () => {
  it('computes percentage change', () => {
    expect(percentChange(1250000, 1000000)).toBe(25);
    expect(percentChange(500, 1000)).toBe(-50);
    expect(percentChange(500, 0)).toBeNull();
  });
  it('compares an in-progress month with the same days of last month', () => {
    const r = comparisonRanges({ start: '2026-11-01', end: '2026-11-30' }, 'month', '2026-11-10');
    expect(r.partial).toBe(true);
    expect(r.current).toEqual({ start: '2026-11-01', end: '2026-11-10' });
    expect(r.previous).toEqual({ start: '2026-10-01', end: '2026-10-10' });
  });
  it('clamps to shorter previous months', () => {
    const r = comparisonRanges({ start: '2026-03-01', end: '2026-03-31' }, 'month', '2026-03-30');
    expect(r.previous).toEqual({ start: '2026-02-01', end: '2026-02-28' });
  });
  it('compares complete months in full', () => {
    const r = comparisonRanges({ start: '2026-10-01', end: '2026-10-31' }, 'month', '2026-11-03');
    expect(r.partial).toBe(false);
    expect(r.previous).toEqual({ start: '2026-09-01', end: '2026-09-30' });
  });
  it('uses the preceding equal-length window for custom ranges', () => {
    const r = comparisonRanges({ start: '2026-10-11', end: '2026-10-20' }, 'custom', '2026-11-03');
    expect(r.previous).toEqual({ start: '2026-10-01', end: '2026-10-10' });
  });
  it('builds a monthly summary with previous-month comparison', () => {
    const all = [
      tx({ date: '2026-09-05', amountPaise: 1000000 }),
      tx({ date: '2026-10-05', amountPaise: 1250000 }),
      tx({ date: '2026-10-06', type: 'transfer', amountPaise: 4500000, categoryId: 'tr-father' }),
    ];
    const rep = buildPeriodReport(all, { start: '2026-10-01', end: '2026-10-31' }, 'month', { today: '2026-11-03', trackingStart: '2026-09-05' });
    expect(rep.totals.expense).toBe(1250000);
    expect(rep.totals.transfer).toBe(4500000);
    expect(rep.comparison.byType.expense).toEqual({ current: 1250000, previous: 1000000, change: 25 });
    expect(rep.highestExpense?.amountPaise).toBe(1250000);
    expect(rep.averageDailyExpense).toBe(Math.round(1250000 / 31));
  });
  it('does not show a change when the previous period has no records', () => {
    const all = [tx({ date: '2026-10-05', amountPaise: 1000 })];
    const rep = buildPeriodReport(all, { start: '2026-10-01', end: '2026-10-31' }, 'month', { today: '2026-11-03', trackingStart: '2026-10-05' });
    expect(rep.comparison.previousCoverage).toBe('none');
    expect(rep.comparison.byType.expense.change).toBeNull();
  });
});

describe('series distinguish no data, ₹0 and future', () => {
  const ctx = { today: '2026-11-05', trackingStart: '2026-11-02' };
  it('daily series', () => {
    const s = dailySeries([tx({ date: '2026-11-03', amountPaise: 500 })], { start: '2026-11-01', end: '2026-11-07' }, ctx);
    expect(s.map((p) => p.status)).toEqual(['untracked', 'zero', 'recorded', 'zero', 'zero', 'future', 'future']);
    expect(s[0]!.totalPaise).toBeNull();
    expect(s[1]!.totalPaise).toBe(0);
    expect(s[2]!.totalPaise).toBe(500);
    expect(s[6]!.totalPaise).toBeNull();
  });
  it('weekly series clips to range and marks future weeks', () => {
    const s = weeklySeries([tx({ date: '2026-11-03', amountPaise: 500 })], { start: '2026-11-01', end: '2026-11-30' }, ctx);
    expect(s[0]).toMatchObject({ start: '2026-11-01', end: '2026-11-01', status: 'untracked' });
    expect(s[1]).toMatchObject({ start: '2026-11-02', end: '2026-11-08', totalPaise: 500 });
    expect(s.at(-1)!.status).toBe('future');
  });
  it('monthly series', () => {
    const s = monthlySeries([tx({ date: '2026-11-03', amountPaise: 500 })], ['2026-10', '2026-11', '2026-12'], ctx);
    expect(s.map((p) => p.status)).toEqual(['untracked', 'recorded', 'future']);
  });
  it('coverage and average daily', () => {
    expect(coverage({ start: '2026-11-01', end: '2026-11-30' }, ctx)).toBe('partial');
    expect(coverage({ start: '2026-10-01', end: '2026-10-31' }, ctx)).toBe('none');
    expect(trackedDays({ start: '2026-11-01', end: '2026-11-30' }, ctx)).toBe(4);
    expect(averageDaily(1000, 4)).toBe(250);
    expect(averageDaily(1000, 0)).toBeNull();
  });
});

describe('budgets', () => {
  it('counts only expenses toward budgets', () => {
    const now = '2026-11-01T00:00:00.000Z';
    const res = evaluateBudgets(
      [
        { id: 'b1', scope: 'overall', categoryId: null, amountPaise: 100000, createdAt: now, updatedAt: now },
        { id: 'b2', scope: 'category', categoryId: 'exp-food', amountPaise: 20000, createdAt: now, updatedAt: now },
      ],
      mixed,
    );
    expect(res[0]).toMatchObject({ spentPaise: 125050, remainingPaise: -25050, over: true });
    expect(res[1]).toMatchObject({ spentPaise: 25050, percentUsed: 125.3, over: true });
  });
});
