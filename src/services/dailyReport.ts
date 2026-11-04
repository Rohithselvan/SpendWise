/**
 * Daily report assembly. Built entirely from the central calculation functions so the
 * numbers always agree with the monthly/yearly reports and the Overview screen.
 *
 * Personal spending = type === 'expense' only. Income, transfers, savings and investments
 * are each reported separately and never mixed into expense totals. All amounts are integer paise.
 */
import type { DateRange, ISODate, PaymentMethod, Transaction } from '@/types';
import { addDaysISO, isValidISODate } from '@/lib/dates';
import { formatINR } from '@/lib/money';
import {
  averageOf,
  categoryBreakdown,
  computeTotals,
  coverage,
  inRange,
  largestTransactions,
  paymentMethodBreakdown,
  percentChange,
  type BreakdownRow,
  type CoverageStatus,
  type SeriesContext,
  type Totals,
} from './calculations';
import { sortTransactions } from './filters';

export type ChangeDirection = 'up' | 'down' | 'same';

export interface DayComparison {
  previousDate: ISODate;
  /** Personal expenses on the selected day. */
  current: number;
  /** Personal expenses on the previous day. */
  previous: number;
  /** current − previous, in paise (negative when spending fell). */
  difference: number;
  /** Percentage change, one decimal. Null when the previous day had ₹0 (change is undefined). */
  percent: number | null;
  direction: ChangeDirection;
  /** Whether the previous day falls inside the period you have records for. */
  previousCoverage: CoverageStatus;
}

export interface DailyInsights {
  highestExpense: Transaction | null;
  /** Category with the most expense transactions (ties broken by amount). */
  mostUsedCategory: BreakdownRow | null;
  expenseCount: number;
  /** Average expense per expense transaction, rounded paise. Null when there are no expenses. */
  averageExpense: number | null;
  methodTotals: Record<PaymentMethod, number>;
}

export interface DailyReport {
  date: ISODate;
  totals: Totals;
  coverage: CoverageStatus;
  categories: BreakdownRow[];
  paymentMethods: BreakdownRow<PaymentMethod>[];
  insights: DailyInsights;
  comparison: DayComparison;
  /** Every transaction recorded on this day, newest recorded first. */
  txs: Transaction[];
}

function dayRange(date: ISODate): DateRange {
  return { start: date, end: date };
}

/** Category with the highest transaction count. Rows arrive sorted by amount, so the first max wins ties. */
export function mostUsedCategory(rows: readonly BreakdownRow[]): BreakdownRow | null {
  let best: BreakdownRow | null = null;
  for (const r of rows) if (!best || r.count > best.count) best = r;
  return best;
}

export function compareDays(allTxs: readonly Transaction[], date: ISODate, ctx: SeriesContext): DayComparison {
  const previousDate = addDaysISO(date, -1);
  const current = computeTotals(inRange(allTxs, dayRange(date))).expense;
  const previous = computeTotals(inRange(allTxs, dayRange(previousDate))).expense;
  const difference = current - previous;
  return {
    previousDate,
    current,
    previous,
    difference,
    percent: percentChange(current, previous),
    direction: difference > 0 ? 'up' : difference < 0 ? 'down' : 'same',
    previousCoverage: coverage(dayRange(previousDate), ctx),
  };
}

/** Human-readable change line. Never produces NaN or Infinity. */
export function describeDayChange(c: DayComparison): string {
  if (c.direction === 'same') return c.current === 0 ? 'No spending on either day' : 'No change';
  const verb = c.direction === 'up' ? 'Increase' : 'Decrease';
  const amount = formatINR(Math.abs(c.difference));
  if (c.percent === null) return `${verb}: ${amount} (no spending the previous day)`;
  return `${verb}: ${amount} (${Math.abs(c.percent)}%)`;
}

export function buildDailyReport(allTxs: readonly Transaction[], date: ISODate, ctx: SeriesContext): DailyReport {
  const txs = sortTransactions(inRange(allTxs, dayRange(date)), 'newest');
  const totals = computeTotals(txs);
  const categories = categoryBreakdown(txs, 'expense');
  const paymentMethods = paymentMethodBreakdown(txs, 'expense');
  const expenseCount = categories.reduce((n, r) => n + r.count, 0);

  const methodTotals: Record<PaymentMethod, number> = { upi: 0, debit_card: 0, cash: 0, other: 0 };
  for (const r of paymentMethods) methodTotals[r.key] = r.totalPaise;

  return {
    date,
    totals,
    coverage: coverage(dayRange(date), ctx),
    categories,
    paymentMethods,
    insights: {
      highestExpense: largestTransactions(txs, 'expense', 1)[0] ?? null,
      mostUsedCategory: mostUsedCategory(categories),
      expenseCount,
      averageExpense: averageOf(totals.expense, expenseCount),
      methodTotals,
    },
    comparison: compareDays(allTxs, date, ctx),
    txs,
  };
}

// ---------- Date navigation ----------

/** Keep a selected report date valid and never in the future. Invalid input falls back to today. */
export function clampReportDate(date: string, today: ISODate): ISODate {
  if (!isValidISODate(date)) return today;
  return date > today ? today : date;
}

/** Move the selected day by `delta` days, never past today. */
export function shiftReportDate(date: ISODate, delta: number, today: ISODate): ISODate {
  return clampReportDate(addDaysISO(date, delta), today);
}

export function canGoToNextDay(date: ISODate, today: ISODate): boolean {
  return date < today;
}
