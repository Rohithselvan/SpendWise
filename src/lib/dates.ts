/**
 * Calendar-date helpers. Dates are stored as "YYYY-MM-DD" strings representing the calendar day in Asia/Kolkata.
 * Arithmetic operates on calendar dates (no times), so the device timezone does not matter.
 */
import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  endOfMonth,
  format,
  getDaysInMonth,
  isValid,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import type { DateFormatPref, DateRange, ISODate } from '@/types';

export const APP_TIMEZONE = 'Asia/Kolkata';
const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Today's calendar date in Asia/Kolkata. */
export function todayIST(now: Date = new Date()): ISODate {
  // en-CA formats as YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export function isValidISODate(s: unknown): s is ISODate {
  if (typeof s !== 'string') return false;
  const m = ISO_RE.exec(s);
  if (!m) return false;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (y < 1900 || y > 2200 || mo < 1 || mo > 12 || d < 1) return false;
  return d <= getDaysInMonth(new Date(y, mo - 1, 1));
}

/** Parse YYYY-MM-DD into a local-midnight Date for date-fns arithmetic. */
export function parseISODate(s: ISODate): Date {
  const m = ISO_RE.exec(s);
  if (!m) throw new Error(`Invalid date: ${s}`);
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (!isValid(d)) throw new Error(`Invalid date: ${s}`);
  return d;
}

export function toISODate(d: Date): ISODate {
  return format(d, 'yyyy-MM-dd');
}

export function addDaysISO(s: ISODate, n: number): ISODate {
  return toISODate(addDays(parseISODate(s), n));
}

/** Month key "YYYY-MM" */
export function monthKey(s: ISODate): string {
  return s.slice(0, 7);
}

export function monthRange(s: ISODate): DateRange {
  const d = parseISODate(s);
  return { start: toISODate(startOfMonth(d)), end: toISODate(endOfMonth(d)) };
}

export function monthRangeFromKey(key: string): DateRange {
  return monthRange(`${key}-01`);
}

export function shiftMonthKey(key: string, delta: number): string {
  return format(addMonths(parseISODate(`${key}-01`), delta), 'yyyy-MM');
}

export function yearRange(year: number): DateRange {
  return { start: `${year}-01-01`, end: `${year}-12-31` };
}

export function daysInRange(r: DateRange): number {
  return differenceInCalendarDays(parseISODate(r.end), parseISODate(r.start)) + 1;
}

export function eachDayISO(r: DateRange): ISODate[] {
  const out: ISODate[] = [];
  const n = daysInRange(r);
  const start = parseISODate(r.start);
  for (let i = 0; i < n; i++) out.push(toISODate(addDays(start, i)));
  return out;
}

/** Monday-start week for a date. */
export function weekStartISO(s: ISODate): ISODate {
  return toISODate(startOfWeek(parseISODate(s), { weekStartsOn: 1 }));
}

export function isInRange(s: ISODate, r: DateRange): boolean {
  return s >= r.start && s <= r.end;
}

export function minDate(a: ISODate, b: ISODate): ISODate {
  return a < b ? a : b;
}

export function maxDate(a: ISODate, b: ISODate): ISODate {
  return a > b ? a : b;
}

export function formatDisplayDate(s: ISODate, pref: DateFormatPref = 'DD/MM/YYYY'): string {
  if (!isValidISODate(s)) return s;
  if (pref === 'YYYY-MM-DD') return s;
  const [y, m, d] = s.split('-');
  return `${d}/${m}/${y}`;
}

/** "Today", "Yesterday", "Mon, 3 Nov" style label for lists. */
export function formatFriendlyDate(s: ISODate, today: ISODate = todayIST()): string {
  if (s === today) return 'Today';
  if (s === addDaysISO(today, -1)) return 'Yesterday';
  const d = parseISODate(s);
  return s.slice(0, 4) === today.slice(0, 4) ? format(d, 'EEE, d MMM') : format(d, 'd MMM yyyy');
}

export function formatMonthLabel(key: string): string {
  return format(parseISODate(`${key}-01`), 'MMMM yyyy');
}

/** "Wed, 04 Nov 2026" — used as the Daily Report heading. */
export function formatLongDay(s: ISODate): string {
  if (!isValidISODate(s)) return s;
  return format(parseISODate(s), 'EEE, dd MMM yyyy');
}

/**
 * When a record was saved, as an Asia/Kolkata clock time ("2:45 pm").
 * If it was saved on a different day than its transaction date (e.g. back-dated), the save date is included.
 * Returns null for a missing or unreadable timestamp.
 */
export function formatRecordedTime(isoTimestamp: string | undefined, txDate?: ISODate): string | null {
  if (!isoTimestamp) return null;
  const at = new Date(isoTimestamp);
  if (Number.isNaN(at.getTime())) return null;
  const time = new Intl.DateTimeFormat('en-IN', { timeZone: APP_TIMEZONE, hour: 'numeric', minute: '2-digit', hour12: true })
    .format(at)
    .toLowerCase();
  const savedOn = todayIST(at);
  if (!txDate || savedOn === txDate) return time;
  return `${format(parseISODate(savedOn), 'd MMM')}, ${time}`;
}

export function formatShortDay(s: ISODate): string {
  return format(parseISODate(s), 'd MMM');
}
