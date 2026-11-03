/** Budget data access. Budgets are always optional and user-created. */
import { db } from '@/db/schema';
import { budgetInputSchema, firstIssue, ValidationError } from '@/lib/validation';
import { newId, nowISO } from '@/lib/utils';
import type { Budget } from '@/types';

export type BudgetInput = Pick<Budget, 'scope' | 'categoryId' | 'amountPaise'>;

export async function listBudgets(): Promise<Budget[]> {
  return db.budgets.toArray();
}

/** Create or replace the budget for a scope/category (one budget per scope/category). */
export async function saveBudget(input: BudgetInput): Promise<Budget> {
  const parsed = budgetInputSchema.safeParse(input);
  if (!parsed.success) throw new ValidationError(firstIssue(parsed.error));
  const v = parsed.data;
  return db.transaction('rw', db.budgets, db.categories, async () => {
    if (v.scope === 'category') {
      const cat = await db.categories.get(v.categoryId!);
      if (!cat || cat.type !== 'expense') throw new ValidationError('Budgets can only be set for expense categories.');
    }
    const existing = (await db.budgets.toArray()).find((b) => b.scope === v.scope && b.categoryId === v.categoryId);
    const now = nowISO();
    const budget: Budget = existing
      ? { ...existing, amountPaise: v.amountPaise, updatedAt: now }
      : { id: newId(), scope: v.scope, categoryId: v.categoryId, amountPaise: v.amountPaise, createdAt: now, updatedAt: now };
    await db.budgets.put(budget);
    return budget;
  });
}

export async function deleteBudget(id: string): Promise<void> {
  await db.budgets.delete(id);
}
