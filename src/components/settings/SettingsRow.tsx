import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, type LucideIcon } from 'lucide-react';

export function SettingsSection({ title, children, description }: { title: string; children: ReactNode; description?: string }) {
  return (
    <section className="mt-6" aria-labelledby={`s-${title}`}>
      <h2 id={`s-${title}`} className="px-1 text-[15px] font-semibold">{title}</h2>
      {description && <p className="mt-0.5 px-1 text-sm text-fg-muted">{description}</p>}
      <div className="mt-2 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-ink-900">{children}</div>
    </section>
  );
}

export function SettingsLinkRow({ to, icon: Icon, label, hint }: { to: string; icon: LucideIcon; label: string; hint?: string }) {
  return (
    <Link to={to} className="flex min-h-[56px] items-center gap-3 px-4 py-3 hover:bg-ink-850">
      <Icon className="h-5 w-5 text-fg-muted" aria-hidden />
      <span className="flex-1">
        <span className="block text-[15px] font-semibold">{label}</span>
        {hint && <span className="block text-sm text-fg-muted">{hint}</span>}
      </span>
      <ChevronRight className="h-5 w-5 text-fg-subtle" aria-hidden />
    </Link>
  );
}

export function SettingsItem({ label, hint, children }: { label: string; hint?: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-[15px] font-semibold">{label}</p>
        {hint && <div className="text-sm text-fg-muted">{hint}</div>}
      </div>
      {children && <div className="shrink-0">{children}</div>}
    </div>
  );
}
