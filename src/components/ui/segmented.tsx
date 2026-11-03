import { cn } from '@/lib/utils';

interface SegmentedProps<T extends string> {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; color?: string }[];
  label: string;
  className?: string;
  size?: 'sm' | 'md';
}

/** Accessible single-select segmented control (radio group semantics). */
export function Segmented<T extends string>({ value, onChange, options, label, className, size = 'md' }: SegmentedProps<T>) {
  return (
    <div role="radiogroup" aria-label={label} className={cn('flex gap-1 rounded-xl border border-line bg-ink-850 p-1', className)}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              'min-w-0 flex-1 whitespace-nowrap rounded-lg px-1.5 font-semibold transition-colors',
              size === 'sm' ? 'h-8 text-[13px]' : 'h-10 text-[13.5px]',
              active ? 'bg-ink-700 text-fg shadow-sm' : 'text-fg-muted hover:text-fg',
            )}
            style={active && o.color ? { boxShadow: `inset 0 -2px 0 ${o.color}` } : undefined}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
