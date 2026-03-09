import { useEffect, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { IS_ELECTRON } from '@/lib/platform';

import { TitleBar } from '@/components/shared/TitleBar';
import { NavigationDock } from '@/components/shared/NavigationDock';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { BrowserView } from '@/components/browser/BrowserView';
import { LibraryView } from '@/components/library/LibraryView';
import { ScheduleView } from '@/components/schedule/ScheduleView';
import { SettingsView } from '@/components/settings/SettingsView';
import { SplashScreen } from '@/components/splash';
import { useAppInitialization } from '@/hooks/useAppInitialization';
import { useAppStore } from '@/stores/useAppStore';
import { useBackgroundStore } from '@/stores/useBackgroundStore';
import { useBrowserStore } from '@/stores/useBrowserStore';
import { BackgroundOverlay } from '@/components/shared/BackgroundOverlay';

function App() {
  const activeView = useAppStore(s => s.activeView);
  const navigateTo = useAppStore(s => s.navigateTo);
  const { ready, error } = useAppInitialization();
  const [splashDone, setSplashDone] = useState(false);
  const restoreBackground = useBackgroundStore(s => s.restoreBackground);
  const customBackground = useBackgroundStore(s => s.customBackground);
  const isFullScreen = useBrowserStore(s => s.isFullScreen);

  const handleSplashDismissed = useCallback(() => setSplashDone(true), []);

  // Restore custom background from persisted settings on startup
  useEffect(() => {
    if (ready) {
      restoreBackground();
    }
  }, [ready, restoreBackground]);

  // Listen for navigation events from the main process (e.g. mascot overlay context menu)
  useEffect(() => {
    const unsub = window.electronAPI?.overlay?.onNavigate?.((view: string) => {
      if (view === 'schedule' || view === 'library' || view === 'settings' || view === 'browser') {
        navigateTo(view);
      }
    });
    return () => {
      unsub?.();
    };
  }, [navigateTo]);

  const hasBg = !!customBackground;

  return (
    <>
      {/* Splash screen overlay — covers everything during initialization */}
      <SplashScreen ready={ready} error={error} onDismissed={handleSplashDismissed} />

      {splashDone && (
        <div
          data-testid="app-ready"
          className={cn(
            'h-screen w-screen bg-background text-foreground flex flex-col overflow-hidden relative',
            IS_ELECTRON && 'rounded-t-[10px]'
          )}
        >
          {/* Custom background overlay — covers entire window including sidebar */}
          {hasBg && !isFullScreen && <BackgroundOverlay />}

          {/* Custom title bar for frameless window — hidden in fullscreen */}
          {IS_ELECTRON && !isFullScreen && <TitleBar />}

          {/* Content area — full width, with bottom padding for the dock */}
          <main
            id="main-content"
            className={cn(
              'flex-1 flex overflow-hidden relative z-[1]',
              hasBg ? 'bg-transparent' : 'bg-background',
              !isFullScreen && 'pb-20'
            )}
          >
            <ErrorBoundary>
              {activeView === 'browser' && <BrowserView />}
              {activeView === 'library' && <LibraryView />}
              {activeView === 'schedule' && <ScheduleView />}
              {activeView === 'settings' && <SettingsView />}
            </ErrorBoundary>
          </main>

          {/* Floating dock navigation — hidden in fullscreen */}
          {!isFullScreen && <NavigationDock hasBg={hasBg} />}
        </div>
      )}
    </>
  );
}

export default App;
