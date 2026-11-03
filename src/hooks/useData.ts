/** Reactive data hooks. They re-render automatically whenever IndexedDB changes. */
import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { listAllTransactions, listTransactionsInRange, getEarliestTransactionDate } from '@/repositories/transactions';
import { listCategories } from '@/repositories/categories';
import { listBudgets } from '@/repositories/budgets';
import { getSettings, DEFAULT_SETTINGS } from '@/repositories/settings';
import type { Category, DateRange, Transaction, TxType } from '@/types';

export function useAllTransactions(): Transaction[] | undefined {
  return useLiveQuery(listAllTransactions, []);
}

export function useTransactionsInRange(range: DateRange): Transaction[] | undefined {
  return useLiveQuery(() => listTransactionsInRange(range), [range.start, range.end]);
}

/** Earliest recorded date. `undefined` = loading, `null` = nothing recorded yet. */
export function useTrackingStart(): string | null | undefined {
  return useLiveQuery(getEarliestTransactionDate, [], undefined);
}

export function useCategories(): Category[] | undefined {
  return useLiveQuery(listCategories, []);
}

export function useCategoryMap(): Map<string, Category> {
  const cats = useCategories();
  return useMemo(() => new Map((cats ?? []).map((c) => [c.id, c])), [cats]);
}

export function useCategoriesOfType(type: TxType): Category[] {
  const cats = useCategories();
  return useMemo(() => (cats ?? []).filter((c) => c.type === type), [cats, type]);
}

export function useBudgets() {
  return useLiveQuery(listBudgets, []);
}

export function useSettings() {
  return useLiveQuery(getSettings, [], DEFAULT_SETTINGS) ?? DEFAULT_SETTINGS;
}
