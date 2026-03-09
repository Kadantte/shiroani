import { useEffect } from 'react';
import { Globe, BookOpen, Calendar, Settings, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { IS_ELECTRON } from '@/lib/platform';

import { TitleBar } from '@/components/shared/TitleBar';
import { BrowserView } from '@/components/browser/BrowserView';
import { LibraryView } from '@/components/library/LibraryView';
import { ScheduleView } from '@/components/schedule/ScheduleView';
import { SettingsView } from '@/components/settings/SettingsView';
import { useAppInitialization } from '@/hooks/useAppInitialization';
import { useAppStore, type ActiveView } from '@/stores/useAppStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { BackgroundOverlay } from '@/components/shared/BackgroundOverlay';

interface NavItem {
  id: ActiveView;
  label: string;
  Icon: typeof Globe;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'browser', label: 'Przegladarka', Icon: Globe },
  { id: 'library', label: 'Biblioteka', Icon: BookOpen },
  { id: 'schedule', label: 'Harmonogram', Icon: Calendar },
];

const SETTINGS_ITEM: NavItem = { id: 'settings', label: 'Ustawienia', Icon: Settings };

function App() {
  const activeView = useAppStore(s => s.activeView);
  const navigateTo = useAppStore(s => s.navigateTo);
  const { ready, error } = useAppInitialization();
  const restoreBackground = useSettingsStore(s => s.restoreBackground);
  const customBackground = useSettingsStore(s => s.customBackground);

  // Restore custom background from persisted settings on startup
  useEffect(() => {
    if (ready) {
      restoreBackground();
    }
  }, [ready, restoreBackground]);

  // Show loading state while initializing socket connection
  if (!ready) {
    return (
      <div
        className={cn(
          'h-screen w-screen bg-background text-foreground flex flex-col items-center justify-center overflow-hidden',
          IS_ELECTRON && 'rounded-t-[10px]'
        )}
      >
        {IS_ELECTRON && <TitleBar />}
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          {error ? (
            <p className="text-destructive text-sm">{error}</p>
          ) : (
            <>
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              <p className="text-muted-foreground text-sm">Laczenie z serwerem...</p>
            </>
          )}
        </div>
      </div>
    );
  }

  const hasBg = !!customBackground;

  return (
    <div
      data-testid="app-ready"
      className={cn(
        'h-screen w-screen bg-background text-foreground flex flex-col overflow-hidden relative',
        IS_ELECTRON && 'rounded-t-[10px]'
      )}
    >
      {/* Custom background overlay — covers entire window including sidebar */}
      {hasBg && <BackgroundOverlay />}

      {/* Custom title bar for frameless window */}
      {IS_ELECTRON && <TitleBar />}

      <div className="flex-1 flex overflow-hidden relative z-[1]">
        {/* Sidebar navigation */}
        <nav
          className={cn(
            'w-14 flex flex-col items-center py-3 gap-1.5 border-r border-border shrink-0',
            hasBg ? 'bg-sidebar/60 backdrop-blur-sm' : 'bg-sidebar'
          )}
        >
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => navigateTo(item.id)}
              className={cn(
                'w-10 h-10 rounded-lg flex items-center justify-center',
                'transition-all duration-200',
                activeView === item.id
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <item.Icon className="w-5 h-5" />
            </button>
          ))}

          <div className="flex-1" />

          <button
            onClick={() => navigateTo(SETTINGS_ITEM.id)}
            className={cn(
              'w-10 h-10 rounded-lg flex items-center justify-center',
              'transition-all duration-200',
              activeView === 'settings'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          >
            <SETTINGS_ITEM.Icon className="w-5 h-5" />
          </button>
        </nav>

        {/* Content area renders the active view */}
        <main
          className={cn('flex-1 flex overflow-hidden', hasBg ? 'bg-transparent' : 'bg-background')}
        >
          {activeView === 'browser' && <BrowserView />}
          {activeView === 'library' && <LibraryView />}
          {activeView === 'schedule' && <ScheduleView />}
          {activeView === 'settings' && <SettingsView />}
        </main>
      </div>
    </div>
  );
}

export default App;
