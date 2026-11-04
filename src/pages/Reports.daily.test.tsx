/**
 * Daily Report UI tests against the real Dexie database (fake-indexeddb).
 * "Today" is pinned to 4 Nov 2026 (Asia/Kolkata) so the assertions are deterministic.
 */
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { db } from '@/db/schema';
import { addTransaction, deleteTransaction, updateTransaction } from '@/repositories/transactions';
import { ToastProvider } from '@/components/ui/toast';
import { QuickAddProvider } from '@/components/transactions/QuickAddProvider';
import type { TransactionInput } from '@/types';
import Reports from './Reports';

vi.mock('@/hooks/useToday', () => ({ useToday: () => '2026-11-04' }));

beforeAll(() => {
  // Recharts' ResponsiveContainer needs ResizeObserver, which jsdom lacks.
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  // jsdom has no layout, so Recharts warns that charts measure 0×0. That is expected here.
  const warn = console.warn.bind(console);
  vi.spyOn(console, 'warn').mockImplementation((...args: unknown[]) => {
    if (typeof args[0] === 'string' && args[0].includes('of chart should be greater than 0')) return;
    warn(...args);
  });
});

const base: TransactionInput = {
  type: 'expense',
  amountPaise: 25000,
  date: '2026-11-04',
  categoryId: 'exp-food',
  description: 'Lunch',
  recipient: '',
  paymentMethod: 'upi',
  notes: '',
};

beforeEach(async () => {
  await db.delete();
  await db.open();
});
afterEach(cleanup);

function renderReports() {
  return render(
    <ToastProvider>
      <MemoryRouter>
        <QuickAddProvider>
          <Reports />
        </QuickAddProvider>
      </MemoryRouter>
    </ToastProvider>,
  );
}

const stat = (name: string) => screen.getByRole('group', { name });
const dateInput = () => screen.getByLabelText<HTMLInputElement>('Report date');

