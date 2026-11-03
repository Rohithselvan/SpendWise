import * as React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type ToastKind = 'success' | 'error' | 'info';
interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
  action?: { label: string; onClick: () => void };
  duration: number;
}

interface ToastApi {
  show: (message: string, opts?: { kind?: ToastKind; action?: ToastItem['action']; duration?: number }) => void;
  success: (message: string, action?: ToastItem['action']) => void;
  error: (message: string) => void;
}

const ToastContext = React.createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([]);
  const idRef = React.useRef(0);
  const dismiss = React.useCallback((id: number) => setItems((xs) => xs.filter((x) => x.id !== id)), []);
  const show = React.useCallback<ToastApi['show']>(
    (message, opts = {}) => {
      const id = ++idRef.current;
      const item: ToastItem = { id, message, kind: opts.kind ?? 'info', action: opts.action, duration: opts.duration ?? (opts.kind === 'error' ? 6000 : 3500) };
      setItems((xs) => [...xs.slice(-2), item]);
      window.setTimeout(() => dismiss(id), item.duration);
    },
    [dismiss],
  );
  const api = React.useMemo<ToastApi>(
    () => ({
      show,
      success: (m, action) => show(m, { kind: 'success', action }),
      error: (m) => show(m, { kind: 'error' }),
    }),
    [show],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-[80] flex flex-col items-center gap-2 px-3 pt-[max(12px,env(safe-area-inset-top))]" aria-live="polite" aria-atomic="false">
        {items.map((t) => {
          const Icon = t.kind === 'success' ? CheckCircle2 : t.kind === 'error' ? AlertCircle : Info;
          return (
            <div
              key={t.id}
              role={t.kind === 'error' ? 'alert' : 'status'}
              className="pointer-events-auto flex w-full max-w-[440px] items-center gap-3 rounded-2xl border border-line bg-ink-800/95 px-4 py-3 shadow-xl backdrop-blur animate-pop"
            >
              <Icon className={cn('h-5 w-5 shrink-0', t.kind === 'success' && 'text-emerald-400', t.kind === 'error' && 'text-[#ff8a80]', t.kind === 'info' && 'text-fg-muted')} aria-hidden />
              <p className="flex-1 text-[15px] font-medium">{t.message}</p>
              {t.action && (
                <button
                  type="button"
                  className="rounded-lg px-2 py-1 text-sm font-semibold text-accent hover:bg-ink-700"
                  onClick={() => {
                    t.action!.onClick();
                    dismiss(t.id);
                  }}
                >
                  {t.action.label}
                </button>
              )}
              <button type="button" aria-label="Dismiss" className="grid h-8 w-8 place-items-center rounded-full text-fg-subtle hover:text-fg" onClick={() => dismiss(t.id)}>
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}
