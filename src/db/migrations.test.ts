import { describe, expect, it } from 'vitest';
import Dexie from 'dexie';
import { DB_VERSION, SCHEMA_V1, SpendWiseDB } from './schema';

describe('database migrations', () => {
  it('upgrades a v1 database to the current version without losing data', async () => {
    const name = 'spendwise-migration-test';
    await Dexie.delete(name);
    const v1 = new Dexie(name);
    v1.version(1).stores(SCHEMA_V1);
    await v1.open();
    await v1.table('categories').add({ id: 'exp-food', type: 'expense', name: 'Food', icon: 'utensils', color: '#ffffff', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' });
    await v1.table('transactions').add({ id: 'old1', type: 'expense', amountPaise: 12345, date: '2026-01-02', categoryId: 'exp-food', paymentMethod: 'cash', createdAt: '2026-01-02T00:00:00Z' });
    v1.close();

    const upgraded = new SpendWiseDB(name);
    await upgraded.open();
    expect(upgraded.verno).toBe(DB_VERSION);
    const t = await upgraded.transactions.get('old1');
    expect(t).toMatchObject({ amountPaise: 12345, notes: '', recipient: '', description: '', updatedAt: '2026-01-02T00:00:00Z' });
    const c = await upgraded.categories.get('exp-food');
    expect(c).toMatchObject({ sortOrder: 0, isDefault: false });
    // New compound index works
    expect(await upgraded.transactions.where('[type+date]').between(['expense', '2026-01-01'], ['expense', '2026-01-31']).count()).toBe(1);
    upgraded.close();
    await Dexie.delete(name);
  });
});
