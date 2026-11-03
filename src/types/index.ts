/** Core domain types for SpendWise. Money is ALWAYS integer paise. */

export const TX_TYPES = ['expense', 'income', 'transfer', 'savings', 'investment'] as const;
export type TxType = (typeof TX_TYPES)[number];

export const PAYMENT_METHODS = ['upi', 'debit_card', 'cash', 'other'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

/** A calendar date in Asia/Kolkata, formatted YYYY-MM-DD. */
export type ISODate = string;

export interface Transaction {
  id: string;
  type: TxType;
  /** Positive integer amount in paise (₹1 = 100 paise). */
  amountPaise: number;
  date: ISODate;
  /** For expense/income/savings/investment: the category. For transfers: the recipient group (e.g. Father). */
  categoryId: string;
  /** Description or merchant name. */
  description: string;
  /** Optional specific recipient name for transfers (e.g. "Rahul"). Empty for other types. */
  recipient: string;
  paymentMethod: PaymentMethod;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export type TransactionInput = Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>;

export interface Category {
  id: string;
  type: TxType;
  name: string;
  /** Lucide icon key, see components/ui/category-icon.tsx */
  icon: string;
  color: string;
  isDefault: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export type BudgetScope = 'overall' | 'category';

/** A monthly budget. Applies to every month until changed or deleted. */
export interface Budget {
  id: string;
  scope: BudgetScope;
  /** Required when scope === 'category'. Only expense categories are allowed. */
  categoryId: string | null;
  amountPaise: number;
  createdAt: string;
  updatedAt: string;
}

export type DateFormatPref = 'DD/MM/YYYY' | 'YYYY-MM-DD';
export type ThemePref = 'dark' | 'light' | 'system';

export interface AppSettings {
  dateFormat: DateFormatPref;
  theme: ThemePref;
  lastBackupAt: string | null;
}

export interface SettingRow {
  key: keyof AppSettings;
  value: unknown;
}

export interface DateRange {
  start: ISODate;
  end: ISODate;
}

export const TX_TYPE_LABEL: Record<TxType, string> = {
  expense: 'Expense',
  income: 'Income',
  transfer: 'Transfer',
  savings: 'Savings',
  investment: 'Investment',
};

export const TX_TYPE_PLURAL: Record<TxType, string> = {
  expense: 'Personal expenses',
  income: 'Income',
  transfer: 'Transfers',
  savings: 'Savings',
  investment: 'Investments',
};

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  upi: 'UPI',
  debit_card: 'Debit card',
  cash: 'Cash',
  other: 'Other',
};
