import * as React from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Lock, Pencil, Plus, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { FieldError, Input, Label, Select } from '@/components/ui/input';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { CATEGORY_COLORS, CATEGORY_ICONS, CategoryIcon, ICON_KEYS } from '@/components/ui/category-icon';
import { TX_COLOR } from '@/components/ui/tx-style';
import { useToast } from '@/components/ui/toast';
import { useAllTransactions, useCategories } from '@/hooks/useData';
import { addCategory, canDeleteCategory, deleteCategory, updateCategory } from '@/repositories/categories';
import { cn, friendlyError } from '@/lib/utils';
import { TX_TYPES, type Category, type TxType } from '@/types';

const TAB_LABEL: Record<TxType, string> = { expense: 'Expense', income: 'Income', transfer: 'Recipients', savings: 'Savings', investment: 'Investment' };

export default function Categories() {
  const [type, setType] = React.useState<TxType>('expense');
  const categories = useCategories();
  const all = useAllTransactions();
  const [editing, setEditing] = React.useState<Category | 'new' | null>(null);
  const [deleting, setDeleting] = React.useState<Category | null>(null);

  const usage = React.useMemo(() => {
    const m = new Map<string, number>();
    for (const t of all ?? []) m.set(t.categoryId, (m.get(t.categoryId) ?? 0) + 1);
    return m;
  }, [all]);
  const list = (categories ?? []).filter((c) => c.type === type);

  return (
    <>
      <Link to="/settings" className="mt-4 inline-flex h-10 items-center gap-1 text-sm font-semibold text-fg-muted hover:text-fg lg:mt-8">
        <ChevronLeft className="h-4 w-4" aria-hidden /> Settings
      </Link>
      <PageHeader
        title="Categories"
        subtitle={type === 'transfer' ? 'Who you send money to. Father is a recipient, not an expense.' : undefined}
        action={
          <Button size="sm" onClick={() => setEditing('new')}>
            <Plus className="h-4 w-4" aria-hidden /> New
          </Button>
        }
      />
      <div role="tablist" aria-label="Category type" className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 scrollbar-none sm:mx-0 sm:px-0">
        {TX_TYPES.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={type === t}
            type="button"
            onClick={() => setType(t)}
            className={cn('h-9 shrink-0 rounded-full border px-3.5 text-sm font-semibold', type === t ? 'border-transparent bg-ink-700 text-fg' : 'border-line text-fg-muted')}
            style={type === t ? { boxShadow: `inset 0 -2px 0 ${TX_COLOR[t]}` } : undefined}
          >
            {TAB_LABEL[t]}
          </button>
        ))}
      </div>
      <Card className="divide-y divide-line" role="tabpanel">
        {list.map((c) => {
          const n = usage.get(c.id) ?? 0;
          const del = canDeleteCategory(c, list.length);
          return (
            <div key={c.id} className="flex items-center gap-3 px-3 py-2.5">
              <CategoryIcon icon={c.icon} color={c.color} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold">{c.name}</p>
                <p className="text-[13px] text-fg-muted">
                  {n} {n === 1 ? 'transaction' : 'transactions'}
                  {c.isDefault ? ', built-in' : ''}
                </p>
              </div>
              <Button size="icon" variant="ghost" aria-label={`Edit ${c.name}`} onClick={() => setEditing(c)}>
                <Pencil className="h-[18px] w-[18px]" />
              </Button>
              {del.ok ? (
                <Button size="icon" variant="ghost" aria-label={`Delete ${c.name}`} onClick={() => setDeleting(c)}>
                  <Trash2 className="h-[18px] w-[18px]" />
                </Button>
              ) : (
                <span className="grid h-11 w-11 place-items-center text-fg-subtle" title={del.reason}>
                  <Lock className="h-4 w-4" aria-label={del.reason} />
                </span>
              )}
            </div>
          );
        })}
      </Card>

      <CategoryEditor key={editing === 'new' ? `new-${type}` : editing?.id ?? 'none'} value={editing} type={type} onClose={() => setEditing(null)} />
      <DeleteCategoryDialog category={deleting} usage={deleting ? usage.get(deleting.id) ?? 0 : 0} siblings={list.filter((c) => c.id !== deleting?.id)} onClose={() => setDeleting(null)} />
    </>
  );
}

