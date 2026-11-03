import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';

/**
 * Service-worker lifecycle UI. A new version waits until the user taps Update; IndexedDB data is
 * untouched by updates because the service worker only caches app files.
 */
export function UpdatePrompt() {
  const toast = useToast();
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      // Check for updates hourly and whenever the app returns to the foreground.
      window.setInterval(() => void registration.update().catch(() => undefined), 60 * 60 * 1000);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && navigator.onLine) void registration.update().catch(() => undefined);
      });
    },
    onRegisterError() {
      console.warn('SpendWise: offline support could not be enabled in this browser.');
    },
  });

  useEffect(() => {
    if (offlineReady) {
      toast.show('SpendWise is ready to work offline');
      setOfflineReady(false);
    }
  }, [offlineReady, setOfflineReady, toast]);

  if (!needRefresh) return null;
  return (
    <div role="status" className="fixed inset-x-3 bottom-[calc(88px+env(safe-area-inset-bottom))] z-[70] mx-auto flex max-w-[460px] items-center gap-3 rounded-2xl border border-line bg-ink-800 p-3 pl-4 shadow-2xl lg:bottom-6">
      <RefreshCw className="h-5 w-5 shrink-0 text-accent" aria-hidden />
      <p className="flex-1 text-sm font-medium">A new version of SpendWise is ready. Your data stays as it is.</p>
      <Button size="sm" variant="ghost" onClick={() => setNeedRefresh(false)}>
        Later
      </Button>
      <Button size="sm" onClick={() => void updateServiceWorker(true)}>
        Update
      </Button>
    </div>
  );
}
