import * as React from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { Sheet } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { CategoryIcon } from '@/components/ui/category-icon';
import { TX_COLOR } from '@/components/ui/tx-style';
import { useToast } from '@/components/ui/toast';
import { useQuickAdd } from './QuickAddContext';
import { transactionTitle } from './TransactionRow';
import { deleteTransaction, restoreTransaction } from '@/repositories/transactions';
import { useCategoryMap, useSettings } from '@/hooks/useData';
import { formatDisplayDate } from '@/lib/dates';
import { formatINR } from '@/lib/money';
import { friendlyError } from '@/lib/utils';
import { PAYMENT_METHOD_LABEL, TX_TYPE_LABEL, type Transaction } from '@/types';

export function TransactionDetailSheet({ tx, onClose }: { tx: Transaction | null; onClose: () => void }) {
  const cats = useCategoryMap();
  const { dateFormat } = useSettings();
  const quickAdd = useQuickAdd();
  const toast = useToast();
  const [confirm, setConfirm] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const cat = tx ? cats.get(tx.categoryId) : undefined;

  async function remove() {
    if (!tx) return;
    setBusy(true);
    try {
      const snapshot = tx;
      await deleteTransaction(tx.id);
      setConfirm(false);
      onClose();
      toast.success('Transaction deleted', {
        label: 'Undo',
        onClick: () => void restoreTransaction(snapshot).then(() => toast.show('Transaction restored')),
      });
    } catch (err) {
      toast.error(friendlyError(err, 'Could not delete the transaction.'));
    } finally {
      setBusy(false);
    }
  }

  const row = (label: string, value: React.ReactNode) => (
    <div className="flex justify-between gap-4 border-b border-line py-3 last:border-0">
      <dt className="text-sm text-fg-muted">{label}</dt>
      <dd className="text-right text-[15px] font-medium">{value}</dd>
    </div>
  );

  return (
    <>
      <Sheet
        open={!!tx}
        onOpenChange={(o) => !o && onClose()}
        title="Transaction details"
        footer={
          tx && (
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => setConfirm(true)}>
                <Trash2 className="h-4 w-4" aria-hidden /> Delete
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  onClose();
                  quickAdd.open({ mode: 'edit', tx });
                }}
              >
                <Pencil className="h-4 w-4" aria-hidden /> Edit
              </Button>
            </div>
          )
        }
      >
        {tx && (
          <div>
            <div className="flex items-center gap-3 pt-1">
              <CategoryIcon icon={cat?.icon ?? 'shapes'} color={cat?.color ?? '#94a3b8'} size="lg" />
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold">{transactionTitle(tx, cat)}</p>
                <p className="text-sm font-semibold" style={{ color: TX_COLOR[tx.type] }}>
                  {TX_TYPE_LABEL[tx.type]}
                  {tx.type !== 'expense' && ' — not counted as personal spending'}
                </p>
              </div>
            </div>
            <p className="num mt-5 text-4xl font-bold tracking-tight">{formatINR(tx.amountPaise, { decimals: 'always' })}</p>
            <dl className="mt-4">
              {row('Date', formatDisplayDate(tx.date, dateFormat))}
              {row(tx.type === 'transfer' ? 'Recipient' : 'Category', `${cat?.name ?? 'Unknown'}${tx.recipient ? ` (${tx.recipient})` : ''}`)}
              {row('Paid with', PAYMENT_METHOD_LABEL[tx.paymentMethod])}
              {tx.description && row('Description', tx.description)}
              {tx.notes && row('Notes', <span className="whitespace-pre-wrap">{tx.notes}</span>)}
              {row('Last changed', new Date(tx.updatedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' }))}
            </dl>
          </div>
        )}
      </Sheet>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Delete this transaction?"
        description={tx ? `${transactionTitle(tx, cat)} — ${formatINR(tx.amountPaise)}. You can undo right after deleting.` : ''}
        confirmLabel="Delete"
        danger
        busy={busy}
        onConfirm={remove}
      />
    </>
  );
}
