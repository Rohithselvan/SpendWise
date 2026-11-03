import * as React from 'react';
import { DatabaseBackup, FileDown, FileUp, HardDrive, Shapes, ShieldCheck, Target, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { SettingsItem, SettingsLinkRow, SettingsSection } from '@/components/settings/SettingsRow';
import { ImportSheet } from '@/components/settings/ImportSheet';
import { Segmented } from '@/components/ui/segmented';
import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { Input, Label } from '@/components/ui/input';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/toast';
import { useAllTransactions, useCategoryMap, useSettings } from '@/hooks/useData';
import { useToday } from '@/hooks/useToday';
import { setSetting } from '@/repositories/settings';
import { backupFileName, clearAllData, createBackup, markBackupCompleted } from '@/services/backup';
import { transactionsToCsv } from '@/services/csv';
import { formatBytes, isStoragePersisted, requestPersistentStorage, saveFileLocally, storageEstimate } from '@/lib/storage';
import { addDaysISO, formatDisplayDate, isValidISODate, todayIST } from '@/lib/dates';
import { friendlyError } from '@/lib/utils';
import { APP_VERSION } from '@/services/backup';
import type { DateFormatPref, ThemePref } from '@/types';

export default function Settings() {
  const settings = useSettings();
  const toast = useToast();
  const all = useAllTransactions();
  const today = useToday();
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [importFile, setImportFile] = React.useState<File | null>(null);
  const [csvOpen, setCsvOpen] = React.useState(false);
  const [clearOpen, setClearOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [persisted, setPersisted] = React.useState<boolean | null>(null);
  const [usage, setUsage] = React.useState<{ usage: number; quota: number } | null>(null);

  React.useEffect(() => {
    void isStoragePersisted().then(setPersisted);
    void storageEstimate().then(setUsage);
  }, [all?.length]);

  async function exportBackup() {
    setBusy(true);
    try {
      const backup = await createBackup();
      const outcome = await saveFileLocally(backupFileName(), JSON.stringify(backup, null, 2), 'application/json');
      if (outcome === 'cancelled') return;
      await markBackupCompleted();
      toast.success(`Backup created with ${backup.data.transactions.length} transactions`);
    } catch (err) {
      toast.error(friendlyError(err, 'Could not create the backup.'));
    } finally {
      setBusy(false);
    }
  }

  async function wipe() {
    setBusy(true);
    try {
      await clearAllData();
      setClearOpen(false);
      toast.success('All data cleared');
    } catch (err) {
      toast.error(friendlyError(err, 'Could not clear data.'));
    } finally {
      setBusy(false);
    }
  }

  async function askPersist() {
    const res = await requestPersistentStorage();
    setPersisted(res);
    if (res) toast.success('Persistent storage granted');
    else toast.show('The browser did not grant persistent storage. On iPhone, add SpendWise to your Home Screen and keep regular backups.');
  }

  const last = settings.lastBackupAt ? new Date(settings.lastBackupAt) : null;
  const lastDay = last ? todayIST(last) : null;
  const stale = !lastDay || lastDay < addDaysISO(today, -14);

  return (
    <>
      <PageHeader title="Settings" />

      <SettingsSection title="General">
        <SettingsItem label="Currency" hint="Indian Rupee (₹), Indian number grouping">
          <span className="text-sm font-semibold text-fg-muted">INR</span>
        </SettingsItem>
        <SettingsItem label="Date format">
          <Segmented<DateFormatPref>
            size="sm"
            className="w-full sm:w-[260px]"
            label="Date format"
            value={settings.dateFormat}
            onChange={(v) => void setSetting('dateFormat', v)}
            options={[
              { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
              { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
            ]}
          />
        </SettingsItem>
        <SettingsItem label="Theme">
          <Segmented<ThemePref>
            size="sm"
            className="w-full sm:w-[260px]"
            label="Theme"
            value={settings.theme}
            onChange={(v) => void setSetting('theme', v)}
            options={[
              { value: 'dark', label: 'Dark' },
              { value: 'light', label: 'Light' },
              { value: 'system', label: 'System' },
            ]}
          />
        </SettingsItem>
      </SettingsSection>

      <SettingsSection title="Organise">
        <SettingsLinkRow to="/settings/categories" icon={Shapes} label="Categories and recipients" hint="Expense, income, transfer, savings and investment lists" />
        <SettingsLinkRow to="/settings/budgets" icon={Target} label="Budgets" hint="Optional monthly limits you set yourself" />
      </SettingsSection>

      <SettingsSection title="Backup and data" description="Backups are files saved on your device. Nothing is uploaded.">
        <SettingsItem
          label="Export JSON backup"
          hint={
            <span className={stale ? 'text-[#e8c25a]' : undefined}>
              {last ? `Last backup ${formatDisplayDate(lastDay!, settings.dateFormat)}${stale ? ', more than two weeks ago' : ''}` : 'No backup made yet on this device'}
            </span>
          }
        >
          <Button size="sm" onClick={() => void exportBackup()} disabled={busy}>
            <DatabaseBackup className="h-4 w-4" aria-hidden /> Back up now
          </Button>
        </SettingsItem>
        <SettingsItem label="Restore from JSON backup" hint="Preview before anything is changed. Merge or replace.">
          <Button size="sm" variant="secondary" onClick={() => fileRef.current?.click()}>
            <FileUp className="h-4 w-4" aria-hidden /> Choose file
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              setImportFile(f);
              e.target.value = '';
            }}
          />
        </SettingsItem>
        <SettingsItem label="Export transactions as CSV" hint="Opens in Excel, Numbers or Google Sheets">
          <Button size="sm" variant="secondary" onClick={() => setCsvOpen(true)} disabled={!all?.length}>
            <FileDown className="h-4 w-4" aria-hidden /> Export CSV
          </Button>
        </SettingsItem>
        <SettingsItem label="Clear all data" hint="Deletes every transaction, category change and budget on this device">
          <Button size="sm" variant="danger" onClick={() => setClearOpen(true)}>
            <Trash2 className="h-4 w-4" aria-hidden /> Clear
          </Button>
        </SettingsItem>
      </SettingsSection>

      <SettingsSection title="Storage and privacy">
        <SettingsItem
          label="Persistent storage"
          hint={persisted === null ? 'Not supported by this browser' : persisted ? 'Granted: the browser should not clear SpendWise data to free space' : 'Not granted: the browser may clear data when space runs low'}
        >
          {persisted === false && (
            <Button size="sm" variant="secondary" onClick={() => void askPersist()}>
              <ShieldCheck className="h-4 w-4" aria-hidden /> Request
            </Button>
          )}
        </SettingsItem>
        {usage && (
          <SettingsItem label="Space used" hint={`${formatBytes(usage.usage)} used by SpendWise in this browser`}>
            <HardDrive className="h-5 w-5 text-fg-subtle" aria-hidden />
          </SettingsItem>
        )}
        <div className="space-y-3 px-4 py-4 text-sm leading-relaxed text-fg-muted">
          <p>
            <strong className="text-fg">Your records live only in this browser’s IndexedDB.</strong> The website that hosts SpendWise only delivers the app files. It never receives your transactions, and SpendWise has no analytics or tracking.
          </p>
          <p>Your iPhone and your Windows laptop each keep their own separate database. They do not sync. To move data between them, export a backup on one and restore it on the other with Merge.</p>
          <p>Clearing Safari website data, deleting the Home Screen app, or the browser freeing up space can erase local data. Persistent storage reduces this risk but cannot guarantee it. Regular backups are the only reliable protection.</p>
        </div>
      </SettingsSection>

      <p className="mt-6 px-1 text-center text-xs text-fg-subtle">SpendWise {APP_VERSION}. Works offline after the first load.</p>

      <ImportSheet file={importFile} onClose={() => setImportFile(null)} />
      <CsvExportSheet open={csvOpen} onOpenChange={setCsvOpen} />
      <ConfirmDialog
        open={clearOpen}
        onOpenChange={setClearOpen}
        title="Delete everything on this device?"
        description={`This permanently removes all ${all?.length ?? 0} transactions, your custom categories and budgets. Export a backup first if you might need them.`}
        confirmLabel="Delete everything"
        danger
        requireText="DELETE"
        busy={busy}
        onConfirm={wipe}
      />
    </>
  );
}

function CsvExportSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const all = useAllTransactions();
  const categories = useCategoryMap();
  const toast = useToast();
  const [scope, setScope] = React.useState<'all' | 'range'>('all');
  const [from, setFrom] = React.useState('');
  const [to, setTo] = React.useState('');
  const valid = scope === 'all' || (isValidISODate(from) && isValidISODate(to) && from <= to);

  async function run() {
    if (!all || !valid) return;
    try {
      const range = scope === 'range' ? { start: from, end: to } : undefined;
      const csv = transactionsToCsv(all, categories, range);
      const name = range ? `spendwise-${from}-to-${to}.csv` : `spendwise-all-${todayIST()}.csv`;
      const outcome = await saveFileLocally(name, csv, 'text/csv;charset=utf-8');
      if (outcome !== 'cancelled') {
        toast.success('CSV exported');
        onOpenChange(false);
      }
    } catch (err) {
      toast.error(friendlyError(err, 'Could not export the CSV file.'));
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Export CSV" footer={<Button className="w-full" size="lg" disabled={!valid} onClick={() => void run()}>Export</Button>}>
      <Segmented<'all' | 'range'>
        label="What to export"
        value={scope}
        onChange={setScope}
        options={[
          { value: 'all', label: 'All transactions' },
          { value: 'range', label: 'Date range' },
        ]}
      />
      {scope === 'range' && (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="csv-from">From</Label>
            <Input id="csv-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="csv-to">To</Label>
            <Input id="csv-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
      )}
      <p className="mt-4 text-sm text-fg-muted">Columns: Date, Type, Description, Category, Recipient, Payment method, Amount (INR), Notes.</p>
    </Sheet>
  );
}
