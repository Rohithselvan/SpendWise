/**
 * Quick Add / Edit transaction sheet. Designed for one-handed entry in a few seconds:
 * amount first (decimal keypad), category chips, payment method, save.
 */
import * as React from 'react';
import { Banknote, CalendarDays, ChevronDown, CreditCard, Smartphone, WalletCards } from 'lucide-react';
import { Sheet } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { FieldError, Input, Label, Textarea } from '@/components/ui/input';
import { CategoryIcon } from '@/components/ui/category-icon';
import { TX_COLOR } from '@/components/ui/tx-style';
import { useToast } from '@/components/ui/toast';
import { useCategoriesOfType } from '@/hooks/useData';
import { useToday } from '@/hooks/useToday';
import { addTransaction, updateTransaction } from '@/repositories/transactions';
import { FATHER_RECIPIENT_ID } from '@/db/seed';
import { addDaysISO, formatDisplayDate, isValidISODate } from '@/lib/dates';
import { formatINR, paiseToRupeeString, parseRupeesToPaise } from '@/lib/money';
import { cn, friendlyError } from '@/lib/utils';
import { PAYMENT_METHOD_LABEL, TX_TYPES, TX_TYPE_LABEL, type PaymentMethod, type TxType } from '@/types';
import type { QuickAddRequest } from './QuickAddContext';
import { useSettings } from '@/hooks/useData';

const PM_ICONS: Record<PaymentMethod, typeof Smartphone> = { upi: Smartphone, debit_card: CreditCard, cash: Banknote, other: WalletCards };
const LAST_PM_KEY = 'spendwise-last-payment-method';

function lastPaymentMethod(): PaymentMethod {
  try {
    const v = localStorage.getItem(LAST_PM_KEY);
    if (v === 'upi' || v === 'debit_card' || v === 'cash' || v === 'other') return v;
  } catch {
    /* ignore */
  }
  return 'upi';
}

const PARTIAL_AMOUNT = /^\d{0,11}(\.\d{0,2})?$/;

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  request: QuickAddRequest;
  onAddAnother: (type: TxType) => void;
}

