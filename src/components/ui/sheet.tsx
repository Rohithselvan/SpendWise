/**
 * Bottom sheet on phones, centred dialog on larger screens. Built on Radix Dialog for focus trapping,
 * Escape handling and screen-reader semantics.
 */
import * as React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  /** Hide the visible title (still announced to screen readers). */
  hideTitle?: boolean;
  initialFocus?: React.RefObject<HTMLElement>;
}

export function Sheet({ open, onOpenChange, title, description, children, footer, className, hideTitle, initialFocus }: SheetProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px] data-[state=open]:animate-fade-in" />
        <Dialog.Content
          onOpenAutoFocus={(e) => {
            if (initialFocus?.current) {
              e.preventDefault();
              initialFocus.current.focus();
            }
          }}
          className={cn(
            'fixed z-50 flex flex-col bg-ink-900 shadow-2xl outline-none',
            'inset-x-0 bottom-0 max-h-[94dvh] rounded-t-3xl border-t border-line data-[state=open]:animate-sheet-in',
            'sm:inset-auto sm:left-1/2 sm:top-1/2 sm:max-h-[88dvh] sm:w-[520px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl sm:border sm:data-[state=open]:animate-pop',
            className,
          )}
        >
          <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-ink-600 sm:hidden" aria-hidden />
          <div className={cn('flex shrink-0 items-center justify-between gap-3 px-5 pb-2 pt-3', hideTitle && 'pb-0')}>
            <Dialog.Title className={cn('text-lg font-semibold', hideTitle && 'sr-only')}>{title}</Dialog.Title>
            {description ? (
              <Dialog.Description className="sr-only">{description}</Dialog.Description>
            ) : (
              <Dialog.Description className="sr-only">{title}</Dialog.Description>
            )}
            <Dialog.Close className="-mr-2 ml-auto grid h-10 w-10 place-items-center rounded-full text-fg-muted hover:bg-ink-800 hover:text-fg" aria-label="Close">
              <X className="h-5 w-5" />
            </Dialog.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4">{children}</div>
          {footer && <div className="shrink-0 border-t border-line bg-ink-900 px-5 pb-[max(16px,env(safe-area-inset-bottom))] pt-3 sm:rounded-b-3xl">{footer}</div>}
          {!footer && <div className="pb-safe" />}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
