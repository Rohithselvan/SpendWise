import * as React from 'react';
import type { Transaction, TxType } from '@/types';

export type QuickAddRequest =
  | { mode: 'create'; type?: TxType; categoryId?: string }
  | { mode: 'edit'; tx: Transaction };

interface QuickAddApi {
  open: (req?: QuickAddRequest) => void;
}

export const QuickAddContext = React.createContext<QuickAddApi | null>(null);

export function useQuickAdd(): QuickAddApi {
  const ctx = React.useContext(QuickAddContext);
  if (!ctx) throw new Error('useQuickAdd must be used inside QuickAddProvider');
  return ctx;
}
