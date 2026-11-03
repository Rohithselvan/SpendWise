import type { DateRange, PaymentMethod, TxType } from '@/types';

/** Build a /transactions link with filters encoded in the query string. */
export function transactionsLink(opts: { type?: TxType; categoryId?: string; method?: PaymentMethod; range?: DateRange }): string {
  const p = new URLSearchParams();
  if (opts.type) p.set('type', opts.type);
  if (opts.categoryId) p.set('cat', opts.categoryId);
  if (opts.method) p.set('pm', opts.method);
  if (opts.range) {
    p.set('from', opts.range.start);
    p.set('to', opts.range.end);
  }
  const q = p.toString();
  return q ? `/transactions?${q}` : '/transactions';
}
