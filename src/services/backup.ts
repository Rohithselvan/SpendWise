/**
 * JSON backup & restore.
 *
 * Flow: parseBackup (validate + migrate, no writes) → analyzeImport (preview, no writes)
 *       → user confirms → applyImport (single atomic IndexedDB transaction).
 *
 * Backup format history:
 *  v1: { format, schemaVersion: 1, exportedAt, data: { transactions, categories, budgets, settings: [{key,value}] } }
 *      Transactions could omit notes/recipient; categories could omit sortOrder/isDefault.
 *  v2 (current): settings is an object; all optional text fields are present.
 */
import { z } from 'zod';
import { db } from '@/db/schema';
import { DEFAULT_SETTINGS, settingsFromRows } from '@/repositories/settings';
import { ensureEssentialCategories } from '@/repositories/categories';
import { budgetSchema, categorySchema, settingsSchema, transactionSchema } from '@/lib/validation';
import { defaultCategories } from '@/db/seed';
import { newId } from '@/lib/utils';
import type { AppSettings, Budget, Category, Transaction } from '@/types';

export const BACKUP_FORMAT = 'spendwise-backup';
export const BACKUP_SCHEMA_VERSION = 2;

export interface BackupData {
  transactions: Transaction[];
  categories: Category[];
  budgets: Budget[];
  settings: Pick<AppSettings, 'dateFormat' | 'theme'>;
}

export interface BackupFile {
  format: typeof BACKUP_FORMAT;
  schemaVersion: number;
  exportedAt: string;
  app: { name: 'SpendWise'; version: string };
  data: BackupData;
}

const backupV2Schema = z.object({
  format: z.literal(BACKUP_FORMAT),
  schemaVersion: z.literal(2),
  exportedAt: z.string(),
  app: z.object({ name: z.literal('SpendWise'), version: z.string() }),
  data: z.object({
    transactions: z.array(transactionSchema),
    categories: z.array(categorySchema),
    budgets: z.array(budgetSchema),
    settings: settingsSchema.pick({ dateFormat: true, theme: true }),
  }),
});

// ---------- Export ----------

export const APP_VERSION = '1.0.0';

export async function createBackup(now: Date = new Date()): Promise<BackupFile> {
  return db.transaction('r', db.transactions, db.categories, db.budgets, db.settings, async () => {
    const [transactions, categories, budgets, settingRows] = await Promise.all([
      db.transactions.orderBy('date').toArray(),
      db.categories.toArray(),
      db.budgets.toArray(),
      db.settings.toArray(),
    ]);
    const s = settingsFromRows(settingRows);
    return {
      format: BACKUP_FORMAT,
      schemaVersion: BACKUP_SCHEMA_VERSION,
      exportedAt: now.toISOString(),
      app: { name: 'SpendWise', version: APP_VERSION },
      data: { transactions, categories, budgets, settings: { dateFormat: s.dateFormat, theme: s.theme } },
    };
  });
}

export function backupFileName(now: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `spendwise-backup-${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}-${p(now.getHours())}${p(now.getMinutes())}.json`;
}

export async function markBackupCompleted(at: Date = new Date()): Promise<void> {
  await db.settings.put({ key: 'lastBackupAt', value: at.toISOString() });
}

// ---------- Parse + migrate ----------

export type ParseResult = { ok: true; backup: BackupFile; migratedFrom: number | null } | { ok: false; error: string };

