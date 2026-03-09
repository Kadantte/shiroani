import { useEffect, useState, useCallback } from 'react';
import { Globe, BookOpen, Calendar, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { IS_ELECTRON } from '@/lib/platform';

import { TitleBar } from '@/components/shared/TitleBar';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { BrowserView } from '@/components/browser/BrowserView';
import { LibraryView } from '@/components/library/LibraryView';
import { ScheduleView } from '@/components/schedule/ScheduleView';
import { SettingsView } from '@/components/settings/SettingsView';
import { SplashScreen } from '@/components/splash';
import { useAppInitialization } from '@/hooks/useAppInitialization';
import { useAppStore, type ActiveView } from '@/stores/useAppStore';
import { useBackgroundStore } from '@/stores/useBackgroundStore';
import { useBrowserStore } from '@/stores/useBrowserStore';
import { BackgroundOverlay } from '@/components/shared/BackgroundOverlay';

interface NavItem {
  id: ActiveView;
  label: string;
  Icon: typeof Globe;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'browser', label: 'Internet', Icon: Globe },
  { id: 'library', label: 'Biblioteka', Icon: BookOpen },
  { id: 'schedule', label: 'Plan', Icon: Calendar },
];

const SETTINGS_ITEM: NavItem = { id: 'settings', label: 'Ustawienia', Icon: Settings };

function NavButton({
  item,
  isActive,
  onClick,
}: {
  item: NavItem;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-current={isActive ? 'page' : undefined}
      aria-label={item.label}
      className={cn(
        'relative w-full flex flex-col items-center justify-center gap-0.5 py-2 rounded-lg',
        'transition-all duration-200',
        isActive
          ? 'text-primary'
          : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground'
      )}
    >
      {/* Active indicator bar */}
      <div
        className={cn(
          'absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full bg-primary',
          'transition-all duration-200',
          isActive ? 'h-6 opacity-100' : 'h-0 opacity-0'
        )}
      />
      <item.Icon className={cn('w-[18px] h-[18px]', isActive && 'drop-shadow-sm')} />
      <span
        className={cn(
          'text-[9px] leading-tight font-medium truncate max-w-full px-0.5',
          isActive ? 'text-primary' : 'text-muted-foreground'
        )}
      >
        {item.label}
      </span>
    </button>
  );
}

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

          <div className="flex-1 flex overflow-hidden relative z-[1]">
            {/* Sidebar navigation — hidden in fullscreen */}
            {!isFullScreen && (
              <nav
                aria-label="Nawigacja glowna"
                className={cn(
                  'w-[68px] flex flex-col items-center px-1 py-2 gap-0.5 border-r border-border shrink-0',
                  hasBg ? 'bg-sidebar/60 backdrop-blur-sm' : 'bg-sidebar'
                )}
              >
                {NAV_ITEMS.map(item => (
                  <NavButton
                    key={item.id}
                    item={item}
                    isActive={activeView === item.id}
                    onClick={() => navigateTo(item.id)}
                  />
                ))}

                <div className="flex-1" />

                <NavButton
                  item={SETTINGS_ITEM}
                  isActive={activeView === 'settings'}
                  onClick={() => navigateTo('settings')}
                />
              </nav>
            )}

            {/* Content area renders the active view */}
            <main
              id="main-content"
              className={cn(
                'flex-1 flex overflow-hidden',
                hasBg ? 'bg-transparent' : 'bg-background'
              )}
            >
              <ErrorBoundary>
                {activeView === 'browser' && <BrowserView />}
                {activeView === 'library' && <LibraryView />}
                {activeView === 'schedule' && <ScheduleView />}
                {activeView === 'settings' && <SettingsView />}
              </ErrorBoundary>
            </main>
          </div>
        </div>
      )}
    </>
  );
}

export default App;
