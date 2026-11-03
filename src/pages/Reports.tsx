import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowDownLeft, CalendarRange, Download, Landmark, PiggyBank, ReceiptText, Send } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Segmented } from '@/components/ui/segmented';
import { Button } from '@/components/ui/button';
import { Input, Label, Select } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/empty-state';
import { useToast } from '@/components/ui/toast';
import { CategoryDonut } from '@/components/charts/CategoryDonut';
import { PaymentMethodBars } from '@/components/charts/PaymentMethodBars';
import { SpendTrendChart, TrendLegend, hasTrackedData } from '@/components/charts/SpendTrendChart';
import { ComparisonTable } from '@/components/reports/ComparisonTable';
import { TypeSummary } from '@/components/reports/TypeSummary';
import { TransactionRow, transactionTitle } from '@/components/transactions/TransactionRow';
import { TransactionDetailSheet } from '@/components/transactions/TransactionDetailSheet';
import { useAllTransactions, useCategoryMap, useSettings, useTrackingStart } from '@/hooks/useData';
import { useToday } from '@/hooks/useToday';
import { buildPeriodReport } from '@/services/reports';
import type { PeriodKind } from '@/services/calculations';
import { transactionsToCsv } from '@/services/csv';
import { formatDisplayDate, formatMonthLabel, isValidISODate, monthKey, monthRange, monthRangeFromKey, shiftMonthKey, yearRange } from '@/lib/dates';
import { formatINR } from '@/lib/money';
import { saveFileLocally } from '@/lib/storage';
import { transactionsLink } from '@/lib/links';
import { friendlyError } from '@/lib/utils';
import type { DateRange, Transaction } from '@/types';

type Preset = 'this-month' | 'last-month' | 'year' | 'custom';