type Json = Record<string, unknown>;
const isObj = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Migrate v1 → v2. Pure; does not touch the database. */
export function migrateV1toV2(raw: Json): Json {
  const data = isObj(raw.data) ? raw.data : {};
  const txs = Array.isArray(data.transactions) ? data.transactions : [];
  const cats = Array.isArray(data.categories) ? data.categories : [];
  const settingsRows = Array.isArray(data.settings) ? (data.settings as { key: string; value: unknown }[]) : [];
  const s = settingsFromRows(settingsRows.filter(isObj) as { key: string; value: unknown }[]);
  return {
    format: BACKUP_FORMAT,
    schemaVersion: 2,
    exportedAt: typeof raw.exportedAt === 'string' ? raw.exportedAt : new Date(0).toISOString(),
    app: { name: 'SpendWise', version: typeof (raw.app as Json | undefined)?.version === 'string' ? (raw.app as Json).version : 'legacy' },
    data: {
      transactions: txs.map((t) =>
        isObj(t)
          ? {
              ...t,
              description: typeof t.description === 'string' ? t.description : '',
              recipient: typeof t.recipient === 'string' ? t.recipient : '',
              notes: typeof t.notes === 'string' ? t.notes : '',
              updatedAt: t.updatedAt ?? t.createdAt,
            }
          : t,
      ),
      categories: cats.map((c, i) => (isObj(c) ? { ...c, sortOrder: typeof c.sortOrder === 'number' ? c.sortOrder : i, isDefault: c.isDefault ?? false } : c)),
      budgets: Array.isArray(data.budgets) ? data.budgets : [],
      settings: { dateFormat: s.dateFormat, theme: s.theme },
    },
  };
}

const MIGRATIONS: Record<number, (raw: Json) => Json> = { 1: migrateV1toV2 };

export function parseBackup(text: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'This file is not valid JSON. Choose a SpendWise backup file.' };
  }
  if (!isObj(raw) || raw.format !== BACKUP_FORMAT) {
    return { ok: false, error: 'This file is not a SpendWise backup.' };
  }
  const version = raw.schemaVersion;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    return { ok: false, error: 'The backup has an unknown schema version.' };
  }
  if (version > BACKUP_SCHEMA_VERSION) {
    return { ok: false, error: `This backup was made by a newer version of SpendWise (schema v${version}). Update the app first.` };
  }
  let migrated: Json = raw;
  for (let v = version; v < BACKUP_SCHEMA_VERSION; v++) {
    const step = MIGRATIONS[v];
    if (!step) return { ok: false, error: `No migration available for backup schema v${v}.` };
    migrated = step(migrated);
  }
  const parsed = backupV2Schema.safeParse(migrated);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const where = issue?.path.length ? ` (at ${issue.path.join('.')})` : '';
    return { ok: false, error: `The backup file is damaged or incomplete: ${issue?.message ?? 'invalid data'}${where}.` };
  }
  const backup = parsed.data as BackupFile;

  // Referential integrity: every transaction must reference a category of the same type.
  const catById = new Map(backup.data.categories.map((c) => [c.id, c]));
  if (catById.size !== backup.data.categories.length) return { ok: false, error: 'The backup contains duplicate category IDs.' };
  const txIds = new Set<string>();
  for (const t of backup.data.transactions) {
    if (txIds.has(t.id)) return { ok: false, error: 'The backup contains duplicate transaction IDs.' };
    txIds.add(t.id);
    const c = catById.get(t.categoryId);
    if (!c) return { ok: false, error: 'A transaction in the backup references a missing category.' };
    if (c.type !== t.type) return { ok: false, error: 'A transaction in the backup has a category of the wrong type.' };
  }
  for (const b of backup.data.budgets) {
    if (b.scope === 'category' && (!b.categoryId || catById.get(b.categoryId)?.type !== 'expense')) {
      return { ok: false, error: 'A budget in the backup references a missing expense category.' };
    }
  }
  return { ok: true, backup, migratedFrom: version === BACKUP_SCHEMA_VERSION ? null : version };
}

// ---------- Preview / analysis ----------

/** Content identity ignoring id/timestamps — used to catch the same transaction recorded under another id. */
export function transactionFingerprint(t: Pick<Transaction, 'type' | 'amountPaise' | 'date' | 'categoryId' | 'paymentMethod' | 'description' | 'recipient'>): string {
  return [t.type, t.amountPaise, t.date, t.categoryId, t.paymentMethod, t.description.trim().toLowerCase(), t.recipient.trim().toLowerCase()].join('|');
}

