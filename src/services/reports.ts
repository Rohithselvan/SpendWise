/** Report assembly built entirely from the central calculation functions. */
import type { Budget, DateRange, ISODate, Transaction, TxType } from '@/types';
import { TX_TYPES } from '@/types';
import {
  averageDaily,
  categoryBreakdown,
  comparisonRanges,
  computeTotals,
  coverage,
  dailySeries,
  inRange,
  largestTransactions,
  monthlySeries,
  paymentMethodBreakdown,
  percentChange,
  trackedDays,
  weeklySeries,
  type BreakdownRow,
  type CoverageStatus,
  type PeriodKind,
  type SeriesContext,
  type SeriesPoint,
  type Totals,
} from './calculations';
import { daysInRange, monthKey, shiftMonthKey } from '@/lib/dates';
import type { PaymentMethod } from '@/types';

export interface TypeComparison {
  current: number;
  previous: number;
  change: number | null;
}

export interface PeriodReport {
  range: DateRange;
  kind: PeriodKind;
  totals: Totals;
  comparison: {
    ranges: ReturnType<typeof comparisonRanges>;
    previousCoverage: CoverageStatus;
    byType: Record<TxType, TypeComparison>;
  };
  currentCoverage: CoverageStatus;
  categories: BreakdownRow[];
  paymentMethods: BreakdownRow<PaymentMethod>[];
  daily: SeriesPoint[];
  weekly: SeriesPoint[];
  monthly: SeriesPoint[];
  highestExpense: Transaction | null;
  largestExpenses: Transaction[];
  averageDailyExpense: number | null;
  trackedDays: number;
  txs: Transaction[];
}

/** Months ending at the range's end month (inclusive), oldest first. */
export function trailingMonthKeys(endISO: ISODate, count: number): string[] {
  const last = monthKey(endISO);
  const out: string[] = [];
  for (let i = count - 1; i >= 0; i--) out.push(shiftMonthKey(last, -i));
  return out;
}

export function buildPeriodReport(
  allTxs: readonly Transaction[],
  range: DateRange,
  kind: PeriodKind,
  ctx: SeriesContext,
): PeriodReport {
  const txs = inRange(allTxs, range);
  const totals = computeTotals(txs);
  const ranges = comparisonRanges(range, kind, ctx.today);
  const curCmp = computeTotals(inRange(allTxs, ranges.current));
  const prevCmp = computeTotals(inRange(allTxs, ranges.previous));
  const previousCoverage = coverage(ranges.previous, ctx);

  const byType = Object.fromEntries(
    TX_TYPES.map((t) => [
      t,
      {
        current: curCmp[t],
        previous: prevCmp[t],
        change: previousCoverage === 'none' ? null : percentChange(curCmp[t], prevCmp[t]),
      },
    ]),
  ) as Record<TxType, TypeComparison>;

  const days = trackedDays(range, ctx);
  const monthCount = kind === 'year' ? 12 : Math.min(12, Math.max(6, Math.ceil(daysInRange(range) / 30)));
  const largest = largestTransactions(txs, 'expense', 5);

  return {
    range,
    kind,
    totals,
    comparison: { ranges, previousCoverage, byType },
    currentCoverage: coverage(range, ctx),
    categories: categoryBreakdown(txs, 'expense'),
    paymentMethods: paymentMethodBreakdown(txs, 'expense'),
    daily: daysInRange(range) <= 62 ? dailySeries(txs, range, ctx) : [],
    weekly: daysInRange(range) <= 186 ? weeklySeries(txs, range, ctx) : [],
    monthly: monthlySeries(allTxs, trailingMonthKeys(range.end, monthCount), ctx),
    highestExpense: largest[0] ?? null,
    largestExpenses: largest,
    averageDailyExpense: averageDaily(totals.expense, days),
    trackedDays: days,
    txs,
  };
}

// ---------- Budgets ----------

export interface BudgetStatus {
  budget: Budget;
  spentPaise: number;
  remainingPaise: number;
  /** Percentage used, one decimal. */
  percentUsed: number;
  over: boolean;
}

/** Evaluate budgets against expenses within a month. Only expenses count toward budgets. */
export function evaluateBudgets(budgets: readonly Budget[], monthTxs: readonly Transaction[]): BudgetStatus[] {
  const expenses = monthTxs.filter((t) => t.type === 'expense');
  return budgets
    .map((budget) => {
      const spent =
        budget.scope === 'overall'
          ? expenses.reduce((s, t) => s + t.amountPaise, 0)
          : expenses.filter((t) => t.categoryId === budget.categoryId).reduce((s, t) => s + t.amountPaise, 0);
      return {
        budget,
        spentPaise: spent,
        remainingPaise: budget.amountPaise - spent,
        percentUsed: Math.round((spent * 1000) / budget.amountPaise) / 10,
        over: spent > budget.amountPaise,
      };
    })
    .sort((a, b) => (a.budget.scope === 'overall' ? -1 : b.budget.scope === 'overall' ? 1 : b.percentUsed - a.percentUsed));
}
