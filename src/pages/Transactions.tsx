import * as React from 'react';
import { useSearchParams } from 'react-router-dom';
import { ListFilter, Plus, ReceiptText, Search, SearchX, X } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { TX_COLOR } from '@/components/ui/tx-style';
import { TransactionRow } from '@/components/transactions/TransactionRow';
import { TransactionDetailSheet } from '@/components/transactions/TransactionDetailSheet';
import { FiltersSheet, SORT_LABEL } from '@/components/transactions/FiltersSheet';
import { useQuickAdd } from '@/components/transactions/QuickAddContext';
import { useAllTransactions, useCategoryMap, useSettings } from '@/hooks/useData';
import { useToday } from '@/hooks/useToday';
import { activeFilterCount, EMPTY_FILTERS, filterTransactions, type SortOrder, type TxFilters } from '@/services/filters';
import { computeTotals } from '@/services/calculations';
import { formatDisplayDate, formatFriendlyDate, isValidISODate } from '@/lib/dates';
import { formatINR } from '@/lib/money';
import { PAYMENT_METHODS, PAYMENT_METHOD_LABEL, TX_TYPES, TX_TYPE_LABEL, TX_TYPE_PLURAL, type PaymentMethod, type Transaction, type TxType } from '@/types';

const PAGE = 150;

function readFilters(p: URLSearchParams): TxFilters {
  const list = (k: string) => (p.get(k) ?? '').split(',').filter(Boolean);
  const sort = p.get('sort');
  const from = p.get('from');
  const to = p.get('to');
  return {
    query: p.get('q') ?? '',
    types: list('type').filter((t): t is TxType => (TX_TYPES as readonly string[]).includes(t)),
    categoryIds: list('cat'),
    paymentMethods: list('pm').filter((m): m is PaymentMethod => (PAYMENT_METHODS as readonly string[]).includes(m)),
    start: from && isValidISODate(from) ? from : null,
    end: to && isValidISODate(to) ? to : null,
    sort: sort && sort in SORT_LABEL ? (sort as SortOrder) : 'newest',
  };
}

function writeFilters(f: TxFilters): URLSearchParams {
  const p = new URLSearchParams();
  if (f.query) p.set('q', f.query);
  if (f.types.length) p.set('type', f.types.join(','));
  if (f.categoryIds.length) p.set('cat', f.categoryIds.join(','));
  if (f.paymentMethods.length) p.set('pm', f.paymentMethods.join(','));
  if (f.start) p.set('from', f.start);
  if (f.end) p.set('to', f.end);
  if (f.sort !== 'newest') p.set('sort', f.sort);
  return p;
}

