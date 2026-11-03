/**
 * Central financial calculations. Every screen uses these functions so numbers always agree.
 *
 * Rules:
 *  - Personal expenses = sum of type === 'expense' ONLY.
 *  - Transfers, income, savings and investments are each summed separately and never mixed into expenses.
 *  - All arithmetic is integer paise.
 */
import type { DateRange, ISODate, PaymentMethod, Transaction, TxType } from '@/types';
import { PAYMENT_METHODS, TX_TYPES } from '@/types';
import { addDaysISO, daysInRange, eachDayISO, maxDate, minDate, monthRangeFromKey, parseISODate, toISODate, weekStartISO } from '@/lib/dates';
import { format } from 'date-fns';

export type Totals = Record<TxType, number> & { count: number };

export function totalByType(txs: readonly Transaction[], type: TxType): number {
  let total = 0;
  for (const t of txs) if (t.type === type) total += t.amountPaise;
  return total;
}

/** Single pass totals; each transaction contributes to exactly one bucket. */
export function computeTotals(txs: readonly Transaction[]): Totals {
  const totals: Totals = { expense: 0, income: 0, transfer: 0, savings: 0, investment: 0, count: 0 };
  const seen = new Set<string>();
  for (const t of txs) {
    if (seen.has(t.id)) continue; // never double-count
    seen.add(t.id);
    totals[t.type] += t.amountPaise;
    totals.count += 1;
  }
  return totals;
}

export function countByType(txs: readonly Transaction[]): Record<TxType, number> {
  const out = Object.fromEntries(TX_TYPES.map((t) => [t, 0])) as Record<TxType, number>;
  for (const t of txs) out[t.type] += 1;
  return out;
}

export interface BreakdownRow<K extends string = string> {
  key: K;
  totalPaise: number;
  count: number;
  /** Share of the total, one decimal place. */
  percent: number;
}

function toRows<K extends string>(map: Map<K, { total: number; count: number }>): BreakdownRow<K>[] {
  let grand = 0;
  map.forEach((v) => (grand += v.total));
  return [...map.entries()]
    .map(([key, v]) => ({
      key,
      totalPaise: v.total,
      count: v.count,
      percent: grand === 0 ? 0 : Math.round((v.total * 1000) / grand) / 10,
    }))
    .sort((a, b) => b.totalPaise - a.totalPaise || a.key.localeCompare(b.key));
}

/** Category totals for one transaction type (expenses by default). */
export function categoryBreakdown(txs: readonly Transaction[], type: TxType = 'expense'): BreakdownRow[] {
  const map = new Map<string, { total: number; count: number }>();
  for (const t of txs) {
    if (t.type !== type) continue;
    const cur = map.get(t.categoryId) ?? { total: 0, count: 0 };
    cur.total += t.amountPaise;
    cur.count += 1;
    map.set(t.categoryId, cur);
  }
  return toRows(map);
}

/** Payment-method totals. Defaults to expenses; pass null for all money-out types. */
export function paymentMethodBreakdown(
  txs: readonly Transaction[],
  type: TxType | null = 'expense',
): BreakdownRow<PaymentMethod>[] {
  const map = new Map<PaymentMethod, { total: number; count: number }>();
  for (const t of txs) {
    if (type ? t.type !== type : t.type === 'income') continue;
    const cur = map.get(t.paymentMethod) ?? { total: 0, count: 0 };
    cur.total += t.amountPaise;
    cur.count += 1;
    map.set(t.paymentMethod, cur);
  }
  return toRows(map).sort((a, b) => b.totalPaise - a.totalPaise || PAYMENT_METHODS.indexOf(a.key) - PAYMENT_METHODS.indexOf(b.key));
}

export function largestTransactions(txs: readonly Transaction[], type: TxType = 'expense', n = 5): Transaction[] {
  return txs
    .filter((t) => t.type === type)
    .sort((a, b) => b.amountPaise - a.amountPaise || b.date.localeCompare(a.date))
    .slice(0, n);
}

export function recentTransactions(txs: readonly Transaction[], n = 6): Transaction[] {
  return [...txs].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)).slice(0, n);
}

/** Percentage change, one decimal. Null when previous is 0 (change undefined). */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) * 1000) / previous) / 10;
}

// ---------- Time series with honest gaps ----------

export type PointStatus = 'recorded' | 'zero' | 'untracked' | 'future';

export interface SeriesPoint {
  key: string;
  label: string;
  start: ISODate;
  end: ISODate;
  /** null means "no data" (before tracking started, or in the future) — NOT ₹0. */
  totalPaise: number | null;
  status: PointStatus;
}

export interface SeriesContext {
  today: ISODate;
  /** Earliest transaction date ever recorded; null when nothing has been recorded. */
  trackingStart: ISODate | null;
}

function bucketStatus(start: ISODate, end: ISODate, total: number, ctx: SeriesContext): PointStatus {
  if (start > ctx.today) return 'future';
  if (!ctx.trackingStart || end < ctx.trackingStart) return 'untracked';
  return total > 0 ? 'recorded' : 'zero';
}

function sumExpensesBetween(txs: readonly Transaction[], start: ISODate, end: ISODate, type: TxType): number {
  let total = 0;
  for (const t of txs) if (t.type === type && t.date >= start && t.date <= end) total += t.amountPaise;
  return total;
}

