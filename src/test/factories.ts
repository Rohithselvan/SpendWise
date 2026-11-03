/** Test-only builders. These never ship in the app bundle. */
import type { Transaction, TxType } from '@/types';

let n = 0;
const DEFAULT_CAT: Record<TxType, string> = {
  expense: 'exp-food',
  income: 'inc-salary',
  transfer: 'tr-father',
  savings: 'sav-general',
  investment: 'inv-sip',
};

export function tx(partial: Partial<Transaction> & { type?: TxType } = {}): Transaction {
  n += 1;
  const type = partial.type ?? 'expense';
  return {
    id: `t${n}`,
    type,
    amountPaise: 10000,
    date: '2026-10-15',
    categoryId: DEFAULT_CAT[type],
    description: '',
    recipient: '',
    paymentMethod: 'upi',
    notes: '',
    createdAt: `2026-10-15T10:00:${String(n % 60).padStart(2, '0')}.000Z`,
    updatedAt: `2026-10-15T10:00:${String(n % 60).padStart(2, '0')}.000Z`,
    ...partial,
  };
}
