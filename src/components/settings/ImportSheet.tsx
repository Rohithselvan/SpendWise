/**
 * Restore flow: validate → preview → choose merge/replace → confirm → atomic write.
 * Nothing is written until the final confirmation.
 */
import * as React from 'react';
import { AlertTriangle, CheckCircle2, FileJson } from 'lucide-react';
import { Sheet } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/toast';
import { analyzeImport, applyImport, loadExistingData, parseBackup, type BackupFile, type ConflictPolicy, type ImportMode, type ImportPreview } from '@/services/backup';
import { cn, friendlyError } from '@/lib/utils';

interface Props {
  file: File | null;
  onClose: () => void;
}

const MAX_BYTES = 50 * 1024 * 1024;

export function ImportSheet({ file, onClose }: Props) {
  const toast = useToast();
  const [state, setState] = React.useState<{ status: 'reading' } | { status: 'error'; message: string } | { status: 'ready'; backup: BackupFile; preview: ImportPreview; migratedFrom: number | null }>({ status: 'reading' });
  const [mode, setMode] = React.useState<ImportMode>('merge');
  const [policy, setPolicy] = React.useState<ConflictPolicy>('keep-existing');
  const [includeDupes, setIncludeDupes] = React.useState(false);
  const [confirm, setConfirm] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!file) return;
    let cancelled = false;
    setState({ status: 'reading' });
    setMode('merge');
    setPolicy('keep-existing');
    setIncludeDupes(false);
    (async () => {
      if (file.size > MAX_BYTES) throw new Error('This file is too large to be a SpendWise backup.');
      const text = await file.text();
      const parsed = parseBackup(text);
      if (!parsed.ok) throw new Error(parsed.error);
      const preview = analyzeImport(parsed.backup, await loadExistingData());
      if (!cancelled) setState({ status: 'ready', backup: parsed.backup, preview, migratedFrom: parsed.migratedFrom });
    })().catch((err: unknown) => {
      if (!cancelled) setState({ status: 'error', message: friendlyError(err, 'Could not read this file.') });
    });
    return () => {
      cancelled = true;
    };
  }, [file]);

  async function run() {
    if (state.status !== 'ready') return;
    setBusy(true);
    try {
      const res = await applyImport(state.backup, { mode, conflictPolicy: policy, includePossibleDuplicates: includeDupes });
      setConfirm(false);
      onClose();
      toast.success(mode === 'replace' ? `Restored ${res.transactionsWritten} transactions` : `Imported ${res.transactionsWritten} transactions${res.skipped ? `, skipped ${res.skipped}` : ''}`);
    } catch (err) {
      toast.error(friendlyError(err, 'Import failed. Nothing was changed.'));
      setConfirm(false);
    } finally {
      setBusy(false);
    }
  }

  const option = (active: boolean, onClick: () => void, title: string, body: string) => (
    <button type="button" role="radio" aria-checked={active} onClick={onClick} className={cn('w-full rounded-2xl border p-4 text-left', active ? 'border-emerald-500 bg-emerald-500/5' : 'border-line hover:bg-ink-850')}>
      <span className="flex items-center gap-2 text-[15px] font-semibold">
        <span className={cn('grid h-5 w-5 place-items-center rounded-full border-2', active ? 'border-emerald-500' : 'border-ink-600')} aria-hidden>
          {active && <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />}
        </span>
        {title}
      </span>
      <span className="mt-1 block pl-7 text-sm text-fg-muted">{body}</span>
    </button>
  );

  const ready = state.status === 'ready' ? state : null;
  const p = ready?.preview;

  return (
    <>
      <Sheet
        open={!!file}
        onOpenChange={(o) => !o && onClose()}
        title="Restore from backup"
        footer={
          ready && (
            <Button className="w-full" size="lg" variant={mode === 'replace' ? 'danger' : 'primary'} onClick={() => setConfirm(true)}>
              {mode === 'replace' ? 'Replace all data…' : 'Review and import…'}
            </Button>
          )
        }
      >
        {state.status === 'reading' && <p className="py-8 text-center text-fg-muted">Checking backup file…</p>}
        {state.status === 'error' && (
          <div className="py-6 text-center">
            <AlertTriangle className="mx-auto h-8 w-8 text-[#ff8a80]" aria-hidden />
            <p className="mt-3 font-semibold">This file can’t be restored</p>
            <p className="mt-1 text-sm text-fg-muted">{state.message}</p>
            <p className="mt-3 text-sm text-fg-muted">Nothing was changed.</p>
          </div>
        )}
        {ready && p && (
          <div className="space-y-5">
            <div className="flex items-start gap-3 rounded-2xl bg-ink-850 p-4">
              <FileJson className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden />
              <div className="text-sm">
                <p className="font-semibold">Valid SpendWise backup</p>
                <p className="text-fg-muted">
                  Created {new Date(ready.backup.exportedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' })}. {ready.backup.data.transactions.length} transactions, {ready.backup.data.categories.length} categories, {ready.backup.data.budgets.length} budgets.
                  {ready.migratedFrom !== null && ` Upgraded from backup format v${ready.migratedFrom}.`}
                </p>
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-medium text-fg-muted">Compared with this device ({p.existingCounts.transactions} transactions)</h3>
              <dl className="grid grid-cols-2 gap-2 text-sm">
                <PreviewStat label="New transactions" value={p.transactions.added.length} good />
                <PreviewStat label="Already here (identical)" value={p.transactions.identical.length} />
                <PreviewStat label="Possible duplicates" value={p.transactions.possibleDuplicates.length} />
                <PreviewStat label="Conflicts (edited differently)" value={p.transactions.conflicts.length} warn={p.transactions.conflicts.length > 0} />
                <PreviewStat label="New categories" value={p.categories.added.length} good />
                <PreviewStat label="Category conflicts" value={p.categories.conflicts.length} warn={p.categories.conflicts.length > 0} />
                <PreviewStat label="New budgets" value={p.budgets.added.length} good />
                <PreviewStat label="Budget conflicts" value={p.budgets.conflicts.length} warn={p.budgets.conflicts.length > 0} />
              </dl>
              {p.categories.mergedByName.length > 0 && <p className="mt-2 text-sm text-fg-muted">{p.categories.mergedByName.length} categories with the same name will be combined with yours.</p>}
            </div>

            <fieldset role="radiogroup" aria-label="Import mode" className="space-y-2">
              <legend className="mb-2 text-sm font-medium text-fg-muted">How should it be restored?</legend>
              {option(mode === 'merge', () => setMode('merge'), 'Merge with this device', 'Adds new records. Identical records are skipped. Your existing data stays.')}
              {option(mode === 'replace', () => setMode('replace'), 'Replace everything', 'Deletes all data on this device and restores exactly what is in the backup.')}
            </fieldset>

            {mode === 'merge' && (p.transactions.conflicts.length + p.categories.conflicts.length + p.budgets.conflicts.length > 0) && (
              <fieldset role="radiogroup" aria-label="Conflict handling" className="space-y-2">
                <legend className="mb-2 text-sm font-medium text-fg-muted">When a record was edited differently</legend>
                {option(policy === 'keep-existing', () => setPolicy('keep-existing'), 'Keep the version on this device', 'Safest choice. The backup’s version is ignored.')}
                {option(policy === 'use-backup', () => setPolicy('use-backup'), 'Use the version from the backup', 'Overwrites the conflicting records on this device.')}
              </fieldset>
            )}

            {mode === 'merge' && p.transactions.possibleDuplicates.length > 0 && (
              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-line p-4">
                <input type="checkbox" className="mt-1 h-5 w-5 accent-emerald-500" checked={includeDupes} onChange={(e) => setIncludeDupes(e.target.checked)} />
                <span className="text-sm">
                  <span className="block font-semibold">Also import possible duplicates</span>
                  <span className="text-fg-muted">
                    {p.transactions.possibleDuplicates.length} transactions match one you already have (same date, amount, category and description). Leave this off unless they really are separate payments.
                  </span>
                </span>
              </label>
            )}
          </div>
        )}
      </Sheet>

      {ready && p && (
        <ConfirmDialog
          open={confirm}
          onOpenChange={setConfirm}
          title={mode === 'replace' ? 'Replace all data on this device?' : 'Import these records?'}
          description={
            mode === 'replace' ? (
              <>All {p.existingCounts.transactions} transactions on this device will be deleted and replaced with the {ready.backup.data.transactions.length} in the backup. This cannot be undone. Consider exporting a backup first.</>
            ) : (
              <>
                {p.transactions.added.length + (includeDupes ? p.transactions.possibleDuplicates.length : 0) + (policy === 'use-backup' ? p.transactions.conflicts.length : 0)} transactions will be written.{' '}
                {policy === 'use-backup' && p.transactions.conflicts.length > 0 ? `${p.transactions.conflicts.length} existing transactions will be overwritten.` : 'No existing transactions will be changed.'}
              </>
            )
          }
          confirmLabel={mode === 'replace' ? 'Replace all' : 'Import'}
          danger={mode === 'replace'}
          requireText={mode === 'replace' ? 'REPLACE' : undefined}
          busy={busy}
          onConfirm={run}
        />
      )}
    </>
  );
}

function PreviewStat({ label, value, good, warn }: { label: string; value: number; good?: boolean; warn?: boolean }) {
  return (
    <div className="rounded-xl bg-ink-850 px-3 py-2.5">
      <dt className="text-[13px] text-fg-muted">{label}</dt>
      <dd className={cn('num flex items-center gap-1.5 text-lg font-bold', good && value > 0 && 'text-accent', warn && 'text-[#e8c25a]')}>
        {good && value > 0 && <CheckCircle2 className="h-4 w-4" aria-hidden />}
        {value}
      </dd>
    </div>
  );
}