export function TransactionSheet({ open, onOpenChange, request, onAddAnother }: Props) {
  const today = useToday();
  const toast = useToast();
  const { dateFormat } = useSettings();
  const editing = request.mode === 'edit' ? request.tx : null;
  const isFatherShortcut = request.mode === 'create' && request.categoryId === FATHER_RECIPIENT_ID;

  const [type, setType] = React.useState<TxType>(editing?.type ?? (request.mode === 'create' ? request.type ?? 'expense' : 'expense'));
  const [amount, setAmount] = React.useState(editing ? paiseToRupeeString(editing.amountPaise, false) : '');
  const [date, setDate] = React.useState(editing?.date ?? today);
  const [categoryId, setCategoryId] = React.useState<string>(editing?.categoryId ?? (request.mode === 'create' ? request.categoryId ?? '' : ''));
  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod>(editing?.paymentMethod ?? lastPaymentMethod());
  const [description, setDescription] = React.useState(editing?.description ?? '');
  const [recipient, setRecipient] = React.useState(editing?.recipient ?? '');
  const [notes, setNotes] = React.useState(editing?.notes ?? '');
  const [showNotes, setShowNotes] = React.useState(!!editing?.notes);
  const [errors, setErrors] = React.useState<Partial<Record<'amount' | 'date' | 'category' | 'form', string>>>({});
  const [saving, setSaving] = React.useState(false);

  const categories = useCategoriesOfType(type);
  const amountRef = React.useRef<HTMLInputElement>(null);
  const dateRef = React.useRef<HTMLInputElement>(null);

  // Keep a valid category selected for the chosen type.
  React.useEffect(() => {
    if (!categories.length) return;
    if (!categories.some((c) => c.id === categoryId)) {
      const fallback = type === 'transfer' ? categories.find((c) => c.id === FATHER_RECIPIENT_ID) : undefined;
      setCategoryId((fallback ?? categories[0]!).id);
    }
  }, [categories, categoryId, type]);

  const paise = parseRupeesToPaise(amount);
  const color = TX_COLOR[type];
  const selectedCategory = categories.find((c) => c.id === categoryId);
  const title = editing ? `Edit ${TX_TYPE_LABEL[type].toLowerCase()}` : isFatherShortcut ? 'Transfer to Father' : `Add ${TX_TYPE_LABEL[type].toLowerCase()}`;

  function onAmountChange(v: string) {
    const cleaned = v.replace(/[,\s₹]/g, '');
    if (PARTIAL_AMOUNT.test(cleaned)) {
      setAmount(cleaned);
      if (errors.amount) setErrors((e) => ({ ...e, amount: undefined }));
    }
  }

  async function save() {
    const next: typeof errors = {};
    if (paise === null || paise <= 0) next.amount = 'Enter an amount greater than ₹0';
    if (!isValidISODate(date)) next.date = 'Choose a valid date';
    if (!selectedCategory) next.category = type === 'transfer' ? 'Choose a recipient' : 'Choose a category';
    setErrors(next);
    if (Object.keys(next).length) {
      if (next.amount) amountRef.current?.focus();
      return;
    }
    setSaving(true);
    try {
      const input = {
        type,
        amountPaise: paise!,
        date,
        categoryId,
        description: description.trim(),
        recipient: type === 'transfer' ? recipient.trim() : '',
        paymentMethod,
        notes: notes.trim(),
      };
      if (editing) await updateTransaction(editing.id, input);
      else await addTransaction(input);
      try {
        localStorage.setItem(LAST_PM_KEY, paymentMethod);
      } catch {
        /* ignore */
      }
      onOpenChange(false);
      const what = type === 'transfer' && selectedCategory ? `Transfer to ${selectedCategory.name}` : TX_TYPE_LABEL[type];
      toast.success(
        editing ? 'Changes saved' : `${what} of ${formatINR(paise!)} saved`,
        editing ? undefined : { label: 'Add another', onClick: () => onAddAnother(type) },
      );
    } catch (err) {
      setErrors({ form: friendlyError(err, 'Could not save. Your device storage may be full or unavailable.') });
    } finally {
      setSaving(false);
    }
  }

  const dateChip = (label: string, value: string) => (
    <button
      type="button"
      onClick={() => setDate(value)}
      aria-pressed={date === value}
      className={cn('h-10 rounded-xl border px-3.5 text-sm font-semibold', date === value ? 'border-transparent bg-ink-700 text-fg' : 'border-line text-fg-muted hover:text-fg')}
    >
      {label}
    </button>
  );
  const isCustomDate = date !== today && date !== addDaysISO(today, -1);

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      initialFocus={amountRef}
      footer={
        <div>
          {errors.form && <FieldError>{errors.form}</FieldError>}
          <Button size="lg" className="mt-1 w-full" onClick={() => void save()} disabled={saving} style={{ backgroundColor: color }}>
            {saving ? 'Saving…' : editing ? 'Save changes' : `Save ${TX_TYPE_LABEL[type].toLowerCase()}`}
          </Button>
        </div>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
        noValidate
      >
        {/* Type selector — hidden for the Father shortcut to keep it to amount/date/method */}
        {!isFatherShortcut && (
          <div role="radiogroup" aria-label="Transaction type" className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 scrollbar-none">
            {TX_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={type === t}
                onClick={() => setType(t)}
                className={cn('h-9 shrink-0 rounded-full border px-3.5 text-sm font-semibold transition-colors', type === t ? 'border-transparent text-[#06130d]' : 'border-line text-fg-muted hover:text-fg')}
                style={type === t ? { backgroundColor: TX_COLOR[t] } : undefined}
              >
                {TX_TYPE_LABEL[t]}
              </button>
            ))}
          </div>
        )}

        {/* Amount */}
        <div className="mt-5">
          <label htmlFor="amount" className="sr-only">
            Amount in rupees
          </label>
          <div className="flex items-baseline gap-1 border-b-2 pb-2 transition-colors" style={{ borderColor: paise ? color : 'rgb(var(--line))' }}>
            <span className="text-4xl font-semibold text-fg-subtle" aria-hidden>
              ₹
            </span>
            <input
              ref={amountRef}
              id="amount"
              inputMode="decimal"
              autoComplete="off"
              enterKeyHint="done"
              placeholder="0"
              value={amount}
              onChange={(e) => onAmountChange(e.target.value)}
              aria-invalid={!!errors.amount}
              aria-describedby={errors.amount ? 'amount-error' : 'amount-hint'}
              className="num w-full min-w-0 bg-transparent text-[44px] font-bold leading-tight tracking-tight text-fg placeholder:text-ink-600 focus:outline-none"
            />
          </div>
          <p id="amount-hint" className="num mt-1.5 h-5 text-sm text-fg-muted">
            {paise && paise >= 100000 ? formatINR(paise) : ''}
          </p>
          <FieldError id="amount-error">{errors.amount}</FieldError>
        </div>

        {/* Category / recipient */}
        <fieldset className="mt-3">
          <legend className="mb-2 text-sm font-medium text-fg-muted">{type === 'transfer' ? 'Recipient' : 'Category'}</legend>
          <div className="grid grid-cols-4 gap-2">
            {categories.map((c) => {
              const active = c.id === categoryId;
              return (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setCategoryId(c.id)}
                  className={cn('flex min-h-[72px] flex-col items-center justify-center gap-1.5 rounded-2xl border px-1 py-2 text-center transition-colors', active ? 'bg-ink-800' : 'border-line hover:bg-ink-850')}
                  style={active ? { borderColor: c.color } : undefined}
                >
                  <CategoryIcon icon={c.icon} color={c.color} size="sm" />
                  <span className={cn('line-clamp-2 text-[12px] font-semibold leading-tight', active ? 'text-fg' : 'text-fg-muted')}>{c.name}</span>
                </button>
              );
            })}
          </div>
          <FieldError>{errors.category}</FieldError>
        </fieldset>

        {/* Payment method */}
        <fieldset className="mt-5">
          <legend className="mb-2 text-sm font-medium text-fg-muted">Paid with</legend>
          <div role="radiogroup" aria-label="Payment method" className="grid grid-cols-4 gap-2">
            {(Object.keys(PAYMENT_METHOD_LABEL) as PaymentMethod[]).map((pm) => {
              const Icon = PM_ICONS[pm];
              const active = pm === paymentMethod;
              return (
                <button
                  key={pm}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setPaymentMethod(pm)}
                  className={cn('flex h-[60px] flex-col items-center justify-center gap-1 rounded-xl border text-[12.5px] font-semibold', active ? 'border-emerald-500 bg-emerald-500/10 text-fg' : 'border-line text-fg-muted hover:text-fg')}
                >
                  <Icon className="h-[18px] w-[18px]" aria-hidden />
                  {PAYMENT_METHOD_LABEL[pm]}
                </button>
              );
            })}
          </div>
        </fieldset>

        {/* Date */}
        <fieldset className="mt-5">
          <legend className="mb-2 text-sm font-medium text-fg-muted">Date</legend>
          <div className="flex flex-wrap items-center gap-2">
            {dateChip('Today', today)}
            {dateChip('Yesterday', addDaysISO(today, -1))}
            <label className={cn('relative flex h-10 cursor-pointer items-center gap-2 rounded-xl border px-3.5 text-sm font-semibold', isCustomDate ? 'border-transparent bg-ink-700 text-fg' : 'border-line text-fg-muted')}>
              <CalendarDays className="h-4 w-4" aria-hidden />
              <span>{isCustomDate && isValidISODate(date) ? formatDisplayDate(date, dateFormat) : 'Pick date'}</span>
              <input
                ref={dateRef}
                type="date"
                aria-label="Pick a date"
                value={isValidISODate(date) ? date : ''}
                max="2200-12-31"
                onChange={(e) => e.target.value && setDate(e.target.value)}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
            </label>
          </div>
          <FieldError>{errors.date}</FieldError>
        </fieldset>

        {/* Description / recipient name */}
        <div className="mt-5 space-y-4">
          {type === 'transfer' && categoryId !== FATHER_RECIPIENT_ID && (
            <div>
              <Label htmlFor="recipient">Recipient name (optional)</Label>
              <Input id="recipient" value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="e.g. Rahul" maxLength={60} autoComplete="off" />
            </div>
          )}
          <div>
            <Label htmlFor="description">{type === 'expense' ? 'What or where (optional)' : 'Description (optional)'}</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={type === 'expense' ? 'e.g. Swiggy, Indian Oil' : type === 'transfer' ? 'e.g. Monthly transfer' : ''}
              maxLength={120}
              autoComplete="off"
              enterKeyHint="done"
            />
          </div>
          {showNotes ? (
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} />
            </div>
          ) : (
            <button type="button" onClick={() => setShowNotes(true)} className="flex items-center gap-1 text-sm font-semibold text-accent">
              <ChevronDown className="h-4 w-4" aria-hidden /> Add notes
            </button>
          )}
        </div>
        <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
      </form>
    </Sheet>
  );
}
