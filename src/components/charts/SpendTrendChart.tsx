/**
 * Bar chart for daily / weekly / monthly spending that never disguises missing data as ₹0:
 *  - recorded: solid bar
 *  - zero: a short muted stub (you recorded nothing on a tracked day → genuinely ₹0)
 *  - untracked / future: no bar at all, described as "no records"
 */
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipProps } from 'recharts';
import type { SeriesPoint } from '@/services/calculations';
import { formatINR, formatINRCompact } from '@/lib/money';

interface Datum {
  label: string;
  value: number | null;
  stub: number | null;
  point: SeriesPoint;
}

function TrendTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const p = (payload[0]!.payload as Datum).point;
  const range = p.start === p.end ? p.label : `${p.start.split('-').reverse().slice(0, 2).join('/')} – ${p.end.split('-').reverse().slice(0, 2).join('/')}`;
  let text: string;
  if (p.status === 'recorded') text = formatINR(p.totalPaise ?? 0);
  else if (p.status === 'zero') text = '₹0 spent';
  else if (p.status === 'future') text = 'Not yet';
  else text = 'No records (before you started tracking)';
  return (
    <div className="rounded-xl border border-line bg-ink-800 px-3 py-2 text-sm shadow-xl">
      <p className="text-fg-muted">{range}</p>
      <p className="num font-semibold text-fg">{text}</p>
    </div>
  );
}

export function SpendTrendChart({ points, color = '#f2706b', height = 200, ariaLabel }: { points: SeriesPoint[]; color?: string; height?: number; ariaLabel: string }) {
  const max = Math.max(0, ...points.map((p) => p.totalPaise ?? 0));
  const stubSize = max > 0 ? max * 0.015 : 1;
  const data: Datum[] = points.map((p) => ({
    label: p.label,
    value: p.status === 'recorded' ? (p.totalPaise ?? 0) : null,
    stub: p.status === 'zero' ? stubSize : null,
    point: p,
  }));
  const interval = points.length > 20 ? Math.ceil(points.length / 7) - 1 : points.length > 8 ? 1 : 0;

  return (
    <div className="text-fg-subtle" role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 8, right: 4, left: -8, bottom: 0 }} barCategoryGap={points.length > 20 ? '18%' : '28%'}>
          <CartesianGrid vertical={false} stroke="currentColor" strokeOpacity={0.15} />
          <XAxis dataKey="label" tick={{ fill: 'currentColor', fontSize: 11 }} tickLine={false} axisLine={false} interval={interval} />
          <YAxis
            tick={{ fill: 'currentColor', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={52}
            tickFormatter={(v: number) => formatINRCompact(v)}
            domain={[0, max > 0 ? 'auto' : 100]}
            allowDecimals={false}
          />
          <Tooltip content={<TrendTooltip />} cursor={{ fill: 'currentColor', fillOpacity: 0.08 }} />
          <Bar dataKey="value" stackId="s" radius={[5, 5, 2, 2]} isAnimationActive={false}>
            {data.map((d) => (
              <Cell key={d.point.key} fill={color} />
            ))}
          </Bar>
          <Bar dataKey="stub" stackId="s" fill="currentColor" fillOpacity={0.45} radius={[2, 2, 2, 2]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TrendLegend() {
  return (
    <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-fg-subtle">
      <span className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-sm bg-tx-expense" aria-hidden /> Spent
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-1 w-2.5 rounded-sm bg-fg-subtle/60" aria-hidden /> ₹0 day
      </span>
      <span>Blank: no records yet or still ahead</span>
    </p>
  );
}

/** True when the series has at least one tracked (non-null) point. */
export function hasTrackedData(points: SeriesPoint[]): boolean {
  return points.some((p) => p.status === 'recorded' || p.status === 'zero');
}