export default function Reports() {
  const today = useToday();
  const all = useAllTransactions();
  const trackingStart = useTrackingStart();
  const categories = useCategoryMap();
  const { dateFormat } = useSettings();
  const navigate = useNavigate();
  const toast = useToast();
  const [preset, setPreset] = React.useState<Preset>('this-month');
  const [year, setYear] = React.useState(Number(today.slice(0, 4)));
  const [custom, setCustom] = React.useState<DateRange>(() => ({ start: monthRange(today).start, end: today }));
  const [selected, setSelected] = React.useState<Transaction | null>(null);

  const customValid = isValidISODate(custom.start) && isValidISODate(custom.end) && custom.start <= custom.end;
  const { range, kind, title } = React.useMemo((): { range: DateRange; kind: PeriodKind; title: string } => {
    const cur = monthKey(today);
    if (preset === 'last-month') {
      const k = shiftMonthKey(cur, -1);
      return { range: monthRangeFromKey(k), kind: 'month', title: formatMonthLabel(k) };
    }
    if (preset === 'year') return { range: yearRange(year), kind: 'year', title: String(year) };
    if (preset === 'custom' && customValid) return { range: custom, kind: 'custom', title: `${formatDisplayDate(custom.start, dateFormat)} – ${formatDisplayDate(custom.end, dateFormat)}` };
    return { range: monthRangeFromKey(cur), kind: 'month', title: formatMonthLabel(cur) };
  }, [preset, today, year, custom, customValid, dateFormat]);

  const report = React.useMemo(() => (all && trackingStart !== undefined ? buildPeriodReport(all, range, kind, { today, trackingStart }) : null), [all, range, kind, today, trackingStart]);

  const firstYear = trackingStart ? Number(trackingStart.slice(0, 4)) : Number(today.slice(0, 4));
  const years: number[] = [];
  for (let y = Number(today.slice(0, 4)); y >= Math.min(firstYear, year); y--) years.push(y);

  const rangeLabel = (r: DateRange) => `${formatDisplayDate(r.start, dateFormat)} – ${formatDisplayDate(r.end, dateFormat)}`;

  async function exportCsv() {
    if (!report) return;
    try {
      const csv = transactionsToCsv(report.txs, categories, range);
      const outcome = await saveFileLocally(`spendwise-${range.start}-to-${range.end}.csv`, csv, 'text/csv;charset=utf-8');
      if (outcome !== 'cancelled') toast.success('CSV exported');
    } catch (err) {
      toast.error(friendlyError(err, 'Could not export the CSV file.'));
    }
  }

  return (
    <>
      <PageHeader title="Reports" subtitle={title} />
      <div className="space-y-3">
        <Segmented<Preset>
          label="Report period"
          value={preset}
          onChange={setPreset}
          options={[
            { value: 'this-month', label: 'This month' },
            { value: 'last-month', label: 'Last month' },
            { value: 'year', label: 'Year' },
            { value: 'custom', label: 'Custom' },
          ]}
        />
        {preset === 'year' && (
          <div className="max-w-[200px]">
            <Label htmlFor="year">Year</Label>
            <Select id="year" value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </Select>
          </div>
        )}
        {preset === 'custom' && (
          <div className="grid max-w-[460px] grid-cols-2 gap-3">
            <div>
              <Label htmlFor="r-from">From</Label>
              <Input id="r-from" type="date" value={custom.start} onChange={(e) => setCustom((c) => ({ ...c, start: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="r-to">To</Label>
              <Input id="r-to" type="date" value={custom.end} onChange={(e) => setCustom((c) => ({ ...c, end: e.target.value }))} />
            </div>
            {!customValid && <p role="alert" className="col-span-2 text-sm text-[#ff8a80]">Choose a start date on or before the end date. Showing this month meanwhile.</p>}
          </div>
        )}
      </div>

      {!report ? (
        <div className="mt-4 h-64 animate-pulse rounded-2xl bg-ink-900" aria-busy="true" aria-label="Loading" />
      ) : report.currentCoverage === 'none' ? (
        <Card className="mt-4">
          <EmptyState
            icon={CalendarRange}
            title="No records for this period"
            body={trackingStart ? `Your records start on ${formatDisplayDate(trackingStart, dateFormat)}. Pick a period after that.` : 'Reports appear once you record your first transaction.'}
          />
        </Card>
      ) : (
        <div className="mt-4 grid gap-4 lg:grid-cols-2 [&>*]:min-w-0">
          {report.currentCoverage === 'partial' && trackingStart && (
            <p className="rounded-xl border border-line bg-ink-900 px-4 py-3 text-sm text-fg-muted lg:col-span-2">
              Your records start on {formatDisplayDate(trackingStart, dateFormat)}, so earlier days in this period are shown as having no data rather than ₹0.
            </p>
          )}

          <Card className="lg:col-span-2">
            <CardHeader
              title="Summary"
              action={
                <Button size="sm" variant="secondary" onClick={() => void exportCsv()} disabled={report.txs.length === 0}>
                  <Download className="h-4 w-4" aria-hidden /> CSV
                </Button>
              }
            />
            <CardBody>
              <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat label="Personal expenses" value={formatINR(report.totals.expense, { decimals: 'never' })} />
                <Stat label="Average a day" value={report.averageDailyExpense === null ? '—' : formatINR(report.averageDailyExpense, { decimals: 'never' })} hint={`${report.trackedDays} tracked ${report.trackedDays === 1 ? 'day' : 'days'}`} />
                <Stat label="Highest expense" value={report.highestExpense ? formatINR(report.highestExpense.amountPaise, { decimals: 'never' }) : '—'} hint={report.highestExpense ? transactionTitle(report.highestExpense, categories.get(report.highestExpense.categoryId)) : undefined} />
                <Stat label="Top category" value={report.categories[0] ? categories.get(report.categories[0].key)?.name ?? '—' : '—'} hint={report.categories[0] ? `${report.categories[0].percent}% of spending` : undefined} />
              </div>
              <ComparisonTable report={report} rangeLabel={rangeLabel} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Expenses by category" />
            <CardBody>
              {report.categories.length ? (
                <CategoryDonut rows={report.categories} categories={categories} total={report.totals.expense} onSelect={(id) => navigate(transactionsLink({ type: 'expense', categoryId: id, range }))} />
              ) : (
                <EmptyState icon={ReceiptText} title="No personal expenses in this period" className="py-6" />
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Payment methods" description="Personal expenses only" />
            <CardBody>
              {report.paymentMethods.length ? (
                <PaymentMethodBars rows={report.paymentMethods} onSelect={(pm) => navigate(transactionsLink({ type: 'expense', method: pm, range }))} />
              ) : (
                <EmptyState icon={ReceiptText} title="No personal expenses in this period" className="py-6" />
              )}
            </CardBody>
          </Card>

          {report.daily.length > 0 && (
            <Card>
              <CardHeader title="Daily spending" />
              <CardBody>
                {hasTrackedData(report.daily) ? (
                  <>
                    <SpendTrendChart points={report.daily} ariaLabel="Daily personal spending" />
                    <TrendLegend />
                  </>
                ) : (
                  <EmptyState icon={ReceiptText} title="No tracked days in this period" className="py-6" />
                )}
              </CardBody>
            </Card>
          )}

          {report.weekly.length > 0 && (
            <Card>
              <CardHeader title="Weekly spending" description="Weeks start on Monday" />
              <CardBody>{hasTrackedData(report.weekly) ? <SpendTrendChart points={report.weekly} ariaLabel="Weekly personal spending" /> : <EmptyState icon={ReceiptText} title="No tracked weeks" className="py-6" />}</CardBody>
            </Card>
          )}

          <Card className={report.daily.length > 0 && report.weekly.length > 0 ? 'lg:col-span-2' : undefined}>
            <CardHeader title="Monthly spending trend" description="Months before your first record show no bar" />
            <CardBody>
              <SpendTrendChart points={report.monthly} height={220} ariaLabel="Monthly personal spending trend" />
              <TrendLegend />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Income" description={formatINR(report.totals.income)} action={<ArrowDownLeft className="h-5 w-5 text-tx-income" aria-hidden />} />
            <CardBody className="pt-0">
              <TypeSummary txs={report.txs} type="income" categories={categories} emptyText="No income recorded in this period." />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Transfers" description={formatINR(report.totals.transfer)} action={<Send className="h-5 w-5 text-tx-transfer" aria-hidden />} />
            <CardBody className="pt-0">
              <TypeSummary txs={report.txs} type="transfer" categories={categories} emptyText="No transfers in this period." />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Savings" description={formatINR(report.totals.savings)} action={<PiggyBank className="h-5 w-5 text-tx-savings" aria-hidden />} />
            <CardBody className="pt-0">
              <TypeSummary txs={report.txs} type="savings" categories={categories} emptyText="Nothing moved to savings in this period." />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Investments" description={formatINR(report.totals.investment)} action={<Landmark className="h-5 w-5 text-tx-investment" aria-hidden />} />
            <CardBody className="pt-0">
              <TypeSummary txs={report.txs} type="investment" categories={categories} emptyText="No investments in this period." />
            </CardBody>
          </Card>

          {report.largestExpenses.length > 0 && (
            <Card className="lg:col-span-2">
              <CardHeader title="Largest expenses" />
              <CardBody className="pt-1">
                {report.largestExpenses.map((t) => (
                  <TransactionRow key={t.id} tx={t} category={categories.get(t.categoryId)} onSelect={setSelected} showDate today={today} />
                ))}
              </CardBody>
            </Card>
          )}
        </div>
      )}
      <TransactionDetailSheet tx={selected} onClose={() => setSelected(null)} />
    </>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl bg-ink-850 p-3">
      <p className="text-[13px] text-fg-muted">{label}</p>
      <p className="num mt-1 truncate text-lg font-bold">{value}</p>
      {hint && <p className="mt-0.5 truncate text-xs text-fg-subtle">{hint}</p>}
    </div>
  );
}
