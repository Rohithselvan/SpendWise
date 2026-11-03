import { Banknote, CreditCard, Smartphone, WalletCards } from 'lucide-react';
import type { BreakdownRow } from '@/services/calculations';
import { PAYMENT_METHOD_LABEL, type PaymentMethod } from '@/types';
import { formatINR } from '@/lib/money';

const ICON = { upi: Smartphone, debit_card: CreditCard, cash: Banknote, other: WalletCards } satisfies Record<PaymentMethod, unknown>;
const COLOR: Record<PaymentMethod, string> = { upi: '#2fd08a', debit_card: '#7aa7ff', cash: '#e8c25a', other: '#94a3b8' };

export function PaymentMethodBars({ rows, onSelect }: { rows: BreakdownRow<PaymentMethod>[]; onSelect?: (pm: PaymentMethod) => void }) {
  return (
    <ul className="space-y-3">
      {rows.map((r) => {
        const Icon = ICON[r.key];
        return (
          <li key={r.key}>
            <button type="button" disabled={!onSelect} onClick={() => onSelect?.(r.key)} className="w-full text-left enabled:hover:opacity-80">
              <div className="flex items-center gap-2 text-sm">
                <Icon className="h-4 w-4 text-fg-muted" aria-hidden />
                <span className="font-semibold">{PAYMENT_METHOD_LABEL[r.key]}</span>
                <span className="text-fg-subtle">{r.count} {r.count === 1 ? 'payment' : 'payments'}</span>
                <span className="num ml-auto font-bold">{formatINR(r.totalPaise)}</span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-ink-800" aria-hidden>
                <div className="h-full rounded-full" style={{ width: `${Math.max(1.5, r.percent)}%`, backgroundColor: COLOR[r.key] }} />
              </div>
              <span className="sr-only">{r.percent}% of spending</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