function sameTransaction(a: Transaction, b: Transaction): boolean {
  return transactionFingerprint(a) === transactionFingerprint(b) && a.notes === b.notes;
}

function sameCategory(a: Category, b: Category): boolean {
  return a.type === b.type && a.name === b.name && a.icon === b.icon && a.color === b.color;
}

const budgetKey = (b: Budget) => `${b.scope}:${b.categoryId ?? ''}`;

export interface Conflict<T> {
  incoming: T;
  existing: T;
}

export interface ImportPreview {
  transactions: { added: Transaction[]; identical: Transaction[]; possibleDuplicates: Transaction[]; conflicts: Conflict<Transaction>[] };
  categories: { added: Category[]; identical: Category[]; conflicts: Conflict<Category>[]; mergedByName: Conflict<Category>[] };
  budgets: { added: Budget[]; identical: Budget[]; conflicts: Conflict<Budget>[] };
  existingCounts: { transactions: number; categories: number; budgets: number };
  /** incoming category id → existing category id (same name & type, different id) */
  categoryRemap: Record<string, string>;
}

export interface ExistingData {
  transactions: Transaction[];
  categories: Category[];
  budgets: Budget[];
}

export async function loadExistingData(): Promise<ExistingData> {
  const [transactions, categories, budgets] = await Promise.all([db.transactions.toArray(), db.categories.toArray(), db.budgets.toArray()]);
  return { transactions, categories, budgets };
}

/** Pure analysis of what a merge would do. Nothing is written. */
export function analyzeImport(backup: BackupFile, existing: ExistingData): ImportPreview {
  const exCatById = new Map(existing.categories.map((c) => [c.id, c]));
  const exCatByName = new Map(existing.categories.map((c) => [`${c.type}:${c.name.trim().toLowerCase()}`, c]));
  const categories: ImportPreview['categories'] = { added: [], identical: [], conflicts: [], mergedByName: [] };
  const categoryRemap: Record<string, string> = {};

  for (const c of backup.data.categories) {
    const byId = exCatById.get(c.id);
    if (byId) {
      if (sameCategory(c, byId)) categories.identical.push(c);
      else if (byId.type !== c.type) {
        // Same id but a different type: never overwrite; import under a fresh id instead.
        const fresh = { ...c, id: newId() };
        categoryRemap[c.id] = fresh.id;
        categories.added.push(fresh);
      } else categories.conflicts.push({ incoming: c, existing: byId });
      continue;
    }
    const byName = exCatByName.get(`${c.type}:${c.name.trim().toLowerCase()}`);
    if (byName) {
      categoryRemap[c.id] = byName.id;
      categories.mergedByName.push({ incoming: c, existing: byName });
    } else categories.added.push(c);
  }

  const remapTx = (t: Transaction): Transaction => (categoryRemap[t.categoryId] ? { ...t, categoryId: categoryRemap[t.categoryId]! } : t);

  const exTxById = new Map(existing.transactions.map((t) => [t.id, t]));
  const exFingerprints = new Set(existing.transactions.map(transactionFingerprint));
  const transactions: ImportPreview['transactions'] = { added: [], identical: [], possibleDuplicates: [], conflicts: [] };
  for (const raw of backup.data.transactions) {
    const t = remapTx(raw);
    const byId = exTxById.get(t.id);
    if (byId) {
      if (sameTransaction(t, byId)) transactions.identical.push(t);
      else transactions.conflicts.push({ incoming: t, existing: byId });
    } else if (exFingerprints.has(transactionFingerprint(t))) {
      transactions.possibleDuplicates.push(t);
    } else {
      transactions.added.push(t);
    }
  }

  const exBudgetByKey = new Map(existing.budgets.map((b) => [budgetKey(b), b]));
  const budgets: ImportPreview['budgets'] = { added: [], identical: [], conflicts: [] };
  for (const raw of backup.data.budgets) {
    const b = raw.categoryId && categoryRemap[raw.categoryId] ? { ...raw, categoryId: categoryRemap[raw.categoryId]! } : raw;
    const ex = exBudgetByKey.get(budgetKey(b));
    if (!ex) budgets.added.push(b);
    else if (ex.amountPaise === b.amountPaise) budgets.identical.push(b);
    else budgets.conflicts.push({ incoming: b, existing: ex });
  }

  return {
    transactions,
    categories,
    budgets,
    existingCounts: { transactions: existing.transactions.length, categories: existing.categories.length, budgets: existing.budgets.length },
    categoryRemap,
  };
}

