/** Transaction list filtering and sorting (pure functions). */
import type { Category, PaymentMethod, Transaction, TxType } from '@/types';

export type SortOrder = 'newest' | 'oldest' | 'highest' | 'lowest';

export interface TxFilters {
  query: string;
  types: TxType[];
  categoryIds: string[];
  paymentMethods: PaymentMethod[];
  start: string | null;
  end: string | null;
  sort: SortOrder;
}

export const EMPTY_FILTERS: TxFilters = {
  query: '',
  types: [],
  categoryIds: [],
  paymentMethods: [],
  start: null,
  end: null,
  sort: 'newest',
};

export function activeFilterCount(f: TxFilters): number {
  return (
    (f.types.length ? 1 : 0) +
    (f.categoryIds.length ? 1 : 0) +
    (f.paymentMethods.length ? 1 : 0) +
    (f.start || f.end ? 1 : 0)
  );
}

export function filterTransactions(
  txs: readonly Transaction[],
  f: TxFilters,
  categoriesById: ReadonlyMap<string, Category>,
): Transaction[] {
  const q = f.query.trim().toLowerCase();
  const out = txs.filter((t) => {
    if (f.types.length && !f.types.includes(t.type)) return false;
    if (f.categoryIds.length && !f.categoryIds.includes(t.categoryId)) return false;
    if (f.paymentMethods.length && !f.paymentMethods.includes(t.paymentMethod)) return false;
    if (f.start && t.date < f.start) return false;
    if (f.end && t.date > f.end) return false;
    if (q) {
      const cat = categoriesById.get(t.categoryId)?.name ?? '';
      const hay = `${t.description} ${t.recipient} ${t.notes} ${cat}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
  return sortTransactions(out, f.sort);
}

export function sortTransactions(txs: Transaction[], sort: SortOrder): Transaction[] {
  const byNewest = (a: Transaction, b: Transaction) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt);
  const cmp: Record<SortOrder, (a: Transaction, b: Transaction) => number> = {
    newest: byNewest,
    oldest: (a, b) => -byNewest(a, b),
    highest: (a, b) => b.amountPaise - a.amountPaise || byNewest(a, b),
    lowest: (a, b) => a.amountPaise - b.amountPaise || byNewest(a, b),
  };
  return [...txs].sort(cmp[sort]);
}
