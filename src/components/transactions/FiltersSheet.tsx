import * as React from 'react';
import { Sheet } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input, Label, Select } from '@/components/ui/input';
import { CategoryIcon } from '@/components/ui/category-icon';
import { TX_COLOR } from '@/components/ui/tx-style';
import { useCategories } from '@/hooks/useData';
import { EMPTY_FILTERS, type SortOrder, type TxFilters } from '@/services/filters';
import { PAYMENT_METHOD_LABEL, TX_TYPES, TX_TYPE_LABEL, type PaymentMethod } from '@/types';
import { cn } from '@/lib/utils';

function toggle<T>(list: T[], v: T): T[] {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

export const SORT_LABEL: Record<SortOrder, string> = {
  newest: 'Newest first',
  oldest: 'Oldest first',
  highest: 'Highest amount',
  lowest: 'Lowest amount',
};

export function FiltersSheet({ open, onOpenChange, value, onApply }: { open: boolean; onOpenChange: (o: boolean) => void; value: TxFilters; onApply: (f: TxFilters) => void }) {
  const [draft, setDraft] = React.useState(value);
  const categories = useCategories() ?? [];
  React.useEffect(() => {
    if (open) setDraft(value);
  }, [open, value]);

  const visibleCats = draft.types.length ? categories.filter((c) => draft.types.includes(c.type)) : categories;
  const dateError = draft.start && draft.end && draft.start > draft.end ? 'The start date must be on or before the end date' : null;

  const chip = (active: boolean, onClick: () => void, children: React.ReactNode, color?: string) => (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn('flex h-10 items-center gap-2 rounded-full border px-3.5 text-sm font-semibold', active ? 'border-transparent bg-ink-700 text-fg' : 'border-line text-fg-muted')}
      style={active && color ? { boxShadow: `inset 0 0 0 1.5px ${color}` } : undefined}
    >
      {children}
    </button>
  );

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Filter and sort"
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={() => setDraft({ ...EMPTY_FILTERS, query: draft.query })}>
            Clear all
          </Button>
          <Button
            className="flex-1"
            disabled={!!dateError}
            onClick={() => {
              onApply(draft);
              onOpenChange(false);
            }}
          >
            Show results
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        <div>
          <Label htmlFor="sort">Sort</Label>
          <Select id="sort" value={draft.sort} onChange={(e) => setDraft({ ...draft, sort: e.target.value as SortOrder })}>
            {(Object.keys(SORT_LABEL) as SortOrder[]).map((s) => (
              <option key={s} value={s}>
                {SORT_LABEL[s]}
              </option>
            ))}
          </Select>
        </div>

        <fieldset>
          <legend className="mb-2 text-sm font-medium text-fg-muted">Type</legend>
          <div className="flex flex-wrap gap-2">
            {TX_TYPES.map((t) =>
              chip(
                draft.types.includes(t),
                () => setDraft({ ...draft, types: toggle(draft.types, t), categoryIds: [] }),
                <>
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: TX_COLOR[t] }} aria-hidden />
                  {TX_TYPE_LABEL[t]}
                </>,
                TX_COLOR[t],
              ),
            )}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-sm font-medium text-fg-muted">Category or recipient</legend>
          <div className="flex flex-wrap gap-2">
            {visibleCats.map((c) =>
              <React.Fragment key={c.id}>
                {chip(
                  draft.categoryIds.includes(c.id),
                  () => setDraft({ ...draft, categoryIds: toggle(draft.categoryIds, c.id) }),
                  <>
                    <CategoryIcon icon={c.icon} color={c.color} size="sm" className="-ml-2 h-7 w-7 rounded-full" />
                    {c.name}
                  </>,
                  c.color,
                )}
              </React.Fragment>,
            )}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-sm font-medium text-fg-muted">Payment method</legend>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(PAYMENT_METHOD_LABEL) as PaymentMethod[]).map((pm) =>
              <React.Fragment key={pm}>{chip(draft.paymentMethods.includes(pm), () => setDraft({ ...draft, paymentMethods: toggle(draft.paymentMethods, pm) }), PAYMENT_METHOD_LABEL[pm])}</React.Fragment>,
            )}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-sm font-medium text-fg-muted">Date range</legend>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="f-from">From</Label>
              <Input id="f-from" type="date" value={draft.start ?? ''} onChange={(e) => setDraft({ ...draft, start: e.target.value || null })} />
            </div>
            <div>
              <Label htmlFor="f-to">To</Label>
              <Input id="f-to" type="date" value={draft.end ?? ''} onChange={(e) => setDraft({ ...draft, end: e.target.value || null })} />
            </div>
          </div>
          {dateError && <p role="alert" className="mt-2 text-sm text-[#ff8a80]">{dateError}</p>}
        </fieldset>
      </div>
    </Sheet>
  );
}
