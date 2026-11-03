import { beforeEach, describe, expect, it } from 'vitest';
import { db, SpendWiseDB } from '@/db/schema';
import { addTransaction, deleteTransaction, getTransaction, listAllTransactions, updateTransaction } from './transactions';
import { addCategory, deleteCategory, listCategoriesByType, updateCategory, ensureEssentialCategories } from './categories';
import { listBudgets, saveBudget } from './budgets';
import { getSettings, setSetting } from './settings';
import type { TransactionInput } from '@/types';

const base: TransactionInput = {
  type: 'expense',
  amountPaise: 25000,
  date: '2026-11-03',
  categoryId: 'exp-food',
  description: 'Lunch',
  recipient: '',
  paymentMethod: 'upi',
  notes: '',
};

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe('fresh database', () => {
  it('seeds category labels but no transactions or budgets', async () => {
    expect(await db.transactions.count()).toBe(0);
    expect(await db.budgets.count()).toBe(0);
    expect((await listCategoriesByType('expense')).map((c) => c.name)).toContain('Food & Dining');
    expect((await listCategoriesByType('transfer')).map((c) => c.name)).toContain('Father');
    expect((await listCategoriesByType('expense')).map((c) => c.name)).not.toContain('Father');
  });
});

describe('transactions repository', () => {
  it('adds and validates', async () => {
    const t = await addTransaction(base);
    expect(t.id).toBeTruthy();
    expect((await getTransaction(t.id))?.amountPaise).toBe(25000);
    await expect(addTransaction({ ...base, amountPaise: 0 })).rejects.toThrow(/greater than/);
    await expect(addTransaction({ ...base, amountPaise: 10.5 })).rejects.toThrow();
    await expect(addTransaction({ ...base, date: '2026-02-30' })).rejects.toThrow(/valid date/);
    await expect(addTransaction({ ...base, categoryId: 'nope' })).rejects.toThrow(/no longer exists/);
    await expect(addTransaction({ ...base, categoryId: 'tr-father' })).rejects.toThrow(/does not match/);
  });
  it('strips recipient from non-transfers', async () => {
    const t = await addTransaction({ ...base, recipient: 'x' });
    expect(t.recipient).toBe('');
  });
  it('edits a transaction', async () => {
    const t = await addTransaction(base);
    const u = await updateTransaction(t.id, { ...base, amountPaise: 30000, description: 'Dinner' });
    expect(u.createdAt).toBe(t.createdAt);
    expect((await getTransaction(t.id))).toMatchObject({ amountPaise: 30000, description: 'Dinner' });
    await expect(updateTransaction('missing', base)).rejects.toThrow();
  });
  it('deletes a transaction', async () => {
    const t = await addTransaction(base);
    await deleteTransaction(t.id);
    expect(await getTransaction(t.id)).toBeUndefined();
  });
  it('persists across database reopen', async () => {
    const t = await addTransaction(base);
    db.close();
    const other = new SpendWiseDB();
    await other.open();
    expect((await other.transactions.get(t.id))?.description).toBe('Lunch');
    other.close();
    await db.open();
    expect((await listAllTransactions())).toHaveLength(1);
  });
});

describe('categories repository', () => {
  it('creates, renames and rejects duplicate names', async () => {
    const c = await addCategory({ type: 'expense', name: 'Coffee', icon: 'coffee', color: '#aabbcc' });
    await expect(addCategory({ type: 'expense', name: 'coffee', icon: 'coffee', color: '#aabbcc' })).rejects.toThrow(/already exists/);
    const r = await updateCategory(c.id, { name: 'Cafés', icon: 'coffee', color: '#112233' });
    expect(r.name).toBe('Cafés');
  });
  it('requires reassignment before deleting a used category', async () => {
    const c = await addCategory({ type: 'expense', name: 'Coffee', icon: 'coffee', color: '#aabbcc' });
    const t = await addTransaction({ ...base, categoryId: c.id });
    await saveBudget({ scope: 'category', categoryId: c.id, amountPaise: 100000 });
    await expect(deleteCategory(c.id)).rejects.toThrow(/Choose a category/);
    await expect(deleteCategory(c.id, 'tr-father')).rejects.toThrow(/same type/);
    expect(await db.categories.get(c.id)).toBeTruthy();

    const res = await deleteCategory(c.id, 'exp-food');
    expect(res.reassigned).toBe(1);
    expect((await getTransaction(t.id))?.categoryId).toBe('exp-food');
    expect(await db.categories.get(c.id)).toBeUndefined();
    expect((await listBudgets())[0]?.categoryId).toBe('exp-food');
  });
  it('deletes unused categories directly and protects Father', async () => {
    const c = await addCategory({ type: 'expense', name: 'Temp', icon: 'shapes', color: '#aabbcc' });
    await deleteCategory(c.id);
    expect(await db.categories.get(c.id)).toBeUndefined();
    await expect(deleteCategory('tr-father')).rejects.toThrow(/Father/);
  });
  it('restores essential categories', async () => {
    await db.categories.delete('tr-father');
    await ensureEssentialCategories();
    expect(await db.categories.get('tr-father')).toBeTruthy();
  });
});

describe('budgets and settings', () => {
  it('has no budget by default and upserts by scope', async () => {
    expect(await listBudgets()).toHaveLength(0);
    await saveBudget({ scope: 'overall', categoryId: null, amountPaise: 1000000 });
    await saveBudget({ scope: 'overall', categoryId: null, amountPaise: 1500000 });
    const b = await listBudgets();
    expect(b).toHaveLength(1);
    expect(b[0]!.amountPaise).toBe(1500000);
    await expect(saveBudget({ scope: 'category', categoryId: 'inc-salary', amountPaise: 1 })).rejects.toThrow(/expense/);
  });
  it('stores settings with defaults', async () => {
    expect(await getSettings()).toEqual({ dateFormat: 'DD/MM/YYYY', theme: 'dark', lastBackupAt: null });
    await setSetting('dateFormat', 'YYYY-MM-DD');
    expect((await getSettings()).dateFormat).toBe('YYYY-MM-DD');
  });
});
