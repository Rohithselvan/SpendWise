import { CategoryIcon } from '@/components/ui/category-icon';
import { TX_COLOR, TX_SIGN } from '@/components/ui/tx-style';
import { formatINR } from '@/lib/money';
import { PAYMENT_METHOD_LABEL, TX_TYPE_LABEL, type Category, type Transaction } from '@/types';
import { formatFriendlyDate, formatRecordedTime } from '@/lib/dates';

export function transactionTitle(t: Transaction, cat?: Category): string {
  if (t.description) return t.description;
  if (t.type === 'transfer') return `Transfer to ${t.recipient || cat?.name || 'someone'}`;
  return cat?.name ?? TX_TYPE_LABEL[t.type];
}

export function TransactionRow({
  tx,
  category,
  onSelect,
  showDate = false,
  showTime = false,
  today,
}: {
  tx: Transaction;
  category?: Category;
  onSelect: (t: Transaction) => void;
  showDate?: boolean;
  /** Show when the record was saved (Asia/Kolkata), e.g. in the Daily Report. */
  showTime?: boolean;
  today?: string;
}) {
  const color = TX_COLOR[tx.type];
  const sub = [
    tx.type === 'transfer' ? `To ${category?.name ?? 'Unknown'}${tx.recipient ? ` (${tx.recipient})` : ''}` : category?.name ?? 'Unknown category',
    PAYMENT_METHOD_LABEL[tx.paymentMethod],
    showDate ? formatFriendlyDate(tx.date, today) : null,
    showTime ? formatRecordedTime(tx.createdAt, tx.date) : null,
  ]
    .filter(Boolean)
    .join(', ');
  return (
    <button type="button" onClick={() => onSelect(tx)} className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-ink-850 focus-visible:bg-ink-850">
      <CategoryIcon icon={category?.icon ?? 'shapes'} color={category?.color ?? '#94a3b8'} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold">{transactionTitle(tx, category)}</p>
        <p className="truncate text-[13px] text-fg-muted">{sub}</p>
      </div>
      <div className="text-right">
        <p className="num text-[15px] font-bold" style={{ color: tx.type === 'expense' ? undefined : color }}>
          {TX_SIGN[tx.type]}
          {formatINR(tx.amountPaise)}
        </p>
        <p className="mt-0.5 flex items-center justify-end gap-1 text-[12px] font-medium text-fg-subtle">
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} aria-hidden />
          {TX_TYPE_LABEL[tx.type]}
        </p>
      </div>
    </button>
  );
}
