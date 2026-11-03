import type { ReactNode } from 'react';

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <header className="flex items-end justify-between gap-3 pb-4 pt-5 lg:pt-10">
      <div className="min-w-0">
        <h1 className="text-[26px] font-bold leading-tight tracking-tight lg:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-fg-muted">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}
