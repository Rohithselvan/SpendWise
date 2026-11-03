import { Link } from 'react-router-dom';
import { ArrowDownLeft, Hash, Landmark, PiggyBank, Send } from 'lucide-react';
import { formatINR } from '@/lib/money';
import { TX_COLOR } from '@/components/ui/tx-style';
import { transactionsLink } from '@/lib/links';
import type { Totals } from '@/services/calculations';
import type { DateRange } from '@/types';

export function SummaryCards({ totals, range, tracked }: { totals: Totals; range: DateRange; tracked: boolean }) {
  const cards = [
    { label: 'Income', value: totals.income, icon: ArrowDownLeft, color: TX_COLOR.income, to: transactionsLink({ type: 'income', range }) },
    { label: 'Transfers', value: totals.transfer, icon: Send, color: TX_COLOR.transfer, to: transactionsLink({ type: 'transfer', range }) },
    { label: 'Savings', value: totals.savings, icon: PiggyBank, color: TX_COLOR.savings, to: transactionsLink({ type: 'savings', range }) },
    { label: 'Investments', value: totals.investment, icon: Landmark, color: TX_COLOR.investment, to: transactionsLink({ type: 'investment', range }) },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      {cards.map((c) => (
        <Link key={c.label} to={c.to} className="rounded-2xl border border-line bg-ink-900 p-4 hover:bg-ink-850">
          <div className="flex items-center gap-2 text-[13px] font-semibold text-fg-muted">
            <c.icon className="h-4 w-4" style={{ color: c.color }} aria-hidden />
            {c.label}
          </div>
          <p className="num mt-2 text-xl font-bold tracking-tight">{tracked ? formatINR(c.value, { decimals: 'never' }) : '—'}</p>
        </Link>
      ))}
      <Link to={transactionsLink({ range })} className="col-span-2 rounded-2xl border border-line bg-ink-900 p-4 hover:bg-ink-850 lg:col-span-1">
        <div className="flex items-center gap-2 text-[13px] font-semibold text-fg-muted">
          <Hash className="h-4 w-4" aria-hidden />
          Transactions
        </div>
        <p className="num mt-2 text-xl font-bold tracking-tight">{totals.count}</p>
      </Link>
    </div>
  );
}
