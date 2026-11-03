/**
 * Money utilities. All amounts are stored and computed as integer paise.
 * Floating point is never used for arithmetic; rupee strings are parsed digit-by-digit.
 */

/** Upper bound: ₹99,99,99,999.99 — far below Number.MAX_SAFE_INTEGER even when summed. */
export const MAX_PAISE = 99_99_99_999_99;

const AMOUNT_RE = /^(\d{0,11})(?:\.(\d{0,2}))?$/;

/** Normalise user-typed rupee text: strips ₹, "Rs", spaces and thousands separators. */
export function normaliseRupeeInput(input: string): string {
  return input
    .trim()
    .replace(/^(₹|rs\.?|inr)\s*/i, '')
    .replace(/[\s,_]/g, '');
}

/**
 * Parse a rupee string ("1,250.50", "₹500", "0.5") into integer paise.
 * Returns null for anything invalid: negative, >2 decimals, non-numeric, empty, or above MAX_PAISE.
 */
export function parseRupeesToPaise(input: string): number | null {
  const s = normaliseRupeeInput(input);
  if (s === '' || s === '.') return null;
  const m = AMOUNT_RE.exec(s);
  if (!m) return null;
  const whole = m[1] ?? '';
  const rawFrac = m[2] ?? '';
  if (whole === '' && rawFrac === '') return null;
  const paise = Number(whole || '0') * 100 + Number(rawFrac.padEnd(2, '0'));
  if (!Number.isSafeInteger(paise) || paise > MAX_PAISE) return null;
  return paise;
}

/** Validate a stored amount: positive safe integer within bounds. */
export function isValidPositivePaise(paise: unknown): paise is number {
  return typeof paise === 'number' && Number.isSafeInteger(paise) && paise > 0 && paise <= MAX_PAISE;
}

/**
 * Convert a rupee number to paise. Only for trusted numeric inputs (e.g. legacy backups);
 * rounds via decimal string rather than float multiplication.
 */
export function rupeesToPaise(rupees: number): number {
  if (!Number.isFinite(rupees)) throw new Error('Amount must be a finite number');
  const sign = rupees < 0 ? -1 : 1;
  const [w = '0', f = ''] = Math.abs(rupees).toFixed(2).split('.');
  return sign * (Number(w) * 100 + Number(f.padEnd(2, '0')));
}

/** Paise → rupees as a number. Display/chart use only — never feed back into arithmetic. */
export function paiseToRupees(paise: number): number {
  return paise / 100;
}

/** Paise → exact plain decimal string, e.g. 125050 → "1250.50". Used for CSV and input prefill. */
export function paiseToRupeeString(paise: number, alwaysDecimals = true): string {
  const neg = paise < 0;
  const abs = Math.abs(paise);
  const whole = Math.floor(abs / 100);
  const frac = abs % 100;
  const body = !alwaysDecimals && frac === 0 ? String(whole) : `${whole}.${String(frac).padStart(2, '0')}`;
  return neg ? `-${body}` : body;
}

/** Group an integer string the Indian way: 12345678 → 1,23,45,678 */
export function groupIndian(intDigits: string): string {
  if (intDigits.length <= 3) return intDigits;
  const last3 = intDigits.slice(-3);
  let rest = intDigits.slice(0, -3);
  const parts: string[] = [];
  while (rest.length > 2) {
    parts.unshift(rest.slice(-2));
    rest = rest.slice(0, -2);
  }
  if (rest) parts.unshift(rest);
  return `${parts.join(',')},${last3}`;
}

export interface FormatOptions {
  /** 'auto' shows paise only when non-zero (default). */
  decimals?: 'auto' | 'always' | 'never';
  /** Prefix with ₹ (default true). */
  symbol?: boolean;
  /** Show + for positive values (for deltas). */
  signed?: boolean;
}

/** Format paise as Indian Rupees: 12500000 → "₹1,25,000"; 125050 → "₹1,250.50". */
export function formatINR(paise: number, opts: FormatOptions = {}): string {
  const { decimals = 'auto', symbol = true, signed = false } = opts;
  const neg = paise < 0;
  let abs = Math.abs(paise);
  if (decimals === 'never') abs = Math.round(abs / 100) * 100;
  const whole = Math.floor(abs / 100);
  const frac = abs % 100;
  let out = groupIndian(String(whole));
  if (decimals === 'always' || (decimals === 'auto' && frac !== 0)) {
    out += `.${String(frac).padStart(2, '0')}`;
  }
  if (symbol) out = `₹${out}`;
  if (neg) return `−${out}`;
  if (signed && paise > 0) return `+${out}`;
  return out;
}

/** Compact Indian notation for chart axes: ₹950, ₹12K, ₹1.2L, ₹3.4Cr */
export function formatINRCompact(paise: number): string {
  const r = Math.abs(paise) / 100;
  const sign = paise < 0 ? '−' : '';
  const trim = (n: number) => (n >= 10 ? Math.round(n).toString() : (Math.round(n * 10) / 10).toString());
  if (r >= 1_00_00_000) return `${sign}₹${trim(r / 1_00_00_000)}Cr`;
  if (r >= 1_00_000) return `${sign}₹${trim(r / 1_00_000)}L`;
  if (r >= 1_000) return `${sign}₹${trim(r / 1_000)}K`;
  return `${sign}₹${Math.round(r)}`;
}

/** Sum integer paise. */
export function sumPaise(values: Iterable<number>): number {
  let total = 0;
  for (const v of values) total += v;
  return total;
}

/** Percentage (one decimal) of part/whole, or null when whole is 0. */
export function sharePercent(part: number, whole: number): number | null {
  if (whole === 0) return null;
  return Math.round((part * 1000) / whole) / 10;
}
