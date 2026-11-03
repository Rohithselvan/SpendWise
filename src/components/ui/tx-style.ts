import { ArrowDownLeft, ArrowUpRight, Landmark, PiggyBank, Send, type LucideIcon } from 'lucide-react';
import type { TxType } from '@/types';

/** Visual language for transaction types — used consistently across the app. */
export const TX_COLOR: Record<TxType, string> = {
  expense: '#f2706b',
  income: '#2fd08a',
  transfer: '#7aa7ff',
  savings: '#e8c25a',
  investment: '#c08cf5',
};

export const TX_ICON: Record<TxType, LucideIcon> = {
  expense: ArrowUpRight,
  income: ArrowDownLeft,
  transfer: Send,
  savings: PiggyBank,
  investment: Landmark,
};

/** Sign shown before amounts in lists. Only income adds to your money; everything else leaves your account. */
export const TX_SIGN: Record<TxType, string> = {
  expense: '−',
  income: '+',
  transfer: '−',
  savings: '−',
  investment: '−',
};
