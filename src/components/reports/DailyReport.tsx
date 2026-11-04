import * as React from 'react';
import { ArrowDownRight, ArrowUpRight, CalendarDays, ChevronLeft, ChevronRight, Equal, Plus, ReceiptText, SearchX } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/empty-state';
import { TX_COLOR } from '@/components/ui/tx-style';
import { CategoryDonut } from '@/components/charts/CategoryDonut';
import { TransactionRow, transactionTitle } from '@/components/transactions/TransactionRow';
import { useQuickAdd } from '@/components/transactions/QuickAddContext';
import { buildDailyReport, canGoToNextDay, clampReportDate, describeDayChange, shiftReportDate, type DailyReport as DailyReportData, type DayComparison } from '@/services/dailyReport';
import { EMPTY_FILTERS, filterTransactions } from '@/services/filters';
import { formatDisplayDate, formatFriendlyDate, formatLongDay } from '@/lib/dates';
import { formatINR } from '@/lib/money';
import { cn } from '@/lib/utils';
import { PAYMENT_METHODS, PAYMENT_METHOD_LABEL, TX_TYPES, TX_TYPE_LABEL, TX_TYPE_PLURAL, type Category, type DateFormatPref, type ISODate, type PaymentMethod, type Transaction, type TxType } from '@/types';

interface Props {
  date: ISODate;
  onDateChange: (d: ISODate) => void;
  today: ISODate;
  allTxs: readonly Transaction[];
  trackingStart: ISODate | null;
  categories: ReadonlyMap<string, Category>;
  dateFormat: DateFormatPref;
  onSelectTx: (t: Transaction) => void;
}

const rupees = (p: number) => formatINR(p);

export function DailyReport({ date, onDateChange, today, allTxs, trackingStart, categories, dateFormat, onSelectTx }: Props) {
  const report = React.useMemo(() => buildDailyReport(allTxs, date, { today, trackingStart }), [allTxs, date, today, trackingStart]);
  const quickAdd = useQuickAdd();
  const beforeRecords = report.coverage === 'none' && report.totals.count === 0;

  return (
    <div className="space-y-4">
      <DayNavigator date={date} today={today} onChange={onDateChange} />

      <Card>
        <CardHeader title={formatLongDay(date)} description={date === today ? 'Today' : formatFriendlyDate(date, today)} />
        <CardBody>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <SummaryStat label={TX_TYPE_PLURAL.expense} value={rupees(report.totals.expense)} color={TX_COLOR.expense} emphasis />
            <SummaryStat label="Income" value={rupees(report.totals.income)} color={TX_COLOR.income} />
            <SummaryStat label="Transfers" value={rupees(report.totals.transfer)} color={TX_COLOR.transfer} />
            <SummaryStat label="Savings" value={rupees(report.totals.savings)} color={TX_COLOR.savings} />
            <SummaryStat label="Investments" value={rupees(report.totals.investment)} color={TX_COLOR.investment} />
            <SummaryStat label="Transactions" value={String(report.totals.count)} />
          </div>
          <p className="mt-3 text-xs text-fg-subtle">Only personal expenses count as spending. Income, transfers, savings and investments are shown separately.</p>
        </CardBody>
      </Card>

      {beforeRecords ? (
        <Card>
          <EmptyState
            icon={CalendarDays}
            title="No records for this day"
            body={trackingStart ? `Your records start on ${formatDisplayDate(trackingStart, dateFormat)}.` : 'Daily reports appear once you record your first transaction.'}
            action={
              date === today ? (
                <Button size="sm" onClick={() => quickAdd.open()}>
                  <Plus className="h-4 w-4" aria-hidden /> Add transaction
                </Button>
              ) : undefined
            }
          />
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 [&>*]:min-w-0">
          <Card>
            <CardHeader title="Expense breakdown" description="Personal expenses by category" />
            <CardBody>
              {report.categories.length ? (
                <CategoryDonut rows={report.categories} categories={categories} total={report.totals.expense} showCount />
              ) : (
                <EmptyState icon={ReceiptText} title="No personal expenses on this day" className="py-6" />
              )}
            </CardBody>
          </Card>

          <div className="space-y-4">
            <InsightsCard report={report} categories={categories} />
            <ComparisonCard comparison={report.comparison} dateLabel={date === today ? 'Today' : formatFriendlyDate(date, today)} previousLabel={formatFriendlyDate(report.comparison.previousDate, today)} />
          </div>

          <DayTransactions className="lg:col-span-2" txs={report.txs} categories={categories} today={today} onSelect={onSelectTx} onAdd={date === today ? () => quickAdd.open() : undefined} />
        </div>
      )}
    </div>
  );
}

