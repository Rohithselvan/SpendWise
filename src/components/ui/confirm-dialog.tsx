import * as React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Button } from './button';
import { Input } from './input';

interface ConfirmProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  danger?: boolean;
  /** When set, the user must type this word to enable the confirm button. */
  requireText?: string;
  busy?: boolean;
  onConfirm: () => void | Promise<void>;
  children?: React.ReactNode;
  confirmDisabled?: boolean;
}

export function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel, danger, requireText, busy, onConfirm, children, confirmDisabled }: ConfirmProps) {
  const [typed, setTyped] = React.useState('');
  React.useEffect(() => {
    if (!open) setTyped('');
  }, [open]);
  const blocked = (requireText ? typed.trim() !== requireText : false) || !!confirmDisabled;
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/65 data-[state=open]:animate-fade-in" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[60] w-[calc(100%-32px)] max-w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-line bg-ink-900 p-5 shadow-2xl data-[state=open]:animate-pop">
          <Dialog.Title className="text-lg font-semibold">{title}</Dialog.Title>
          <Dialog.Description asChild>
            <div className="mt-2 text-[15px] leading-relaxed text-fg-muted">{description}</div>
          </Dialog.Description>
          {children && <div className="mt-4">{children}</div>}
          {requireText && (
            <div className="mt-4">
              <label className="mb-1.5 block text-sm text-fg-muted" htmlFor="confirm-text">
                Type <span className="font-semibold text-fg">{requireText}</span> to confirm
              </label>
              <Input id="confirm-text" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" autoCapitalize="characters" />
            </div>
          )}
          <div className="mt-5 flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => onOpenChange(false)} disabled={busy}>
              Cancel
            </Button>
            <Button variant={danger ? 'danger' : 'primary'} className="flex-1" disabled={blocked || busy} onClick={() => void onConfirm()}>
              {busy ? 'Working…' : confirmLabel}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
