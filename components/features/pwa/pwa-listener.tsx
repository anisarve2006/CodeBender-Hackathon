'use client';

import * as React from 'react';
import { WifiOff, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function subscribeOnline(callback: () => void) {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

function getOnlineSnapshot() {
  return navigator.onLine;
}

function getOnlineServerSnapshot() {
  return true;
}

export function PwaListener() {
  const isOnline = React.useSyncExternalStore(
    subscribeOnline,
    getOnlineSnapshot,
    getOnlineServerSnapshot,
  );
  const isOffline = !isOnline;

  const [deferredPrompt, setDeferredPrompt] = React.useState<BeforeInstallPromptEvent | null>(null);

  React.useEffect(() => {
    // Register Service Worker
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('Service worker registration failed:', err);
      });
    }

    // Install prompt listener
    function handleBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  async function handleInstallClick() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  }

  return (
    <>
      {isOffline && (
        <div
          role="status"
          className="sticky top-0 z-50 flex items-center justify-center gap-2 bg-amber-500 py-2 px-4 text-center text-xs font-semibold text-amber-950 shadow-md"
        >
          <WifiOff className="h-4 w-4" />
          <span>Offline mode: showing last saved information. Changes will sync when reconnected.</span>
        </div>
      )}

      {deferredPrompt && (
        <aside
          aria-label="Install app"
          className="fixed bottom-20 left-4 z-40 max-w-sm rounded-lg border bg-background/95 p-3 shadow-xl backdrop-blur md:bottom-6 md:left-6"
        >
          <div className="flex items-center gap-3">
            <Download className="h-5 w-5 text-primary shrink-0" />
            <div className="text-xs">
              <p className="font-semibold text-foreground">Install Family Care Hub</p>
              <p className="text-muted-foreground">Add to home screen for faster, offline-ready access.</p>
            </div>
            <Button size="sm" onClick={handleInstallClick} className="ml-auto text-xs min-h-8">
              Install
            </Button>
          </div>
        </aside>
      )}
    </>
  );
}
