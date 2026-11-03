import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatMonthLabel, shiftMonthKey } from '@/lib/dates';

export function MonthSwitcher({ value, onChange, maxKey }: { value: string; onChange: (k: string) => void; maxKey?: string }) {
  const atMax = maxKey ? value >= maxKey : false;
  return (
    <div className="flex items-center gap-1 rounded-xl border border-line bg-ink-900 p-1">
      <button type="button" className="grid h-9 w-9 place-items-center rounded-lg text-fg-muted hover:bg-ink-800 hover:text-fg" onClick={() => onChange(shiftMonthKey(value, -1))} aria-label="Previous month">
        <ChevronLeft className="h-5 w-5" />
      </button>
      <span className="min-w-[124px] text-center text-sm font-semibold" aria-live="polite">
        {formatMonthLabel(value)}
      </span>
      <button
        type="button"
        className="grid h-9 w-9 place-items-center rounded-lg text-fg-muted hover:bg-ink-800 hover:text-fg disabled:opacity-30"
        onClick={() => onChange(shiftMonthKey(value, 1))}
        disabled={atMax}
        aria-label="Next month"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}
