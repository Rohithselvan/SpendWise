/** Transaction data access. UI components must go through these functions, never Dexie directly. */
import { db } from '@/db/schema';
import { firstIssue, transactionInputSchema, ValidationError } from '@/lib/validation';
import { newId, nowISO } from '@/lib/utils';
import type { DateRange, Transaction, TransactionInput } from '@/types';

function validate(input: TransactionInput): TransactionInput {
  const parsed = transactionInputSchema.safeParse(input);
  if (!parsed.success) throw new ValidationError(firstIssue(parsed.error));
  const v = parsed.data;
  // Recipient name only applies to transfers.
  return { ...v, recipient: v.type === 'transfer' ? v.recipient : '' };
}

async function assertCategory(input: TransactionInput): Promise<void> {
  const cat = await db.categories.get(input.categoryId);
  if (!cat) throw new ValidationError('That category no longer exists. Choose another one.');
  if (cat.type !== input.type) throw new ValidationError('The selected category does not match the transaction type.');
}

export async function addTransaction(input: TransactionInput): Promise<Transaction> {
  const clean = validate(input);
  await assertCategory(clean);
  const now = nowISO();
  const tx: Transaction = { ...clean, id: newId(), createdAt: now, updatedAt: now };
  await db.transactions.add(tx);
  return tx;
}

export async function updateTransaction(id: string, input: TransactionInput): Promise<Transaction> {
  const existing = await db.transactions.get(id);
  if (!existing) throw new ValidationError('This transaction no longer exists.');
  const clean = validate(input);
  await assertCategory(clean);
  const updated: Transaction = { ...existing, ...clean, id, updatedAt: nowISO() };
  await db.transactions.put(updated);
  return updated;
}

export async function deleteTransaction(id: string): Promise<void> {
  await db.transactions.delete(id);
}

export async function getTransaction(id: string): Promise<Transaction | undefined> {
  return db.transactions.get(id);
}

export async function listAllTransactions(): Promise<Transaction[]> {
  return db.transactions.orderBy('date').reverse().toArray();
}

export async function listTransactionsInRange(range: DateRange): Promise<Transaction[]> {
  return db.transactions.where('date').between(range.start, range.end, true, true).toArray();
}

/** Earliest recorded transaction date, or null if none. Used to tell "no records yet" apart from ₹0. */
export async function getEarliestTransactionDate(): Promise<string | null> {
  const first = await db.transactions.orderBy('date').first();
  return first?.date ?? null;
}

export async function countTransactions(): Promise<number> {
  return db.transactions.count();
}

/** Re-insert a just-deleted transaction (used by Undo). */
export async function restoreTransaction(tx: Transaction): Promise<void> {
  await db.transactions.put(tx);
}
