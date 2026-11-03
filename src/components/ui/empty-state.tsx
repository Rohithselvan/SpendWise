import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export function EmptyState({ icon: Icon, title, body, action, className }: { icon: LucideIcon; title: string; body?: string; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center px-6 py-10 text-center', className)}>
      <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-ink-800 text-fg-muted">
        <Icon className="h-6 w-6" aria-hidden />
      </div>
      <p className="text-[15px] font-semibold text-fg">{title}</p>
      {body && <p className="mt-1 max-w-[34ch] text-sm leading-relaxed text-fg-muted">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
