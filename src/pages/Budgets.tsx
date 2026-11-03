import * as React from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Pencil, Plus, Target, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { FieldError, Input, Label, Select } from '@/components/ui/input';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { useToast } from '@/components/ui/toast';
import { BudgetProgress } from '@/components/dashboard/BudgetProgress';
import { useBudgets, useCategoriesOfType, useCategoryMap, useTransactionsInRange } from '@/hooks/useData';
import { useToday } from '@/hooks/useToday';
import { deleteBudget, saveBudget } from '@/repositories/budgets';
import { evaluateBudgets } from '@/services/reports';
import { formatMonthLabel, monthKey, monthRange } from '@/lib/dates';
import { paiseToRupeeString, parseRupeesToPaise } from '@/lib/money';
import { friendlyError } from '@/lib/utils';
import type { Budget } from '@/types';

export default function Budgets() {
  const today = useToday();
  const range = React.useMemo(() => monthRange(today), [today]);
  const budgets = useBudgets();
  const monthTxs = useTransactionsInRange(range);
  const categories = useCategoryMap();
  const [editing, setEditing] = React.useState<Budget | 'overall' | 'category' | null>(null);
  const [removing, setRemoving] = React.useState<Budget | null>(null);
  const toast = useToast();
  const statuses = React.useMemo(() => (budgets && monthTxs ? evaluateBudgets(budgets, monthTxs) : []), [budgets, monthTxs]);
  const hasOverall = budgets?.some((b) => b.scope === 'overall');

  return (
    <>
      <Link to="/settings" className="mt-4 inline-flex h-10 items-center gap-1 text-sm font-semibold text-fg-muted hover:text-fg lg:mt-8">
        <ChevronLeft className="h-4 w-4" aria-hidden /> Settings
      </Link>
      <PageHeader title="Budgets" subtitle="Optional. Only personal expenses count toward a budget — never transfers, savings or investments." />

      {budgets && budgets.length === 0 ? (
        <Card>
          <EmptyState
            icon={Target}
            title="No budgets set"
            body="SpendWise never creates a budget for you. Set a monthly limit for all personal spending or for a single category when you’re ready."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Button onClick={() => setEditing('overall')}>Set monthly limit</Button>
                <Button variant="secondary" onClick={() => setEditing('category')}>
                  Category budget
                </Button>
              </div>
            }
          />
        </Card>
      ) : (
        <Card>
          <CardHeader
            title={`${formatMonthLabel(monthKey(today))} so far`}
            action={
              <div className="flex gap-2">
                {!hasOverall && (
                  <Button size="sm" variant="secondary" onClick={() => setEditing('overall')}>
                    Monthly limit
                  </Button>
                )}
                <Button size="sm" onClick={() => setEditing('category')}>
                  <Plus className="h-4 w-4" aria-hidden /> Category
                </Button>
              </div>
            }
          />
          <CardBody className="space-y-5">
            {statuses.map((s) => (
              <div key={s.budget.id} className="flex items-start gap-2">
                <div className="flex-1">
                  <BudgetProgress status={s} categories={categories} />
                </div>
                <Button size="icon" variant="ghost" aria-label="Edit budget" onClick={() => setEditing(s.budget)}>
                  <Pencil className="h-[18px] w-[18px]" />
                </Button>
                <Button size="icon" variant="ghost" aria-label="Remove budget" onClick={() => setRemoving(s.budget)}>
                  <Trash2 className="h-[18px] w-[18px]" />
                </Button>
              </div>
            ))}
          </CardBody>
        </Card>
      )}

      <BudgetEditor key={typeof editing === 'string' ? editing : editing?.id ?? 'none'} value={editing} existing={budgets ?? []} onClose={() => setEditing(null)} />
      <ConfirmDialog
        open={!!removing}
        onOpenChange={(o) => !o && setRemoving(null)}
        title="Remove this budget?"
        description="Your transactions are not affected."
        confirmLabel="Remove"
        danger
        onConfirm={async () => {
          if (!removing) return;
          try {
            await deleteBudget(removing.id);
            toast.success('Budget removed');
          } catch (err) {
            toast.error(friendlyError(err));
          }
          setRemoving(null);
        }}
      />
    </>
  );
}

function BudgetEditor({ value, existing, onClose }: { value: Budget | 'overall' | 'category' | null; existing: Budget[]; onClose: () => void }) {
  const toast = useToast();
  const expenseCats = useCategoriesOfType('expense');
  const budget = value && typeof value !== 'string' ? value : null;
  const scope = budget?.scope ?? (value === 'category' ? 'category' : 'overall');
  const usedCats = new Set(existing.filter((b) => b.scope === 'category' && b.id !== budget?.id).map((b) => b.categoryId));
  const available = expenseCats.filter((c) => !usedCats.has(c.id));
  const [categoryId, setCategoryId] = React.useState(budget?.categoryId ?? '');
  const [amount, setAmount] = React.useState(budget ? paiseToRupeeString(budget.amountPaise, false) : '');
  const [error, setError] = React.useState<string | null>(null);
  const effectiveCat = scope === 'category' ? (categoryId || available[0]?.id || '') : null;

  async function save() {
    const paise = parseRupeesToPaise(amount);
    if (!paise) {
      setError('Enter an amount greater than ₹0');
      return;
    }
    try {
      await saveBudget({ scope, categoryId: effectiveCat, amountPaise: paise });
      toast.success('Budget saved');
      onClose();
    } catch (err) {
      setError(friendlyError(err));
    }
  }

  return (
    <Sheet open={!!value} onOpenChange={(o) => !o && onClose()} title={scope === 'overall' ? 'Monthly spending limit' : 'Category budget'} footer={<Button className="w-full" size="lg" onClick={() => void save()}>Save budget</Button>}>
      <div className="space-y-4">
        {scope === 'category' && (
          <div>
            <Label htmlFor="b-cat">Expense category</Label>
            {available.length ? (
              <Select id="b-cat" value={effectiveCat ?? ''} onChange={(e) => setCategoryId(e.target.value)} disabled={!!budget}>
                {available.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            ) : (
              <p className="text-sm text-fg-muted">Every expense category already has a budget.</p>
            )}
          </div>
        )}
        <div>
          <Label htmlFor="b-amount">Amount per month (₹)</Label>
          <Input id="b-amount" inputMode="decimal" value={amount} onChange={(e) => { setAmount(e.target.value); setError(null); }} placeholder="Enter your own limit" autoComplete="off" />
          <FieldError>{error}</FieldError>
        </div>
        <p className="text-sm text-fg-muted">Applies to every month until you change or remove it.</p>
      </div>
    </Sheet>
  );
}
