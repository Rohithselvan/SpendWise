import * as React from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowDownLeft, Plus, ReceiptText, Send, Sparkles } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { MonthSwitcher } from '@/components/layout/MonthSwitcher';
import { OutflowHero } from '@/components/dashboard/OutflowHero';
import { SummaryCards } from '@/components/dashboard/SummaryCards';
import { BudgetProgress } from '@/components/dashboard/BudgetProgress';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { CategoryDonut } from '@/components/charts/CategoryDonut';
import { SpendTrendChart, TrendLegend, hasTrackedData } from '@/components/charts/SpendTrendChart';
import { PaymentMethodBars } from '@/components/charts/PaymentMethodBars';
import { TransactionRow } from '@/components/transactions/TransactionRow';
import { TransactionDetailSheet } from '@/components/transactions/TransactionDetailSheet';
import { useQuickAdd } from '@/components/transactions/QuickAddContext';
import { useAllTransactions, useBudgets, useCategoryMap, useTrackingStart } from '@/hooks/useData';
import { useToday } from '@/hooks/useToday';
import { buildPeriodReport, evaluateBudgets } from '@/services/reports';
import { countByType, recentTransactions } from '@/services/calculations';
import { monthKey, monthRangeFromKey } from '@/lib/dates';
import { formatINR } from '@/lib/money';
import { transactionsLink } from '@/lib/links';
import { FATHER_RECIPIENT_ID } from '@/db/seed';
import type { Transaction } from '@/types';

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export default function Overview() {
  const today = useToday();
  const [params, setParams] = useSearchParams();
  const currentKey = monthKey(today);
  const mParam = params.get('m');
  const month = mParam && MONTH_RE.test(mParam) ? mParam : currentKey;
  const range = React.useMemo(() => monthRangeFromKey(month), [month]);

  const all = useAllTransactions();
  const trackingStart = useTrackingStart();
  const categories = useCategoryMap();
  const budgets = useBudgets();
  const quickAdd = useQuickAdd();
  const navigate = useNavigate();
  const [selected, setSelected] = React.useState<Transaction | null>(null);

  const report = React.useMemo(
    () => (all && trackingStart !== undefined ? buildPeriodReport(all, range, 'month', { today, trackingStart }) : null),
    [all, range, today, trackingStart],
  );
  const budgetStatus = React.useMemo(() => (report && budgets ? evaluateBudgets(budgets, report.txs) : []), [report, budgets]);

  const setMonth = (k: string) => {
    const next = new URLSearchParams(params);
    if (k === currentKey) next.delete('m');
    else next.set('m', k);
    setParams(next, { replace: true });
  };

  const shortcuts = (
    <div className="grid grid-cols-3 gap-2">
      <Button variant="secondary" className="h-auto min-h-[56px] flex-col gap-1 py-2 text-[13px]" onClick={() => quickAdd.open({ mode: 'create', type: 'expense' })}>
        <Plus className="h-5 w-5 text-tx-expense" aria-hidden /> Add expense
      </Button>
      <Button variant="secondary" className="h-auto min-h-[56px] flex-col gap-1 py-2 text-[13px]" onClick={() => quickAdd.open({ mode: 'create', type: 'income' })}>
        <ArrowDownLeft className="h-5 w-5 text-tx-income" aria-hidden /> Add income
      </Button>
      <Button
        variant="secondary"
        className="h-auto min-h-[56px] flex-col gap-1 py-2 text-[13px]"
        onClick={() => quickAdd.open({ mode: 'create', type: 'transfer', categoryId: FATHER_RECIPIENT_ID })}
      >
        <Send className="h-5 w-5 text-tx-transfer" aria-hidden /> Transfer to Father
      </Button>
    </div>
  );

  if (!report || !all) {
    return (
      <>
        <PageHeader title="Overview" />
        <div className="h-48 animate-pulse rounded-3xl bg-ink-900" aria-busy="true" aria-label="Loading" />
      </>
    );
  }

  const header = <PageHeader title="Overview" action={<MonthSwitcher value={month} onChange={setMonth} maxKey={currentKey} />} />;

  // Fresh install: nothing recorded at all.
  if (all.length === 0) {
    return (
      <>
        {header}
        <Card>
          <EmptyState
            icon={Sparkles}
            title="Start with your first entry"
            body="Record what you spend, what you send to your father, and what you save or invest. Everything stays on this device."
          />
          <div className="px-4 pb-5 sm:px-5">{shortcuts}</div>
        </Card>
      </>
    );
  }

  const tracked = report.currentCoverage !== 'none';
  const counts = countByType(report.txs);
  const expenseCmp = report.comparison.previousCoverage === 'none' ? null : report.comparison.byType.expense;
  const topCat = report.categories[0];
  const hasExpenses = report.totals.expense > 0;

  return (
    <>
      {header}
      <div className="space-y-4">
        <OutflowHero totals={report.totals} expenseCount={counts.expense} comparison={expenseCmp} partial={report.comparison.ranges.partial} tracked={tracked} range={range} />
        {shortcuts}
        <SummaryCards totals={report.totals} range={range} tracked={tracked} />

        {report.txs.length === 0 ? (
          <Card>
            <EmptyState
              icon={ReceiptText}
              title={tracked ? 'Nothing recorded this month' : 'No records for this month'}
              body={tracked ? 'Add a transaction to see your breakdown.' : 'You started tracking later than this month, so there is nothing to show here.'}
            />
          </Card>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2 [&>*]:min-w-0">
            {budgetStatus.length > 0 && (
              <Card className="lg:col-span-2">
                <CardHeader title="Budgets" action={<Link to="/settings/budgets" className="text-sm font-semibold text-accent">Manage</Link>} />
                <CardBody className="grid gap-4 sm:grid-cols-2">
                  {budgetStatus.map((s) => (
                    <BudgetProgress key={s.budget.id} status={s} categories={categories} />
                  ))}
                </CardBody>
              </Card>
            )}

            <Card>
              <CardHeader
                title="Where your money went"
                description={topCat ? `Top category: ${categories.get(topCat.key)?.name ?? 'Unknown'}, ${formatINR(topCat.totalPaise)} (${topCat.percent}%)` : undefined}
              />
              <CardBody>
                {hasExpenses ? (
                  <CategoryDonut rows={report.categories} categories={categories} total={report.totals.expense} limit={6} onSelect={(id) => navigate(transactionsLink({ type: 'expense', categoryId: id, range }))} />
                ) : (
                  <EmptyState icon={ReceiptText} title="No personal expenses this month" body="Transfers, savings and investments are not counted here." className="py-6" />
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Daily spending" description={report.averageDailyExpense !== null ? `Average ${formatINR(report.averageDailyExpense, { decimals: 'never' })} a day` : undefined} />
              <CardBody>
                {hasTrackedData(report.daily) ? (
                  <>
                    <SpendTrendChart points={report.daily} ariaLabel="Daily personal spending this month" />
                    <TrendLegend />
                  </>
                ) : (
                  <EmptyState icon={ReceiptText} title="No days to show yet" className="py-6" />
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Weekly spending" description="Weeks start on Monday" />
              <CardBody>
                {hasTrackedData(report.weekly) ? <SpendTrendChart points={report.weekly} height={170} ariaLabel="Weekly personal spending this month" /> : <EmptyState icon={ReceiptText} title="No weeks to show yet" className="py-6" />}
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Payment methods" description="Personal expenses only" />
              <CardBody>
                {report.paymentMethods.length ? (
                  <PaymentMethodBars rows={report.paymentMethods} onSelect={(pm) => navigate(transactionsLink({ type: 'expense', method: pm, range }))} />
                ) : (
                  <EmptyState icon={ReceiptText} title="No expenses yet" className="py-6" />
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Largest expenses" />
              <CardBody className="pt-1">
                {report.largestExpenses.length ? (
                  report.largestExpenses.map((t) => <TransactionRow key={t.id} tx={t} category={categories.get(t.categoryId)} onSelect={setSelected} showDate today={today} />)
                ) : (
                  <EmptyState icon={ReceiptText} title="No expenses yet" className="py-6" />
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Recent" action={<Link to={transactionsLink({ range })} className="text-sm font-semibold text-accent">See all</Link>} />
              <CardBody className="pt-1">
                {recentTransactions(report.txs, 6).map((t) => (
                  <TransactionRow key={t.id} tx={t} category={categories.get(t.categoryId)} onSelect={setSelected} showDate today={today} />
                ))}
              </CardBody>
            </Card>
          </div>
        )}
      </div>
      <TransactionDetailSheet tx={selected} onClose={() => setSelected(null)} />
    </>
  );
}