// ---------- Apply ----------

export type ImportMode = 'merge' | 'replace';
export type ConflictPolicy = 'keep-existing' | 'use-backup';

export interface ImportOptions {
  mode: ImportMode;
  conflictPolicy: ConflictPolicy;
  /** Import transactions that look identical to existing ones but have different IDs. Default false. */
  includePossibleDuplicates: boolean;
}

export interface ImportResult {
  transactionsWritten: number;
  categoriesWritten: number;
  budgetsWritten: number;
  skipped: number;
}

/**
 * Apply an import inside ONE IndexedDB transaction. If anything fails, nothing is changed.
 * Merge never overwrites existing records unless conflictPolicy === 'use-backup'.
 */
export async function applyImport(backup: BackupFile, options: ImportOptions): Promise<ImportResult> {
  return db.transaction('rw', db.transactions, db.categories, db.budgets, db.settings, async () => {
    if (options.mode === 'replace') {
      await Promise.all([db.transactions.clear(), db.categories.clear(), db.budgets.clear()]);
      await db.categories.bulkAdd(backup.data.categories);
      await ensureEssentialCategories();
      await db.transactions.bulkAdd(backup.data.transactions);
      await db.budgets.bulkAdd(backup.data.budgets);
      await db.settings.bulkPut([
        { key: 'dateFormat', value: backup.data.settings.dateFormat },
        { key: 'theme', value: backup.data.settings.theme },
      ]);
      return {
        transactionsWritten: backup.data.transactions.length,
        categoriesWritten: backup.data.categories.length,
        budgetsWritten: backup.data.budgets.length,
        skipped: 0,
      };
    }

    // Merge: re-analyse against current DB state inside the transaction for consistency.
    const preview = analyzeImport(backup, {
      transactions: await db.transactions.toArray(),
      categories: await db.categories.toArray(),
      budgets: await db.budgets.toArray(),
    });
    const useBackup = options.conflictPolicy === 'use-backup';

    const cats = [...preview.categories.added, ...(useBackup ? preview.categories.conflicts.map((c) => ({ ...c.incoming, isDefault: c.existing.isDefault })) : [])];
    await db.categories.bulkPut(cats);

    const txs = [
      ...preview.transactions.added,
      ...(options.includePossibleDuplicates ? preview.transactions.possibleDuplicates : []),
      ...(useBackup ? preview.transactions.conflicts.map((c) => c.incoming) : []),
    ];
    await db.transactions.bulkPut(txs);

    const budgets = [...preview.budgets.added, ...(useBackup ? preview.budgets.conflicts.map((c) => ({ ...c.incoming, id: c.existing.id })) : [])];
    await db.budgets.bulkPut(budgets);

    const total = backup.data.transactions.length;
    return {
      transactionsWritten: txs.length,
      categoriesWritten: cats.length,
      budgetsWritten: budgets.length,
      skipped: total - txs.length,
    };
  });
}

/** Erase everything and restore default categories + settings. */
export async function clearAllData(): Promise<void> {
  await db.transaction('rw', db.transactions, db.categories, db.budgets, db.settings, async () => {
    await Promise.all([db.transactions.clear(), db.categories.clear(), db.budgets.clear(), db.settings.clear()]);
    await db.categories.bulkAdd(defaultCategories());
    await db.settings.bulkPut([
      { key: 'dateFormat', value: DEFAULT_SETTINGS.dateFormat },
      { key: 'theme', value: DEFAULT_SETTINGS.theme },
    ]);
  });
}