function CategoryEditor({ value, type, onClose }: { value: Category | 'new' | null; type: TxType; onClose: () => void }) {
  const toast = useToast();
  const existing = value && value !== 'new' ? value : null;
  const [name, setName] = React.useState(existing?.name ?? '');
  const [icon, setIcon] = React.useState(existing?.icon ?? 'shapes');
  const [color, setColor] = React.useState(existing?.color ?? CATEGORY_COLORS[0]!);
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      if (existing) await updateCategory(existing.id, { name, icon, color });
      else await addCategory({ type, name, icon, color });
      toast.success(existing ? 'Category updated' : 'Category added');
      onClose();
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={!!value} onOpenChange={(o) => !o && onClose()} title={existing ? 'Edit category' : `New ${TAB_LABEL[type].toLowerCase()} category`} footer={<Button className="w-full" size="lg" disabled={saving} onClick={() => void save()}>{existing ? 'Save changes' : 'Add category'}</Button>}>
      <div className="flex items-center gap-3">
        <CategoryIcon icon={icon} color={color} size="lg" />
        <div className="flex-1">
          <Label htmlFor="cat-name">Name</Label>
          <Input id="cat-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} autoComplete="off" />
        </div>
      </div>
      <FieldError>{error}</FieldError>
      <fieldset className="mt-5">
        <legend className="mb-2 text-sm font-medium text-fg-muted">Colour</legend>
        <div className="flex flex-wrap gap-2">
          {CATEGORY_COLORS.map((c) => (
            <button key={c} type="button" aria-label={`Colour ${c}`} aria-pressed={color === c} onClick={() => setColor(c)} className={cn('h-9 w-9 rounded-full border-2', color === c ? 'border-fg' : 'border-transparent')} style={{ backgroundColor: c }} />
          ))}
        </div>
      </fieldset>
      <fieldset className="mt-5">
        <legend className="mb-2 text-sm font-medium text-fg-muted">Icon</legend>
        <div className="grid grid-cols-7 gap-2 sm:grid-cols-9">
          {ICON_KEYS.map((k) => {
            const Icon = CATEGORY_ICONS[k]!;
            return (
              <button key={k} type="button" aria-label={k.replace(/-/g, ' ')} aria-pressed={icon === k} onClick={() => setIcon(k)} className={cn('grid aspect-square place-items-center rounded-xl border', icon === k ? 'border-emerald-500 bg-emerald-500/10 text-fg' : 'border-line text-fg-muted')}>
                <Icon className="h-5 w-5" aria-hidden />
              </button>
            );
          })}
        </div>
      </fieldset>
    </Sheet>
  );
}

function DeleteCategoryDialog({ category, usage, siblings, onClose }: { category: Category | null; usage: number; siblings: Category[]; onClose: () => void }) {
  const toast = useToast();
  const [picked, setPicked] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const categoryId = category?.id;
  React.useEffect(() => setPicked(''), [categoryId]);
  const target = siblings.some((s) => s.id === picked) ? picked : siblings[0]?.id ?? '';

  async function run() {
    if (!category) return;
    setBusy(true);
    try {
      const res = await deleteCategory(category.id, usage > 0 ? target : undefined);
      toast.success(res.reassigned ? `Deleted. ${res.reassigned} transactions moved.` : 'Category deleted');
      onClose();
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ConfirmDialog
      open={!!category}
      onOpenChange={(o) => !o && onClose()}
      title={`Delete “${category?.name ?? ''}”?`}
      description={usage > 0 ? `${usage} ${usage === 1 ? 'transaction uses' : 'transactions use'} this category. Choose where to move ${usage === 1 ? 'it' : 'them'} so no history is lost.` : 'No transactions use this category.'}
      confirmLabel={usage > 0 ? 'Move and delete' : 'Delete'}
      danger
      busy={busy}
      confirmDisabled={usage > 0 && !target}
      onConfirm={run}
    >
      {usage > 0 && (
        <div>
          <Label htmlFor="reassign">Move transactions to</Label>
          <Select id="reassign" value={target} onChange={(e) => setPicked(e.target.value)}>
            {siblings.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>
      )}
    </ConfirmDialog>
  );
}