export function DayNavigator({ date, today, onChange }: { date: ISODate; today: ISODate; onChange: (d: ISODate) => void }) {
  const isToday = date === today;
  const nav = 'grid h-11 w-11 shrink-0 place-items-center rounded-xl text-fg-muted hover:bg-ink-800 hover:text-fg disabled:opacity-30 disabled:hover:bg-transparent sm:w-auto sm:px-3';
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex min-w-0 flex-1 items-center gap-1 rounded-xl border border-line bg-ink-900 p-1 sm:flex-none">
        <button type="button" className={nav} onClick={() => onChange(shiftReportDate(date, -1, today))} aria-label="Previous day">
          <span className="flex items-center gap-1">
            <ChevronLeft className="h-5 w-5" aria-hidden />
            <span className="hidden text-sm font-semibold sm:inline">Previous</span>
          </span>
        </button>
        <Input
          type="date"
          aria-label="Report date"
          value={date}
          max={today}
          onChange={(e) => {
            // Ignore partial / cleared input; clamp anything past today.
            if (e.target.value) onChange(clampReportDate(e.target.value, today));
          }}
          className="h-11 min-w-0 flex-1 border-transparent bg-transparent text-center text-[15px] font-semibold sm:w-[170px] sm:flex-none"
        />
        <button type="button" className={nav} onClick={() => onChange(shiftReportDate(date, 1, today))} disabled={!canGoToNextDay(date, today)} aria-label="Next day">
          <span className="flex items-center gap-1">
            <span className="hidden text-sm font-semibold sm:inline">Next</span>
            <ChevronRight className="h-5 w-5" aria-hidden />
          </span>
        </button>
      </div>
      <Button variant="secondary" className="h-[52px]" onClick={() => onChange(today)} disabled={isToday} aria-pressed={isToday}>
        Today
      </Button>
    </div>
  );
}

function SummaryStat({ label, value, color, emphasis }: { label: string; value: string; color?: string; emphasis?: boolean }) {
  return (
    <div role="group" aria-label={label} className={cn('rounded-xl bg-ink-850 p-3', emphasis && 'col-span-2 sm:col-span-1')}>
      <p className="flex items-center gap-1.5 text-[13px] text-fg-muted">
        {color && <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} aria-hidden />}
        <span className="truncate">{label}</span>
      </p>
      <p className={cn('num mt-1 truncate font-bold', emphasis ? 'text-2xl' : 'text-lg')}>{value}</p>
    </div>
  );
}

function InsightRow({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-line py-2.5 last:border-0">
      <dt className="text-sm text-fg-muted">{label}</dt>
      <dd className="min-w-0 text-right">
        <span className="num block text-[15px] font-semibold">{value}</span>
        {hint && <span className="block truncate text-xs text-fg-subtle">{hint}</span>}
      </dd>
    </div>
  );
}

function InsightsCard({ report, categories }: { report: DailyReportData; categories: ReadonlyMap<string, Category> }) {
  const { insights } = report;
  const top = insights.mostUsedCategory;
  return (
    <Card>
      <CardHeader title="Daily insights" />
      <CardBody className="pt-1">
        {insights.expenseCount === 0 ? (
          <p className="py-3 text-sm text-fg-muted">No personal expenses on this day, so there is nothing to average or compare across payment methods.</p>
        ) : (
          <dl>
            <InsightRow
              label="Highest expense"
              value={insights.highestExpense ? rupees(insights.highestExpense.amountPaise) : '—'}
              hint={insights.highestExpense ? transactionTitle(insights.highestExpense, categories.get(insights.highestExpense.categoryId)) : undefined}
            />
            <InsightRow label="Most-used category" value={top ? categories.get(top.key)?.name ?? 'Unknown' : '—'} hint={top ? `${top.count} ${top.count === 1 ? 'transaction' : 'transactions'}` : undefined} />
            <InsightRow label="Expense transactions" value={String(insights.expenseCount)} />
            <InsightRow label="Average per expense" value={insights.averageExpense === null ? '—' : rupees(insights.averageExpense)} />
            <InsightRow label="UPI spending" value={rupees(insights.methodTotals.upi)} />
            <InsightRow label="Debit card spending" value={rupees(insights.methodTotals.debit_card)} />
            <InsightRow label="Cash spending" value={rupees(insights.methodTotals.cash)} />
            {insights.methodTotals.other > 0 && <InsightRow label="Other methods" value={rupees(insights.methodTotals.other)} />}
          </dl>
        )}
      </CardBody>
    </Card>
  );
}

