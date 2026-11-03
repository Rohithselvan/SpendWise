/**
 * The headline: what you spent on yourself, kept visibly apart from money you moved elsewhere.
 * The bar shows where outgoing money went — only the coral segment is personal spending.
 */
import { Link } from 'react-router-dom';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { formatINR } from '@/lib/money';
import { TX_COLOR } from '@/components/ui/tx-style';
import type { Totals } from '@/services/calculations';
import type { TypeComparison } from '@/services/reports';
import type { DateRange } from '@/types';
import { transactionsLink } from '@/lib/links';
import { cn } from '@/lib/utils';

interface Props {
  totals: Totals;
  expenseCount: number;
  comparison: TypeComparison | null;
  partial: boolean;
  tracked: boolean;
  range: DateRange;
}

export function OutflowHero({ totals, expenseCount, comparison, partial, tracked, range }: Props) {
  const segments = [
    { key: 'expense', label: 'Spent on you', value: totals.expense },
    { key: 'transfer', label: 'Transferred', value: totals.transfer },
    { key: 'savings', label: 'Saved', value: totals.savings },
    { key: 'investment', label: 'Invested', value: totals.investment },
  ] as const;
  const outflow = segments.reduce((s, x) => s + x.value, 0);
  const change = comparison?.change ?? null;

  return (
    <section aria-labelledby="hero-title" className="rounded-3xl border border-line bg-ink-900 p-5 sm:p-6">
      <Link to={transactionsLink({ type: 'expense', range })} className="block rounded-xl focus-visible:outline-offset-4">
        <h2 id="hero-title" className="text-sm font-semibold text-fg-muted">
          Spent on yourself
        </h2>
        <p className="num mt-1 text-[44px] font-bold leading-none tracking-tight sm:text-[52px]">{tracked ? formatINR(totals.expense, { decimals: 'never' }) : '—'}</p>
      </Link>
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-fg-muted">
        <span>
          {expenseCount} {expenseCount === 1 ? 'expense' : 'expenses'}
        </span>
        {change !== null && (
          <span className={cn('inline-flex items-center gap-1 font-semibold', change > 0 ? 'text-[#ff9b8f]' : 'text-accent')}>
            {change > 0 ? <TrendingUp className="h-4 w-4" aria-hidden /> : <TrendingDown className="h-4 w-4" aria-hidden />}
            {change > 0 ? '+' : ''}
            {change}% vs {partial ? 'same days last month' : 'last month'}
          </span>
        )}
      </div>

      {outflow > 0 && (
        <div className="mt-6">
          <div className="flex h-3 w-full gap-[3px] overflow-hidden rounded-full" role="img" aria-label={`Money out: ${segments.map((s) => `${s.label} ${formatINR(s.value)}`).join(', ')}`}>
            {segments
              .filter((s) => s.value > 0)
              .map((s) => (
                <div key={s.key} className="h-full first:rounded-l-full last:rounded-r-full" style={{ flexGrow: s.value, flexBasis: 0, minWidth: 6, backgroundColor: TX_COLOR[s.key] }} />
              ))}
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
            {segments.map((s) => (
              <Link key={s.key} to={transactionsLink({ type: s.key, range })} className="rounded-lg hover:opacity-80">
                <dt className="flex items-center gap-1.5 text-[13px] text-fg-muted">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: TX_COLOR[s.key] }} aria-hidden />
                  {s.label}
                </dt>
                <dd className="num mt-0.5 text-[15px] font-bold">{formatINR(s.value, { decimals: 'never' })}</dd>
              </Link>
            ))}
          </dl>
          <p className="mt-4 text-xs leading-relaxed text-fg-subtle">Transfers, savings and investments are tracked separately and never counted as personal spending.</p>
        </div>
      )}
    </section>
  );
}
