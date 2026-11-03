import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/db/schema';
import { addTransaction } from '@/repositories/transactions';
import { addCategory } from '@/repositories/categories';
import { saveBudget } from '@/repositories/budgets';
import {
  analyzeImport,
  applyImport,
  BACKUP_SCHEMA_VERSION,
  clearAllData,
  createBackup,
  loadExistingData,
  markBackupCompleted,
  parseBackup,
  type BackupFile,
} from './backup';
import { getSettings } from '@/repositories/settings';
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

async function snapshot(): Promise<BackupFile> {
  const b = await createBackup(new Date('2026-11-03T10:00:00Z'));
  const parsed = parseBackup(JSON.stringify(b));
  if (!parsed.ok) throw new Error(parsed.error);
  return parsed.backup;
}

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe('JSON backup export', () => {
  it('exports all data with schema version and timestamp', async () => {
    await addTransaction(base);
    await addTransaction({ ...base, type: 'transfer', categoryId: 'tr-father', amountPaise: 4500000 });
    await addCategory({ type: 'expense', name: 'Coffee', icon: 'coffee', color: '#aabbcc' });
    await saveBudget({ scope: 'overall', categoryId: null, amountPaise: 1000000 });
    const b = await createBackup(new Date('2026-11-03T10:00:00Z'));
    expect(b.format).toBe('spendwise-backup');
    expect(b.schemaVersion).toBe(BACKUP_SCHEMA_VERSION);
    expect(b.exportedAt).toBe('2026-11-03T10:00:00.000Z');
    expect(b.data.transactions).toHaveLength(2);
    expect(b.data.categories.some((c) => c.name === 'Coffee')).toBe(true);
    expect(b.data.budgets).toHaveLength(1);
    expect(b.data.settings).toEqual({ dateFormat: 'DD/MM/YYYY', theme: 'dark' });
  });
  it('records the last backup date', async () => {
    await markBackupCompleted(new Date('2026-11-03T10:00:00Z'));
    expect((await getSettings()).lastBackupAt).toBe('2026-11-03T10:00:00.000Z');
  });
});

describe('JSON import validation', () => {
  it('rejects non-JSON, foreign files and future versions', () => {
    expect(parseBackup('not json')).toMatchObject({ ok: false });
    expect(parseBackup('{"hello":1}')).toMatchObject({ ok: false, error: expect.stringMatching(/not a SpendWise/) });
    expect(parseBackup(JSON.stringify({ format: 'spendwise-backup', schemaVersion: 99 }))).toMatchObject({ ok: false, error: expect.stringMatching(/newer version/) });
  });
  it('rejects damaged records and broken references', async () => {
    await addTransaction(base);
    const good = await snapshot();
    const badAmount = structuredClone(good);
    badAmount.data.transactions[0]!.amountPaise = -5;
    expect(parseBackup(JSON.stringify(badAmount)).ok).toBe(false);
    const badFloat = structuredClone(good);
    badFloat.data.transactions[0]!.amountPaise = 12.5;
    expect(parseBackup(JSON.stringify(badFloat)).ok).toBe(false);
    const badRef = structuredClone(good);
    badRef.data.transactions[0]!.categoryId = 'ghost';
    expect(parseBackup(JSON.stringify(badRef))).toMatchObject({ ok: false, error: expect.stringMatching(/missing category/) });
  });
  it('migrates a v1 backup', () => {
    const v1 = {
      format: 'spendwise-backup',
      schemaVersion: 1,
      exportedAt: '2026-01-01T00:00:00.000Z',
      data: {
        transactions: [{ id: 'x1', type: 'expense', amountPaise: 1000, date: '2026-01-01', categoryId: 'exp-food', paymentMethod: 'cash', createdAt: '2026-01-01T00:00:00.000Z' }],
        categories: [{ id: 'exp-food', type: 'expense', name: 'Food & Dining', icon: 'utensils', color: '#f59e6b', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' }],
        budgets: [],
        settings: [{ key: 'dateFormat', value: 'YYYY-MM-DD' }],
      },
    };
    const r = parseBackup(JSON.stringify(v1));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.migratedFrom).toBe(1);
      expect(r.backup.data.transactions[0]).toMatchObject({ notes: '', recipient: '', description: '' });
      expect(r.backup.data.settings.dateFormat).toBe('YYYY-MM-DD');
    }
  });
});