function ComparisonCard({ comparison: c, dateLabel, previousLabel }: { comparison: DayComparison; dateLabel: string; previousLabel: string }) {
  const Icon = c.direction === 'up' ? ArrowUpRight : c.direction === 'down' ? ArrowDownRight : Equal;
  const tone = c.direction === 'up' ? 'text-tx-expense' : c.direction === 'down' ? 'text-emerald-400' : 'text-fg-muted';
  return (
    <Card>
      <CardHeader title="Compared with the previous day" description="Personal expenses only" />
      <CardBody>
        <div className="grid grid-cols-2 gap-3">
          <SummaryStat label={dateLabel} value={rupees(c.current)} />
          <SummaryStat label={previousLabel} value={c.previousCoverage === 'none' ? '—' : rupees(c.previous)} />
        </div>
        {c.previousCoverage === 'none' ? (
          <p className="mt-3 text-sm text-fg-muted">There are no records for the previous day, so there is nothing to compare with.</p>
        ) : (
          <p className={cn('mt-3 flex items-center gap-1.5 text-sm font-semibold', tone)} data-testid="day-change">
            <Icon className="h-4 w-4 shrink-0" aria-hidden />
            {describeDayChange(c)}
          </p>
        )}
      </CardBody>
    </Card>
  );
}

function DayTransactions({
  txs,
  categories,
  today,
  onSelect,
  onAdd,
  className,
}: {
  txs: Transaction[];
  categories: ReadonlyMap<string, Category>;
  today: ISODate;
  onSelect: (t: Transaction) => void;
  onAdd?: () => void;
  className?: string;
}) {
  const [type, setType] = React.useState<TxType | 'all'>('all');
  const [method, setMethod] = React.useState<PaymentMethod | 'all'>('all');
  const shown = React.useMemo(
    () => filterTransactions(txs, { ...EMPTY_FILTERS, types: type === 'all' ? [] : [type], paymentMethods: method === 'all' ? [] : [method] }, categories),
    [txs, type, method, categories],
  );
  const filtered = type !== 'all' || method !== 'all';

  return (
    <Card className={className}>
      <CardHeader title="Daily transactions" description={filtered ? `${shown.length} of ${txs.length}` : `${txs.length} ${txs.length === 1 ? 'transaction' : 'transactions'}`} />
      <CardBody className="pt-3">
        {txs.length > 0 && (
          <div className="mb-2 grid grid-cols-2 gap-2 sm:max-w-[420px]">
            <Select aria-label="Filter by type" value={type} onChange={(e) => setType(e.target.value as TxType | 'all')} className="h-10 text-sm">
              <option value="all">All types</option>
              {TX_TYPES.map((t) => (
                <option key={t} value={t}>
                  {TX_TYPE_LABEL[t]}
                </option>
              ))}
            </Select>
            <Select aria-label="Filter by payment method" value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod | 'all')} className="h-10 text-sm">
              <option value="all">All methods</option>
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {PAYMENT_METHOD_LABEL[m]}
                </option>
              ))}
            </Select>
          </div>
        )}
        {txs.length === 0 ? (
          <EmptyState
            icon={ReceiptText}
            title="No transactions on this day"
            body="Nothing was recorded for this date."
            className="py-6"
            action={
              onAdd ? (
                <Button size="sm" onClick={onAdd}>
                  <Plus className="h-4 w-4" aria-hidden /> Add transaction
                </Button>
              ) : undefined
            }
          />
        ) : shown.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title="No transactions match these filters"
            className="py-6"
            action={
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setType('all');
                  setMethod('all');
                }}
              >
                Clear filters
              </Button>
            }
          />
        ) : (
          <div className="-mx-2">
            {shown.map((t) => (
              <TransactionRow key={t.id} tx={t} category={categories.get(t.categoryId)} onSelect={onSelect} showTime today={today} />
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
