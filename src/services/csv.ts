/** CSV export with RFC 4180 quoting and spreadsheet formula-injection protection. */
import type { Category, DateRange, Transaction } from '@/types';
import { PAYMENT_METHOD_LABEL, TX_TYPE_LABEL } from '@/types';
import { paiseToRupeeString } from '@/lib/money';

export const CSV_HEADERS = ['Date', 'Type', 'Description', 'Category', 'Recipient', 'Payment method', 'Amount (INR)', 'Notes'] as const;

const FORMULA_START = /^[=+\-@\t\r]/;

/** Escape one cell. Text cells beginning with a formula trigger are prefixed with an apostrophe. */
export function escapeCsvCell(value: string | number, { numeric = false } = {}): string {
  let s = String(value);
  if (!numeric && FORMULA_START.test(s)) s = `'${s}`;
  if (/[",\r\n]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function transactionsToCsv(
  txs: readonly Transaction[],
  categoriesById: ReadonlyMap<string, Category>,
  range?: DateRange,
): string {
  const rows = txs
    .filter((t) => !range || (t.date >= range.start && t.date <= range.end))
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt))
    .map((t) => {
      const cat = categoriesById.get(t.categoryId)?.name ?? 'Unknown';
      const isTransfer = t.type === 'transfer';
      const recipient = isTransfer ? (t.recipient ? `${cat} (${t.recipient})` : cat) : '';
      return [
        escapeCsvCell(t.date),
        escapeCsvCell(TX_TYPE_LABEL[t.type]),
        escapeCsvCell(t.description),
        escapeCsvCell(isTransfer ? '' : cat),
        escapeCsvCell(recipient),
        escapeCsvCell(PAYMENT_METHOD_LABEL[t.paymentMethod]),
        escapeCsvCell(paiseToRupeeString(t.amountPaise), { numeric: true }),
        escapeCsvCell(t.notes),
      ].join(',');
    });
  // Leading BOM so Excel on Windows opens ₹ and other UTF-8 text correctly.
  return `\uFEFF${[CSV_HEADERS.join(','), ...rows].join('\r\n')}\r\n`;
}
