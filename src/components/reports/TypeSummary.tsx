import { CategoryIcon } from '@/components/ui/category-icon';
import { formatINR } from '@/lib/money';
import { categoryBreakdown } from '@/services/calculations';
import type { Category, Transaction, TxType } from '@/types';

/** Category (or recipient) breakdown for a non-expense type. */
export function TypeSummary({ txs, type, categories, emptyText }: { txs: Transaction[]; type: TxType; categories: ReadonlyMap<string, Category>; emptyText: string }) {
  const rows = categoryBreakdown(txs, type);
  if (!rows.length) return <p className="py-2 text-sm text-fg-muted">{emptyText}</p>;
  return (
    <ul className="divide-y divide-line">
      {rows.map((r) => {
        const c = categories.get(r.key);
        return (
          <li key={r.key} className="flex items-center gap-3 py-2.5">
            <CategoryIcon icon={c?.icon ?? 'shapes'} color={c?.color ?? '#94a3b8'} size="sm" />
            <span className="flex-1 text-sm font-semibold">{c?.name ?? 'Unknown'}</span>
            <span className="text-xs text-fg-subtle">{r.count}×</span>
            <span className="num w-28 text-right text-sm font-bold">{formatINR(r.totalPaise)}</span>
          </li>
        );
      })}
    </ul>
  );
}
