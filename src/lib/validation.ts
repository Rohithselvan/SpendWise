/** Zod schemas shared by forms, repositories and backup import. */
import { z } from 'zod';
import { isValidISODate } from './dates';
import { MAX_PAISE } from './money';
import { PAYMENT_METHODS, TX_TYPES } from '@/types';

export const txTypeSchema = z.enum(TX_TYPES);
export const paymentMethodSchema = z.enum(PAYMENT_METHODS);

export const paiseSchema = z
  .number({ invalid_type_error: 'Enter a valid amount' })
  .int('Amount can have at most two decimal places')
  .positive('Amount must be greater than ₹0')
  .max(MAX_PAISE, 'Amount is too large');

export const isoDateSchema = z.string().refine(isValidISODate, 'Enter a valid date');
export const timestampSchema = z.string().refine((s) => !Number.isNaN(Date.parse(s)), 'Invalid timestamp');

export const transactionInputSchema = z.object({
  type: txTypeSchema,
  amountPaise: paiseSchema,
  date: isoDateSchema,
  categoryId: z.string().min(1, 'Choose a category'),
  description: z.string().trim().max(120, 'Keep the description under 120 characters'),
  recipient: z.string().trim().max(60, 'Keep the recipient under 60 characters'),
  paymentMethod: paymentMethodSchema,
  notes: z.string().trim().max(1000, 'Keep notes under 1000 characters'),
});

export const transactionSchema = transactionInputSchema.extend({
  id: z.string().min(1),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const categoryInputSchema = z.object({
  type: txTypeSchema,
  name: z.string().trim().min(1, 'Enter a name').max(40, 'Keep the name under 40 characters'),
  icon: z.string().min(1),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Invalid colour'),
});

export const categorySchema = categoryInputSchema.extend({
  id: z.string().min(1),
  isDefault: z.boolean(),
  sortOrder: z.number().int(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const budgetInputSchema = z
  .object({
    scope: z.enum(['overall', 'category']),
    categoryId: z.string().min(1).nullable(),
    amountPaise: paiseSchema,
  })
  .refine((b) => (b.scope === 'category' ? !!b.categoryId : b.categoryId === null), {
    message: 'Choose a category for a category budget',
    path: ['categoryId'],
  });

export const budgetSchema = z
  .object({
    id: z.string().min(1),
    scope: z.enum(['overall', 'category']),
    categoryId: z.string().min(1).nullable(),
    amountPaise: paiseSchema,
    createdAt: timestampSchema,
    updatedAt: timestampSchema,
  });

export const settingsSchema = z.object({
  dateFormat: z.enum(['DD/MM/YYYY', 'YYYY-MM-DD']),
  theme: z.enum(['dark', 'light', 'system']),
  lastBackupAt: z.string().nullable(),
});

/** Return the first validation message from a Zod error. */
export function firstIssue(err: z.ZodError): string {
  return err.issues[0]?.message ?? 'Invalid input';
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}
