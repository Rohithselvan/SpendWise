import { CategoryIcon } from '@/components/ui/category-icon';
import { formatINR } from '@/lib/money';
import type { BudgetStatus } from '@/services/reports';
import type { Category } from '@/types';
import { cn } from '@/lib/utils';

export function BudgetProgress({ status, categories }: { status: BudgetStatus; categories: ReadonlyMap<string, Category> }) {
  const cat = status.budget.categoryId ? categories.get(status.budget.categoryId) : undefined;
  const pct = Math.min(100, status.percentUsed);
  const tone = status.over ? '#f2706b' : status.percentUsed >= 85 ? '#e8c25a' : '#2fd08a';
  return (
    <div>
      <div className="flex items-center gap-3">
        {cat ? <CategoryIcon icon={cat.icon} color={cat.color} size="sm" /> : <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-500/15 text-xs font-bold text-accent">All</span>}
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className="truncate text-sm font-semibold">{cat ? cat.name : 'All personal spending'}</p>
            <p className="num shrink-0 text-sm font-bold">{status.percentUsed}%</p>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-ink-800" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)} aria-label={`${cat?.name ?? 'Overall'} budget used`}>
            <div className="h-full rounded-full transition-[width]" style={{ width: `${pct}%`, backgroundColor: tone }} />
          </div>
          <p className={cn('num mt-1.5 text-xs', status.over ? 'text-[#ff9b8f]' : 'text-fg-muted')}>
            {formatINR(status.spentPaise)} of {formatINR(status.budget.amountPaise)},{' '}
            {status.over ? `${formatINR(-status.remainingPaise)} over` : `${formatINR(status.remainingPaise)} left`}
          </p>
        </div>
      </div>
    </div>
  );
}