describe('duplicate detection and preview', () => {
  it('classifies identical, conflicting, possible-duplicate and new records', async () => {
    const a = await addTransaction(base);
    const b = await addTransaction({ ...base, description: 'Petrol', categoryId: 'exp-petrol', amountPaise: 100000 });
    const backup = await snapshot();
    // Change local state after export
    await db.transactions.update(b.id, { amountPaise: 90000 });
    const lunch = backup.data.transactions.find((t) => t.id === a.id)!;
    // Same content, different id (recorded twice on two devices)
    backup.data.transactions.push({ ...lunch, id: 'other-device-id' });
    // Genuinely new
    backup.data.transactions.push({ ...lunch, id: 'new-one', amountPaise: 777 });

    const preview = analyzeImport(backup, await loadExistingData());
    expect(preview.transactions.identical.map((t) => t.id)).toEqual([a.id]);
    expect(preview.transactions.conflicts.map((c) => c.incoming.id)).toEqual([b.id]);
    expect(preview.transactions.possibleDuplicates.map((t) => t.id)).toEqual(['other-device-id']);
    expect(preview.transactions.added.map((t) => t.id)).toEqual(['new-one']);
    // Analysis wrote nothing
    expect(await db.transactions.count()).toBe(2);
  });
  it('maps same-named custom categories instead of duplicating them', async () => {
    await addCategory({ type: 'expense', name: 'Coffee', icon: 'coffee', color: '#aabbcc' });
    const backup = await snapshot();
    await db.delete();
    await db.open();
    const local = await addCategory({ type: 'expense', name: 'coffee', icon: 'coffee', color: '#aabbcc' });
    const incomingId = backup.data.categories.find((c) => c.name === 'Coffee')!.id;
    backup.data.transactions.push({ id: 'cx', type: 'expense', amountPaise: 1, date: '2026-11-01', categoryId: incomingId, description: '', recipient: '', paymentMethod: 'cash', notes: '', createdAt: '2026-11-01T00:00:00.000Z', updatedAt: '2026-11-01T00:00:00.000Z' });
    const preview = analyzeImport(backup, await loadExistingData());
    expect(preview.categoryRemap[incomingId]).toBe(local.id);
    await applyImport(backup, { mode: 'merge', conflictPolicy: 'keep-existing', includePossibleDuplicates: false });
    expect((await db.transactions.get('cx'))?.categoryId).toBe(local.id);
    expect((await db.categories.where('type').equals('expense').toArray()).filter((c) => c.name.toLowerCase() === 'coffee')).toHaveLength(1);
  });
});

describe('merge and replace restore', () => {
  it('merge adds new records, skips duplicates and keeps existing on conflict', async () => {
    const a = await addTransaction(base);
    const backup = await snapshot();
    backup.data.transactions[0]!.amountPaise = 99999; // conflict
    backup.data.transactions.push({ ...backup.data.transactions[0]!, id: 'n1', amountPaise: 5000, description: 'New' });
    const res = await applyImport(backup, { mode: 'merge', conflictPolicy: 'keep-existing', includePossibleDuplicates: false });
    expect(res.transactionsWritten).toBe(1);
    expect((await db.transactions.get(a.id))?.amountPaise).toBe(25000);
    expect(await db.transactions.count()).toBe(2);
    // Importing the same file again creates no duplicates
    await applyImport(backup, { mode: 'merge', conflictPolicy: 'keep-existing', includePossibleDuplicates: false });
    expect(await db.transactions.count()).toBe(2);
  });
  it('merge can prefer the backup on conflict', async () => {
    const a = await addTransaction(base);
    const backup = await snapshot();
    backup.data.transactions[0]!.amountPaise = 99999;
    await applyImport(backup, { mode: 'merge', conflictPolicy: 'use-backup', includePossibleDuplicates: false });
    expect((await db.transactions.get(a.id))?.amountPaise).toBe(99999);
  });
  it('replace swaps the whole dataset atomically', async () => {
    await addTransaction(base);
    const backup = await snapshot();
    await addTransaction({ ...base, description: 'after backup' });
    await addTransaction({ ...base, description: 'after backup 2' });
    expect(await db.transactions.count()).toBe(3);
    await applyImport(backup, { mode: 'replace', conflictPolicy: 'keep-existing', includePossibleDuplicates: false });
    expect(await db.transactions.count()).toBe(1);
    expect(await db.categories.get('tr-father')).toBeTruthy();
  });
  it('rolls back on failure so nothing is half-written', async () => {
    await addTransaction(base);
    const backup = await snapshot();
    // Inject an invalid duplicate primary key to force bulkAdd to fail mid-way.
    backup.data.transactions.push({ ...backup.data.transactions[0]! });
    await expect(applyImport(backup, { mode: 'replace', conflictPolicy: 'keep-existing', includePossibleDuplicates: false })).rejects.toThrow();
    expect(await db.transactions.count()).toBe(1);
    expect(await db.categories.count()).toBeGreaterThan(20);
  });
  it('clear all data leaves a clean install', async () => {
    await addTransaction(base);
    await saveBudget({ scope: 'overall', categoryId: null, amountPaise: 1000 });
    await clearAllData();
    expect(await db.transactions.count()).toBe(0);
    expect(await db.budgets.count()).toBe(0);
    expect(await db.categories.get('tr-father')).toBeTruthy();
  });
});
