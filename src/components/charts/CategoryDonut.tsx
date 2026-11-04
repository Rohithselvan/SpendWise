import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import { CategoryIcon } from '@/components/ui/category-icon';
import type { BreakdownRow } from '@/services/calculations';
import type { Category } from '@/types';
import { formatINR } from '@/lib/money';

interface Props {
  rows: BreakdownRow[];
  categories: ReadonlyMap<string, Category>;
  total: number;
  onSelect?: (categoryId: string) => void;
  limit?: number;
  /** Also show how many transactions fall in each category. */
  showCount?: boolean;
  /** Label in the centre of the donut. */
  centerLabel?: string;
}

export function CategoryDonut({ rows, categories, total, onSelect, limit, showCount = false, centerLabel = 'Spent' }: Props) {
  const shown = limit ? rows.slice(0, limit) : rows;
  const data = rows.map((r) => ({ name: categories.get(r.key)?.name ?? 'Unknown', value: r.totalPaise, color: categories.get(r.key)?.color ?? '#94a3b8', key: r.key }));
  return (
    <div className="grid items-center gap-4 sm:grid-cols-[180px_1fr]">
      <div className="relative mx-auto h-[180px] w-[180px]" role="img" aria-label={`Spending by category: ${data.map((d) => `${d.name} ${formatINR(d.value)}`).join(', ')}`}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={62} outerRadius={86} paddingAngle={data.length > 1 ? 2 : 0} stroke="none" isAnimationActive={false}>
              {data.map((d) => (
                <Cell key={d.key} fill={d.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="text-xs text-fg-muted">{centerLabel}</p>
            <p className="num text-lg font-bold">{formatINR(total, { decimals: 'never' })}</p>
          </div>
        </div>
      </div>
      <ul className="divide-y divide-line">
        {shown.map((r) => {
          const c = categories.get(r.key);
          return (
            <li key={r.key}>
              <button type="button" disabled={!onSelect} onClick={() => onSelect?.(r.key)} className="flex w-full items-center gap-3 py-2 text-left enabled:hover:opacity-80">
                <CategoryIcon icon={c?.icon ?? 'shapes'} color={c?.color ?? '#94a3b8'} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{c?.name ?? 'Unknown'}</span>
                  <span className="mt-1 block h-1 overflow-hidden rounded-full bg-ink-800">
                    <span className="block h-full rounded-full" style={{ width: `${Math.max(2, r.percent)}%`, backgroundColor: c?.color ?? '#94a3b8' }} />
                  </span>
                </span>
                <span className="text-right">
                  <span className="num block text-sm font-bold">{formatINR(r.totalPaise)}</span>
                  <span className="num block text-xs text-fg-subtle">
                    {showCount && `${r.count} ${r.count === 1 ? 'txn' : 'txns'} · `}
                    {r.percent}%
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
