import { TX_COLOR } from '@/components/ui/tx-style';
import { formatINR } from '@/lib/money';
import type { PeriodReport } from '@/services/reports';
import { TX_TYPES, TX_TYPE_PLURAL, type TxType } from '@/types';
import { cn } from '@/lib/utils';

/** For expenses a rise is bad; for savings/investments/income a rise is good; transfers are neutral. */
function tone(type: TxType, change: number): string {
  if (change === 0 || type === 'transfer') return 'text-fg-muted';
  const good = type === 'expense' ? change < 0 : change > 0;
  return good ? 'text-accent' : 'text-[#ff9b8f]';
}

export function ComparisonTable({ report, rangeLabel }: { report: PeriodReport; rangeLabel: (r: { start: string; end: string }) => string }) {
  const { byType, ranges, previousCoverage } = report.comparison;
  return (
    <div>
      <p className="mb-3 text-sm text-fg-muted">
        {rangeLabel(ranges.current)} compared with {rangeLabel(ranges.previous)}
        {ranges.partial && ' (same number of days, because this period is still in progress)'}
      </p>
      {previousCoverage === 'none' && <p className="mb-3 rounded-xl bg-ink-850 px-3 py-2 text-sm text-fg-muted">There are no records for the previous period, so changes are not shown.</p>}
      {previousCoverage === 'partial' && <p className="mb-3 rounded-xl bg-ink-850 px-3 py-2 text-sm text-fg-muted">You started tracking during the previous period, so its totals may be incomplete.</p>}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] text-sm">
          <thead>
            <tr className="text-left text-[13px] text-fg-subtle">
              <th scope="col" className="pb-2 font-medium">Type</th>
              <th scope="col" className="pb-2 text-right font-medium">This period</th>
              <th scope="col" className="pb-2 text-right font-medium">Previous</th>
              <th scope="col" className="pb-2 text-right font-medium">Change</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {TX_TYPES.map((t) => {
              const c = byType[t];
              return (
                <tr key={t}>
                  <th scope="row" className="py-2.5 text-left font-semibold">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: TX_COLOR[t] }} aria-hidden />
                      {TX_TYPE_PLURAL[t]}
                    </span>
                  </th>
                  <td className="num py-2.5 text-right font-semibold">{formatINR(c.current, { decimals: 'never' })}</td>
                  <td className="num py-2.5 text-right text-fg-muted">{previousCoverage === 'none' ? '—' : formatINR(c.previous, { decimals: 'never' })}</td>
                  <td className={cn('num py-2.5 text-right font-semibold', c.change === null ? 'text-fg-subtle' : tone(t, c.change))}>
                    {c.change === null ? (c.current > 0 && previousCoverage !== 'none' ? 'New' : '—') : `${c.change > 0 ? '+' : ''}${c.change}%`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
