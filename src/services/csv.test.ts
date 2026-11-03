import { describe, expect, it } from 'vitest';
import { tx } from '@/test/factories';
import { defaultCategories } from '@/db/seed';
import { escapeCsvCell, transactionsToCsv } from './csv';

const cats = new Map(defaultCategories().map((c) => [c.id, c]));

describe('CSV export', () => {
  it('escapes quotes, commas and newlines', () => {
    expect(escapeCsvCell('a,b')).toBe('"a,b"');
    expect(escapeCsvCell('say "hi"')).toBe('"say ""hi"""');
    expect(escapeCsvCell('line1\nline2')).toBe('"line1\nline2"');
  });
  it('neutralises spreadsheet formula injection', () => {
    expect(escapeCsvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
    expect(escapeCsvCell('+91')).toBe("'+91");
    expect(escapeCsvCell('-5')).toBe("'-5");
    expect(escapeCsvCell('@SUM(A1)')).toBe("'@SUM(A1)");
    expect(escapeCsvCell('1250.50', { numeric: true })).toBe('1250.50');
  });
  it('exports rows with headers, exact amounts and transfer recipients', () => {
    const csv = transactionsToCsv(
      [
        tx({ date: '2026-10-02', amountPaise: 125050, description: 'Dinner, friends', categoryId: 'exp-food' }),
        tx({ date: '2026-10-01', type: 'transfer', amountPaise: 4500000, categoryId: 'tr-father', paymentMethod: 'upi', notes: 'Monthly' }),
      ],
      cats,
    );
    const lines = csv.replace(/^\uFEFF/, '').trim().split('\r\n');
    expect(lines[0]).toBe('Date,Type,Description,Category,Recipient,Payment method,Amount (INR),Notes');
    expect(lines[1]).toBe('2026-10-01,Transfer,,,Father,UPI,45000.00,Monthly');
    expect(lines[2]).toBe('2026-10-02,Expense,"Dinner, friends",Food & Dining,,UPI,1250.50,');
  });
  it('supports date ranges', () => {
    const csv = transactionsToCsv([tx({ date: '2026-09-30' }), tx({ date: '2026-10-01' })], cats, { start: '2026-10-01', end: '2026-10-31' });
    expect(csv.trim().split('\r\n')).toHaveLength(2);
  });
});
