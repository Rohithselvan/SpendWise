import * as React from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { ErrorBoundary } from '@/components/layout/ErrorBoundary';
import { UpdatePrompt } from '@/components/layout/UpdatePrompt';
import { ToastProvider } from '@/components/ui/toast';
import { QuickAddProvider } from '@/components/transactions/QuickAddProvider';
import { useSettings } from '@/hooks/useData';
import { useApplyTheme } from '@/hooks/useTheme';
import { db } from '@/db/schema';
import { ensureEssentialCategories } from '@/repositories/categories';
import { countTransactions } from '@/repositories/transactions';
import { isStoragePersisted, requestPersistentStorage } from '@/lib/storage';
import Overview from '@/pages/Overview';
import Transactions from '@/pages/Transactions';

const Reports = React.lazy(() => import('@/pages/Reports'));
const Settings = React.lazy(() => import('@/pages/Settings'));
const Categories = React.lazy(() => import('@/pages/Categories'));
const Budgets = React.lazy(() => import('@/pages/Budgets'));

type DbState = 'opening' | 'ready' | 'error';

function ThemeController() {
  const { theme } = useSettings();
  useApplyTheme(theme);
  return null;
}

export default function App() {
  const [dbState, setDbState] = React.useState<DbState>('opening');

  React.useEffect(() => {
    (async () => {
      await db.open();
      await ensureEssentialCategories();
      setDbState('ready');
      // Ask the browser to keep our data (installed apps, or once the user has records).
      const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
      if ((await isStoragePersisted()) === false && (standalone || (await countTransactions()) > 0)) {
        await requestPersistentStorage();
      }
    })().catch((err: unknown) => {
      console.error('SpendWise: database unavailable', err instanceof Error ? err.name : 'unknown');
      setDbState('error');
    });
  }, []);

  if (dbState === 'error') {
    return (
      <div className="grid min-h-dvh place-items-center px-6 text-center">
        <div className="max-w-sm">
          <h1 className="text-xl font-bold">SpendWise can’t open its storage</h1>
          <p className="mt-2 text-fg-muted">
            This browser is blocking local storage (for example in a private window, or because storage is full). Open SpendWise in a normal Safari or Chrome window, or from your Home Screen.
          </p>
          <button className="mt-5 h-11 rounded-xl bg-emerald-500 px-5 font-semibold text-[#04140c]" onClick={() => window.location.reload()}>
            Try again
          </button>
        </div>
      </div>
    );
  }
  if (dbState === 'opening') return <div className="min-h-dvh bg-ink-950" aria-busy="true" />;

  return (
    <ErrorBoundary>
      <ToastProvider>
        <ThemeController />
        <HashRouter>
          <QuickAddProvider>
            <React.Suspense fallback={<div className="min-h-dvh" aria-busy="true" />}>
              <Routes>
                <Route element={<AppShell />}>
                  <Route index element={<Overview />} />
                  <Route path="transactions" element={<Transactions />} />
                  <Route path="reports" element={<Reports />} />
                  <Route path="settings" element={<Settings />} />
                  <Route path="settings/categories" element={<Categories />} />
                  <Route path="settings/budgets" element={<Budgets />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
              </Routes>
            </React.Suspense>
          </QuickAddProvider>
        </HashRouter>
        <UpdatePrompt />
      </ToastProvider>
    </ErrorBoundary>
  );
}
