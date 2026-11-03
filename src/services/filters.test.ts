import { describe, expect, it } from 'vitest';
import { tx } from '@/test/factories';
import { defaultCategories } from '@/db/seed';
import { EMPTY_FILTERS, filterTransactions } from './filters';

const cats = new Map(defaultCategories().map((c) => [c.id, c]));
const list = [
  tx({ id: 'a', date: '2026-10-01', amountPaise: 500, description: 'Swiggy dinner', categoryId: 'exp-food', paymentMethod: 'upi' }),
  tx({ id: 'b', date: '2026-10-10', amountPaise: 90000, description: 'Indian Oil', categoryId: 'exp-petrol', paymentMethod: 'cash' }),
  tx({ id: 'c', date: '2026-10-20', type: 'transfer', amountPaise: 4500000, categoryId: 'tr-father', paymentMethod: 'upi' }),
  tx({ id: 'd', date: '2026-11-02', type: 'transfer', amountPaise: 20000, categoryId: 'tr-friends', recipient: 'Rahul' }),
];
const ids = (f: Partial<typeof EMPTY_FILTERS>) => filterTransactions(list, { ...EMPTY_FILTERS, ...f }, cats).map((t) => t.id);

describe('transaction filtering', () => {
  it('searches description, recipient and category name', () => {
    expect(ids({ query: 'swiggy' })).toEqual(['a']);
    expect(ids({ query: 'rahul' })).toEqual(['d']);
    expect(ids({ query: 'father' })).toEqual(['c']);
  });
  it('filters by type, category and payment method', () => {
    expect(ids({ types: ['transfer'] })).toEqual(['d', 'c']);
    expect(ids({ categoryIds: ['exp-petrol'] })).toEqual(['b']);
    expect(ids({ paymentMethods: ['cash'] })).toEqual(['b']);
  });
  it('filters by date range inclusively', () => {
    expect(ids({ start: '2026-10-10', end: '2026-10-20' })).toEqual(['c', 'b']);
    expect(ids({ start: '2026-11-01' })).toEqual(['d']);
    expect(ids({ end: '2026-10-01' })).toEqual(['a']);
  });
  it('sorts four ways', () => {
    expect(ids({ sort: 'newest' })).toEqual(['d', 'c', 'b', 'a']);
    expect(ids({ sort: 'oldest' })).toEqual(['a', 'b', 'c', 'd']);
    expect(ids({ sort: 'highest' })).toEqual(['c', 'b', 'd', 'a']);
    expect(ids({ sort: 'lowest' })).toEqual(['a', 'd', 'b', 'c']);
  });
});