export default function Transactions() {
  const [params, setParams] = useSearchParams();
  const filters = React.useMemo(() => readFilters(params), [params]);
  const all = useAllTransactions();
  const categories = useCategoryMap();
  const { dateFormat } = useSettings();
  const today = useToday();
  const quickAdd = useQuickAdd();
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<Transaction | null>(null);
  const [limit, setLimit] = React.useState(PAGE);
  const [query, setQuery] = React.useState(filters.query);

  const apply = React.useCallback((f: TxFilters) => setParams(writeFilters(f), { replace: true }), [setParams]);

  // Debounce search input into the URL.
  React.useEffect(() => {
    if (query === filters.query) return;
    const id = window.setTimeout(() => apply({ ...filters, query }), 200);
    return () => window.clearTimeout(id);
  }, [query, filters, apply]);

  React.useEffect(() => setLimit(PAGE), [params]);

  const results = React.useMemo(() => (all ? filterTransactions(all, filters, categories) : []), [all, filters, categories]);
  const totals = React.useMemo(() => computeTotals(results), [results]);
  const shown = results.slice(0, limit);
  const groupByDate = filters.sort === 'newest' || filters.sort === 'oldest';
  const nFilters = activeFilterCount(filters);

  // Pills describing active filters, each removable.
  const pills: { label: string; remove: () => void }[] = [
    ...filters.types.map((t) => ({ label: TX_TYPE_LABEL[t], remove: () => apply({ ...filters, types: filters.types.filter((x) => x !== t) }) })),
    ...filters.categoryIds.map((id) => ({ label: categories.get(id)?.name ?? 'Category', remove: () => apply({ ...filters, categoryIds: filters.categoryIds.filter((x) => x !== id) }) })),
    ...filters.paymentMethods.map((m) => ({ label: PAYMENT_METHOD_LABEL[m], remove: () => apply({ ...filters, paymentMethods: filters.paymentMethods.filter((x) => x !== m) }) })),
    ...(filters.start || filters.end
      ? [{ label: `${filters.start ? formatDisplayDate(filters.start, dateFormat) : 'Start'} – ${filters.end ? formatDisplayDate(filters.end, dateFormat) : 'Today'}`, remove: () => apply({ ...filters, start: null, end: null }) }]
      : []),
  ];

  const summaryTypes = TX_TYPES.filter((t) => totals[t] > 0);

  return (
    <>
      <PageHeader
        title="Transactions"
        action={
          <Button size="sm" className="hidden sm:inline-flex" onClick={() => quickAdd.open()}>
            <Plus className="h-4 w-4" aria-hidden /> Add
          </Button>
        }
      />

      <div className="sticky top-0 z-20 -mx-4 bg-ink-950/95 px-4 pb-3 pt-[max(8px,env(safe-area-inset-top))] backdrop-blur sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search description, merchant, recipient"
              aria-label="Search transactions"
              className="h-11 w-full rounded-xl border border-line bg-ink-900 pl-10 pr-3 text-[16px] placeholder:text-fg-subtle focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <Button variant="secondary" onClick={() => setFiltersOpen(true)} aria-label={`Filter and sort${nFilters ? `, ${nFilters} active` : ''}`} className="relative px-3.5">
            <ListFilter className="h-5 w-5" aria-hidden />
            <span className="hidden sm:inline">Filter</span>
            {nFilters > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-emerald-500 px-1 text-[11px] font-bold text-[#04140c]">{nFilters}</span>}
          </Button>
        </div>
        {(pills.length > 0 || filters.sort !== 'newest') && (
          <div className="mt-2 flex gap-2 overflow-x-auto scrollbar-none">
            {filters.sort !== 'newest' && <span className="flex h-8 shrink-0 items-center rounded-full bg-ink-800 px-3 text-[13px] font-semibold text-fg-muted">{SORT_LABEL[filters.sort]}</span>}
            {pills.map((p) => (
              <button key={p.label} type="button" onClick={p.remove} className="flex h-8 shrink-0 items-center gap-1 rounded-full bg-ink-800 pl-3 pr-2 text-[13px] font-semibold" aria-label={`Remove filter ${p.label}`}>
                {p.label} <X className="h-3.5 w-3.5 text-fg-subtle" aria-hidden />
              </button>
            ))}
          </div>
        )}
      </div>

      {all === undefined ? (
        <div className="h-64 animate-pulse rounded-2xl bg-ink-900" aria-busy="true" aria-label="Loading" />
      ) : all.length === 0 ? (
        <Card>
          <EmptyState icon={ReceiptText} title="No transactions yet" body="Everything you record will appear here." action={<Button onClick={() => quickAdd.open()}><Plus className="h-4 w-4" aria-hidden /> Add a transaction</Button>} />
        </Card>
      ) : results.length === 0 ? (
        <Card>
          <EmptyState
            icon={SearchX}
            title="No matching transactions"
            body="Try a different search or remove some filters."
            action={
              <Button variant="secondary" onClick={() => { setQuery(''); apply(EMPTY_FILTERS); }}>
                Clear search and filters
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-fg-muted" aria-live="polite">
            <span>
              {results.length} {results.length === 1 ? 'transaction' : 'transactions'}
            </span>
            {summaryTypes.map((t) => (
              <span key={t} className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: TX_COLOR[t] }} aria-hidden />
                {TX_TYPE_PLURAL[t]} <span className="num font-semibold text-fg">{formatINR(totals[t])}</span>
              </span>
            ))}
          </div>
          <Card className="p-2">
            {groupByDate ? <GroupedList txs={shown} categories={categories} onSelect={setSelected} today={today} /> : shown.map((t) => <TransactionRow key={t.id} tx={t} category={categories.get(t.categoryId)} onSelect={setSelected} showDate today={today} />)}
          </Card>
          {results.length > limit && (
            <div className="mt-4 flex justify-center">
              <Button variant="secondary" onClick={() => setLimit((l) => l + PAGE)}>
                Show more ({results.length - limit} left)
              </Button>
            </div>
          )}
        </>
      )}

      <FiltersSheet open={filtersOpen} onOpenChange={setFiltersOpen} value={filters} onApply={(f) => apply({ ...f, query })} />
      <TransactionDetailSheet tx={selected} onClose={() => setSelected(null)} />
    </>
  );
}

function GroupedList({ txs, categories, onSelect, today }: { txs: Transaction[]; categories: ReturnType<typeof useCategoryMap>; onSelect: (t: Transaction) => void; today: string }) {
  const groups: { date: string; items: Transaction[] }[] = [];
  for (const t of txs) {
    const last = groups[groups.length - 1];
    if (last && last.date === t.date) last.items.push(t);
    else groups.push({ date: t.date, items: [t] });
  }
  return (
    <div>
      {groups.map((g) => {
        const spent = g.items.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amountPaise, 0);
        return (
          <section key={g.date} aria-label={formatFriendlyDate(g.date, today)}>
            <div className="flex items-center justify-between px-2 pb-1 pt-3 text-[13px] font-semibold text-fg-muted">
              <h3>{formatFriendlyDate(g.date, today)}</h3>
              {spent > 0 && <span className="num">Spent {formatINR(spent)}</span>}
            </div>
            {g.items.map((t) => (
              <TransactionRow key={t.id} tx={t} category={categories.get(t.categoryId)} onSelect={onSelect} />
            ))}
          </section>
        );
      })}
    </div>
  );
}
