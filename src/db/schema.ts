/**
 * IndexedDB schema (Dexie). Versioned with migrations.
 *
 * v1: initial tables.
 * v2: compound [type+date] index for fast monthly queries; normalises optional text fields
 *     (notes/recipient/description) to empty strings and fills missing updatedAt / sortOrder.
 */
import Dexie, { type Table } from 'dexie';
import type { Budget, Category, SettingRow, Transaction } from '@/types';
import { defaultCategories } from './seed';

export const DB_NAME = 'spendwise';
export const DB_VERSION = 2;

export const SCHEMA_V1 = {
  transactions: 'id, type, date, categoryId, paymentMethod',
  categories: 'id, type',
  budgets: 'id',
  settings: 'key',
};

export const SCHEMA_V2 = {
  transactions: 'id, type, date, categoryId, paymentMethod, [type+date], updatedAt',
  categories: 'id, type, name',
  budgets: 'id, scope, categoryId',
  settings: 'key',
};

export class SpendWiseDB extends Dexie {
  transactions!: Table<Transaction, string>;
  categories!: Table<Category, string>;
  budgets!: Table<Budget, string>;
  settings!: Table<SettingRow, string>;

  constructor(name: string = DB_NAME) {
    super(name);
    this.version(1).stores(SCHEMA_V1);
    this.version(2)
      .stores(SCHEMA_V2)
      .upgrade(async (tx) => {
        await tx
          .table('transactions')
          .toCollection()
          .modify((t: Partial<Transaction>) => {
            t.notes = typeof t.notes === 'string' ? t.notes : '';
            t.recipient = typeof t.recipient === 'string' ? t.recipient : '';
            t.description = typeof t.description === 'string' ? t.description : '';
            t.updatedAt = t.updatedAt ?? t.createdAt ?? new Date().toISOString();
          });
        await tx
          .table('categories')
          .toCollection()
          .modify((c: Partial<Category>) => {
            c.sortOrder = typeof c.sortOrder === 'number' ? c.sortOrder : 0;
            c.isDefault = c.isDefault ?? false;
          });
      });

    // First-ever open: seed default category labels (never transactions).
    this.on('populate', (tx) => {
      void tx.table('categories').bulkAdd(defaultCategories());
    });
  }
}

/** The single application database instance. Only repositories should import this. */
export const db = new SpendWiseDB();