export function dailySeries(txs: readonly Transaction[], range: DateRange, ctx: SeriesContext, type: TxType = 'expense'): SeriesPoint[] {
  const byDay = new Map<string, number>();
  for (const t of txs) if (t.type === type) byDay.set(t.date, (byDay.get(t.date) ?? 0) + t.amountPaise);
  return eachDayISO(range).map((d) => {
    const total = byDay.get(d) ?? 0;
    const status = bucketStatus(d, d, total, ctx);
    return {
      key: d,
      label: format(parseISODate(d), 'd MMM'),
      start: d,
      end: d,
      totalPaise: status === 'future' || status === 'untracked' ? null : total,
      status,
    };
  });
}

/** Monday-start weeks, clipped to the range. */
export function weeklySeries(txs: readonly Transaction[], range: DateRange, ctx: SeriesContext, type: TxType = 'expense'): SeriesPoint[] {
  const out: SeriesPoint[] = [];
  let ws = weekStartISO(range.start);
  while (ws <= range.end) {
    const start = maxDate(ws, range.start);
    const end = minDate(addDaysISO(ws, 6), range.end);
    const total = sumExpensesBetween(txs, start, end, type);
    const status = bucketStatus(start, end, total, ctx);
    out.push({
      key: ws,
      label: format(parseISODate(start), 'd MMM'),
      start,
      end,
      totalPaise: status === 'future' || status === 'untracked' ? null : total,
      status,
    });
    ws = addDaysISO(ws, 7);
  }
  return out;
}

export function monthlySeries(txs: readonly Transaction[], monthKeys: string[], ctx: SeriesContext, type: TxType = 'expense'): SeriesPoint[] {
  return monthKeys.map((key) => {
    const r = monthRangeFromKey(key);
    const total = sumExpensesBetween(txs, r.start, r.end, type);
    const status = bucketStatus(r.start, r.end, total, ctx);
    return {
      key,
      label: format(parseISODate(r.start), 'MMM yy'),
      start: r.start,
      end: r.end,
      totalPaise: status === 'future' || status === 'untracked' ? null : total,
      status,
    };
  });
}

// ---------- Equivalent-period comparisons ----------

export type PeriodKind = 'month' | 'year' | 'custom';

export interface ComparisonRanges {
  current: DateRange;
  previous: DateRange;
  /** True when the current period is still in progress and has been cut to "to date". */
  partial: boolean;
}

function clampDayOfMonth(year: number, monthIndex0: number, day: number): ISODate {
  const last = new Date(year, monthIndex0 + 1, 0).getDate();
  return toISODate(new Date(year, monthIndex0, Math.min(day, last)));
}

/**
 * Build like-for-like ranges. For an in-progress month, 1–N of this month is compared with 1–N of last month.
 * For years, the same day-of-year span. For custom ranges, the immediately preceding range of equal length.
 */
export function comparisonRanges(range: DateRange, kind: PeriodKind, today: ISODate): ComparisonRanges {
  const partial = today >= range.start && today < range.end;
  const current: DateRange = { start: range.start, end: partial ? today : range.end };
  const s = parseISODate(range.start);
  const e = parseISODate(current.end);

  if (kind === 'month') {
    const prevStart = toISODate(new Date(s.getFullYear(), s.getMonth() - 1, 1));
    const prevEnd = partial
      ? clampDayOfMonth(s.getFullYear(), s.getMonth() - 1, e.getDate())
      : toISODate(new Date(s.getFullYear(), s.getMonth(), 0));
    return { current, previous: { start: prevStart, end: prevEnd }, partial };
  }
  if (kind === 'year') {
    const prevStart = toISODate(new Date(s.getFullYear() - 1, 0, 1));
    const prevEnd = partial
      ? clampDayOfMonth(e.getFullYear() - 1, e.getMonth(), e.getDate())
      : toISODate(new Date(s.getFullYear() - 1, 11, 31));
    return { current, previous: { start: prevStart, end: prevEnd }, partial };
  }
  const len = daysInRange(current);
  const prevEnd = addDaysISO(current.start, -1);
  return { current, previous: { start: addDaysISO(prevEnd, -(len - 1)), end: prevEnd }, partial };
}

export type CoverageStatus = 'full' | 'partial' | 'none';

/** How much of a range has records behind it (tracking start → today). */
export function coverage(range: DateRange, ctx: SeriesContext): CoverageStatus {
  if (!ctx.trackingStart || ctx.trackingStart > range.end || range.start > ctx.today) return 'none';
  return ctx.trackingStart > range.start ? 'partial' : 'full';
}

/** Days in the range that have actually elapsed and are within the tracking window. */
export function trackedDays(range: DateRange, ctx: SeriesContext): number {
  if (!ctx.trackingStart) return 0;
  const start = maxDate(range.start, ctx.trackingStart);
  const end = minDate(range.end, ctx.today);
  if (start > end) return 0;
  return daysInRange({ start, end });
}

/** Average daily personal spending over tracked, elapsed days (rounded paise). Null if no tracked days. */
export function averageDaily(totalPaise: number, days: number): number | null {
  if (days <= 0) return null;
  return Math.round(totalPaise / days);
}

export function inRange(txs: readonly Transaction[], r: DateRange): Transaction[] {
  return txs.filter((t) => t.date >= r.start && t.date <= r.end);
}
