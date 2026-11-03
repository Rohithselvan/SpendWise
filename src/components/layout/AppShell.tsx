import { NavLink, Outlet } from 'react-router-dom';
import { Plus, WifiOff } from 'lucide-react';
import { NAV_ITEMS } from './nav';
import { LogoMark } from './Logo';
import { useQuickAdd } from '@/components/transactions/QuickAddContext';
import { useOnline } from '@/hooks/useOnline';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export function AppShell() {
  const quickAdd = useQuickAdd();
  const online = useOnline();
  const [first, second, third, fourth] = NAV_ITEMS;

  const mobileLink = (item: (typeof NAV_ITEMS)[number]) => (
    <NavLink
      key={item.to}
      to={item.to}
      end={item.end}
      className={({ isActive }) => cn('flex min-h-[56px] flex-1 flex-col items-center justify-center gap-1 text-[11px] font-semibold', isActive ? 'text-fg' : 'text-fg-subtle')}
    >
      {({ isActive }) => (
        <>
          <item.icon className={cn('h-[22px] w-[22px]', isActive && 'text-accent')} strokeWidth={isActive ? 2.4 : 2} aria-hidden />
          {item.label}
        </>
      )}
    </NavLink>
  );

  return (
    <div className="min-h-dvh lg:flex">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[90] focus:rounded-lg focus:bg-ink-800 focus:px-3 focus:py-2">
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-[248px] shrink-0 flex-col border-r border-line bg-ink-900 px-4 py-6 lg:flex">
        <div className="flex items-center gap-2.5 px-2">
          <LogoMark />
          <span className="text-lg font-bold tracking-tight">SpendWise</span>
        </div>
        <Button className="mt-7 w-full" onClick={() => quickAdd.open()}>
          <Plus className="h-5 w-5" aria-hidden /> Quick add
        </Button>
        <nav aria-label="Main" className="mt-6 flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => cn('flex h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-semibold', isActive ? 'bg-ink-800 text-fg' : 'text-fg-muted hover:bg-ink-850 hover:text-fg')}
            >
              <item.icon className="h-5 w-5" aria-hidden />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <p className="mt-auto px-2 text-xs leading-relaxed text-fg-subtle">Your records are stored only in this browser. Back up regularly from Settings.</p>
      </aside>

      <div className="min-w-0 flex-1">
        {!online && (
          <div className="pt-safe sticky top-0 z-30 bg-ink-800/95 backdrop-blur">
            <p className="flex items-center justify-center gap-2 py-1.5 text-xs font-semibold text-fg-muted">
              <WifiOff className="h-3.5 w-3.5" aria-hidden /> Offline — everything still works and saves on this device
            </p>
          </div>
        )}
        <main id="main" className="mx-auto w-full max-w-[1120px] px-4 pb-6 pt-safe sm:px-6 lg:px-10 lg:pb-12 mb-nav lg:mb-0">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <nav aria-label="Main" className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line bg-ink-900/95 backdrop-blur-md lg:hidden">
        <div className="mx-auto flex max-w-[560px] items-stretch px-2">
          {mobileLink(first)}
          {mobileLink(second)}
          <div className="flex flex-1 items-center justify-center">
            <button
              type="button"
              onClick={() => quickAdd.open()}
              aria-label="Quick add transaction"
              className="-mt-6 grid h-[58px] w-[58px] place-items-center rounded-[20px] bg-emerald-500 text-[#04140c] shadow-[0_8px_24px_-6px_rgba(47,208,138,.55)] active:scale-95 transition-transform"
            >
              <Plus className="h-7 w-7" strokeWidth={2.6} aria-hidden />
            </button>
          </div>
          {mobileLink(third)}
          {mobileLink(fourth)}
        </div>
      </nav>
    </div>
  );
}
