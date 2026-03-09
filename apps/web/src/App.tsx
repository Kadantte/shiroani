import { useEffect } from 'react';
import { Globe, BookOpen, Calendar, Settings, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { IS_ELECTRON } from '@/lib/platform';

import { TitleBar } from '@/components/shared/TitleBar';
import { BrowserView } from '@/components/browser/BrowserView';
import { LibraryView } from '@/components/library/LibraryView';
import { ScheduleView } from '@/components/schedule/ScheduleView';
import { SettingsView } from '@/components/settings/SettingsView';
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
  const restoreBackground = useBackgroundStore(s => s.restoreBackground);
  const customBackground = useBackgroundStore(s => s.customBackground);
  const isFullScreen = useBrowserStore(s => s.isFullScreen);

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
          'h-screen w-screen bg-background text-foreground flex flex-col overflow-hidden',
          IS_ELECTRON && 'rounded-t-[10px]'
        )}
      >
        {IS_ELECTRON && <TitleBar />}
        <div className="flex-1 flex flex-col items-center justify-center gap-5">
          {error ? (
            <div className="flex flex-col items-center gap-3 max-w-xs text-center">
              <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-destructive" />
              </div>
              <p className="text-destructive text-sm">{error}</p>
            </div>
          ) : (
            <>
              <div className="flex flex-col items-center gap-1">
                <span className="text-2xl font-bold tracking-tight text-foreground">白アニ</span>
                <span className="text-xs text-muted-foreground/60 tracking-widest uppercase">
                  ShiroAni
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <p className="text-muted-foreground text-xs">Laczenie z serwerem...</p>
              </div>
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
      {hasBg && !isFullScreen && <BackgroundOverlay />}

      {/* Custom title bar for frameless window — hidden in fullscreen */}
      {IS_ELECTRON && !isFullScreen && <TitleBar />}

      <div className="flex-1 flex overflow-hidden relative z-[1]">
        {/* Sidebar navigation — hidden in fullscreen */}
        {!isFullScreen && (
          <nav
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