describe('Reports › Daily view', () => {
  it('opens on the Daily view for today', async () => {
    await addTransaction(base);
    renderReports();
    expect(await screen.findByRole('radio', { name: 'Daily' })).toHaveAttribute('aria-checked', 'true');
    await waitFor(() => expect(dateInput().value).toBe('2026-11-04'));
    expect(screen.getAllByText('Wed, 04 Nov 2026').length).toBeGreaterThan(0);
    await waitFor(() => expect(stat('Personal expenses')).toHaveTextContent('₹250'));
  });

  it('shows separate totals and keeps transfers, savings and investments out of spending', async () => {
    await addTransaction(base);
    await addTransaction({ ...base, amountPaise: 50000, categoryId: 'exp-petrol', paymentMethod: 'debit_card', description: 'Fuel' });
    await addTransaction({ ...base, type: 'transfer', amountPaise: 500000, categoryId: 'tr-father', description: '' });
    await addTransaction({ ...base, type: 'income', amountPaise: 120000, categoryId: 'inc-salary', description: '' });
    await addTransaction({ ...base, type: 'savings', amountPaise: 30000, categoryId: 'sav-general', description: '' });
    await addTransaction({ ...base, type: 'investment', amountPaise: 40000, categoryId: 'inv-sip', description: '' });
    renderReports();
    await waitFor(() => expect(stat('Personal expenses')).toHaveTextContent('₹750'));
    expect(stat('Income')).toHaveTextContent('₹1,200');
    expect(stat('Transfers')).toHaveTextContent('₹5,000');
    expect(stat('Savings')).toHaveTextContent('₹300');
    expect(stat('Investments')).toHaveTextContent('₹400');
    expect(stat('Transactions')).toHaveTextContent('6');
    expect(screen.getByText('Highest expense').closest('div')).toHaveTextContent('₹500');
    expect(screen.getByText('Average per expense').closest('div')).toHaveTextContent('₹375');
    expect(screen.getByText('UPI spending').closest('div')).toHaveTextContent('₹250');
    expect(screen.getByText('Debit card spending').closest('div')).toHaveTextContent('₹500');
    expect(screen.getByText('Cash spending').closest('div')).toHaveTextContent('₹0');
  });

  it('navigates between days, blocks future dates and returns to today', async () => {
    await addTransaction({ ...base, date: '2026-11-03', amountPaise: 90000 });
    await addTransaction({ ...base, amountPaise: 120000 });
    renderReports();
    const next = await screen.findByRole('button', { name: 'Next day' });
    expect(next).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Today' })).toBeDisabled();
    await waitFor(() => expect(screen.getByTestId('day-change')).toHaveTextContent('Increase: ₹300 (33.3%)'));

    fireEvent.click(screen.getByRole('button', { name: 'Previous day' }));
    expect(dateInput().value).toBe('2026-11-03');
    await waitFor(() => expect(stat('Personal expenses')).toHaveTextContent('₹900'));
    expect(next).toBeEnabled();

    fireEvent.click(next);
    expect(dateInput().value).toBe('2026-11-04');
    expect(next).toBeDisabled();

    fireEvent.change(dateInput(), { target: { value: '2026-10-15' } });
    expect(dateInput().value).toBe('2026-10-15');
    expect(screen.getByRole('button', { name: 'Today' })).toBeEnabled();

    fireEvent.change(dateInput(), { target: { value: '2027-01-01' } });
    expect(dateInput().value).toBe('2026-11-04');

    fireEvent.change(dateInput(), { target: { value: '2026-10-15' } });
    fireEvent.click(screen.getByRole('button', { name: 'Today' }));
    expect(dateInput().value).toBe('2026-11-04');
  });

  it('handles an empty day without NaN or Infinity', async () => {
    await addTransaction({ ...base, date: '2026-11-01' });
    renderReports();
    await screen.findByText('No transactions on this day');
    expect(stat('Personal expenses')).toHaveTextContent('₹0');
    expect(screen.getByText('No personal expenses on this day')).toBeInTheDocument();
    expect(screen.getByText(/nothing to average/)).toBeInTheDocument();
    expect(screen.getByTestId('day-change')).toHaveTextContent('No spending on either day');
    expect(document.body.textContent).not.toMatch(/NaN|Infinity/);
  });

  it('shows an honest empty state before any records exist', async () => {
    renderReports();
    expect(await screen.findByText('No records for this day')).toBeInTheDocument();
    expect(screen.getByText('Daily reports appear once you record your first transaction.')).toBeInTheDocument();
  });

  it('filters the day’s transactions by type and payment method', async () => {
    await addTransaction({ ...base, description: 'Lunch' });
    await addTransaction({ ...base, description: 'Snacks', paymentMethod: 'cash', amountPaise: 5000 });
    await addTransaction({ ...base, type: 'transfer', categoryId: 'tr-father', description: 'Dad', amountPaise: 100000 });
    renderReports();
    const list = (await screen.findByText('Daily transactions')).closest('.rounded-2xl') as HTMLElement;
    await within(list).findByText('Dad');
    fireEvent.change(within(list).getByLabelText('Filter by type'), { target: { value: 'expense' } });
    expect(within(list).queryByText('Dad')).not.toBeInTheDocument();
    expect(within(list).getByText('Lunch')).toBeInTheDocument();
    fireEvent.change(within(list).getByLabelText('Filter by payment method'), { target: { value: 'cash' } });
    expect(within(list).queryByText('Lunch')).not.toBeInTheDocument();
    expect(within(list).getByText('Snacks')).toBeInTheDocument();
    expect(within(list).getByText('1 of 3')).toBeInTheDocument();
  });

  it('updates immediately when transactions are added, edited or deleted', async () => {
    const first = await addTransaction(base);
    renderReports();
    await waitFor(() => expect(stat('Personal expenses')).toHaveTextContent('₹250'));

    let second!: Awaited<ReturnType<typeof addTransaction>>;
    await act(async () => {
      second = await addTransaction({ ...base, amountPaise: 10000, categoryId: 'exp-transport', description: 'Auto' });
    });
    await waitFor(() => expect(stat('Personal expenses')).toHaveTextContent('₹350'));
    expect(stat('Transactions')).toHaveTextContent('2');

    await act(async () => {
      await updateTransaction(first.id, { ...base, amountPaise: 60000 });
    });
    await waitFor(() => expect(stat('Personal expenses')).toHaveTextContent('₹700'));

    // Changing an expense into a transfer moves it out of spending.
    await act(async () => {
      await updateTransaction(second.id, { ...base, type: 'transfer', categoryId: 'tr-father', amountPaise: 10000, description: '' });
    });
    await waitFor(() => expect(stat('Personal expenses')).toHaveTextContent('₹600'));
    expect(stat('Transfers')).toHaveTextContent('₹100');

    await act(async () => {
      await deleteTransaction(first.id);
    });
    await waitFor(() => expect(stat('Personal expenses')).toHaveTextContent('₹0'));
  });

  it('opens a transaction’s details and deletes it with the existing sheet', async () => {
    await addTransaction({ ...base, description: 'Dinner', amountPaise: 45000 });
    renderReports();
    fireEvent.click(await screen.findByRole('button', { name: /Dinner/ }));
    const sheet = await screen.findByRole('dialog', { name: 'Transaction details' });
    expect(within(sheet).getByRole('button', { name: /Edit/ })).toBeInTheDocument();
    fireEvent.click(within(sheet).getByRole('button', { name: /Delete/ }));
    const confirm = await screen.findByRole('dialog', { name: 'Delete this transaction?' });
    fireEvent.click(within(confirm).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(stat('Personal expenses')).toHaveTextContent('₹0'));
    expect(await db.transactions.count()).toBe(0);
  });

  it('keeps the existing Monthly, Yearly and Custom reports', async () => {
    await addTransaction(base);
    renderReports();
    fireEvent.click(await screen.findByRole('radio', { name: 'Monthly' }));
    expect(await screen.findByText('Expenses by category')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous month' })).toBeInTheDocument();
    expect(screen.getAllByText('November 2026').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'Previous month' }));
    expect(screen.getAllByText('October 2026').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('radio', { name: 'Yearly' }));
    expect(screen.getByLabelText('Year')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: 'Custom' }));
    expect(screen.getByLabelText('From')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: 'Daily' }));
    expect(dateInput().value).toBe('2026-11-04');
  });
});
