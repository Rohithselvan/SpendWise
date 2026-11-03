/** Category data access, including safe deletion with reassignment. */
import { db } from '@/db/schema';
import { FATHER_RECIPIENT_ID, defaultCategories } from '@/db/seed';
import { categoryInputSchema, firstIssue, ValidationError } from '@/lib/validation';
import { newId, nowISO } from '@/lib/utils';
import type { Category, TxType } from '@/types';

export type CategoryInput = Pick<Category, 'type' | 'name' | 'icon' | 'color'>;

function validate(input: CategoryInput): CategoryInput {
  const parsed = categoryInputSchema.safeParse(input);
  if (!parsed.success) throw new ValidationError(firstIssue(parsed.error));
  return parsed.data;
}

async function assertUniqueName(type: TxType, name: string, exceptId?: string): Promise<void> {
  const same = await db.categories.where('type').equals(type).toArray();
  if (same.some((c) => c.id !== exceptId && c.name.trim().toLowerCase() === name.trim().toLowerCase())) {
    throw new ValidationError(`“${name}” already exists.`);
  }
}

export function sortCategories(list: Category[]): Category[] {
  return [...list].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}

export async function listCategories(): Promise<Category[]> {
  return sortCategories(await db.categories.toArray());
}

export async function listCategoriesByType(type: TxType): Promise<Category[]> {
  return sortCategories(await db.categories.where('type').equals(type).toArray());
}

export async function addCategory(input: CategoryInput): Promise<Category> {
  const clean = validate(input);
  await assertUniqueName(clean.type, clean.name);
  const siblings = await db.categories.where('type').equals(clean.type).toArray();
  const now = nowISO();
  const cat: Category = {
    ...clean,
    id: newId(),
    isDefault: false,
    sortOrder: siblings.reduce((m, c) => Math.max(m, c.sortOrder), -1) + 1,
    createdAt: now,
    updatedAt: now,
  };
  await db.categories.add(cat);
  return cat;
}

export async function updateCategory(id: string, patch: Pick<Category, 'name' | 'icon' | 'color'>): Promise<Category> {
  const existing = await db.categories.get(id);
  if (!existing) throw new ValidationError('Category not found.');
  const clean = validate({ ...patch, type: existing.type });
  await assertUniqueName(existing.type, clean.name, id);
  const updated: Category = { ...existing, ...clean, type: existing.type, updatedAt: nowISO() };
  await db.categories.put(updated);
  return updated;
}

export async function countCategoryUsage(id: string): Promise<number> {
  return db.transactions.where('categoryId').equals(id).count();
}

export function canDeleteCategory(cat: Category, siblingsCount: number): { ok: boolean; reason?: string } {
  if (cat.id === FATHER_RECIPIENT_ID) return { ok: false, reason: 'Father is used by the Transfer to Father shortcut and cannot be deleted.' };
  if (siblingsCount <= 1) return { ok: false, reason: 'Each type needs at least one category.' };
  return { ok: true };
}

/**
 * Delete a category. If transactions use it, `reassignToId` is REQUIRED and must be a category of the same type.
 * Reassignment and deletion happen in one atomic IndexedDB transaction. Budgets for the deleted category
 * are removed (or merged into the target's budget if the target has none).
 */
export async function deleteCategory(id: string, reassignToId?: string): Promise<{ reassigned: number }> {
  return db.transaction('rw', db.categories, db.transactions, db.budgets, async () => {
    const cat = await db.categories.get(id);
    if (!cat) throw new ValidationError('Category not found.');
    const siblings = await db.categories.where('type').equals(cat.type).count();
    const check = canDeleteCategory(cat, siblings);
    if (!check.ok) throw new ValidationError(check.reason ?? 'This category cannot be deleted.');

    const usage = await db.transactions.where('categoryId').equals(id).count();
    let reassigned = 0;
    if (usage > 0) {
      if (!reassignToId) throw new ValidationError('Choose a category to move existing transactions to.');
      if (reassignToId === id) throw new ValidationError('Choose a different category.');
      const target = await db.categories.get(reassignToId);
      if (!target || target.type !== cat.type) throw new ValidationError('The replacement category must be of the same type.');
      const now = nowISO();
      reassigned = await db.transactions.where('categoryId').equals(id).modify({ categoryId: reassignToId, updatedAt: now });
    }

    const budgets = await db.budgets.where('categoryId').equals(id).toArray();
    for (const b of budgets) {
      const targetHas = reassignToId ? await db.budgets.where('categoryId').equals(reassignToId).count() : 1;
      if (reassignToId && targetHas === 0) {
        await db.budgets.update(b.id, { categoryId: reassignToId, updatedAt: nowISO() });
      } else {
        await db.budgets.delete(b.id);
      }
    }
    await db.categories.delete(id);
    return { reassigned };
  });
}

/** Ensure the Father recipient exists (required by the shortcut). Safe to call repeatedly. */
export async function ensureEssentialCategories(): Promise<void> {
  const father = await db.categories.get(FATHER_RECIPIENT_ID);
  if (!father) {
    const seed = defaultCategories().find((c) => c.id === FATHER_RECIPIENT_ID);
    if (seed) await db.categories.put(seed);
  }
  // Make sure every type has at least one category.
  const all = await db.categories.toArray();
  const missing = defaultCategories().filter((d) => !all.some((c) => c.type === d.type));
  if (missing.length) await db.categories.bulkPut(missing);
}
