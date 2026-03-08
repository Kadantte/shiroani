import { useState, useCallback } from 'react';
import { Globe, BookOpen, Calendar, Settings, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { IS_ELECTRON } from '@/lib/platform';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { TitleBar } from '@/components/shared/TitleBar';
import { BrowserView } from '@/components/browser/BrowserView';
import { LibraryView } from '@/components/library/LibraryView';
import { ScheduleView } from '@/components/schedule/ScheduleView';
import { SettingsView } from '@/components/settings/SettingsView';
import { useAppInitialization } from '@/hooks/useAppInitialization';

type ActiveView = 'browser' | 'library' | 'schedule' | 'settings';

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
  const [activeView, setActiveView] = useState<ActiveView>('browser');
  const { ready, error } = useAppInitialization();

  const handleNavigate = useCallback((view: ActiveView) => {
    setActiveView(prev => {
      // Tell main process to hide/show the native WebContentsView overlay
      if (IS_ELECTRON && window.electronAPI?.browser) {
        if (prev === 'browser' && view !== 'browser') {
          window.electronAPI.browser.hide();
        } else if (prev !== 'browser' && view === 'browser') {
          window.electronAPI.browser.show();
        }
      }
      return view;
    });
  }, []);

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

  return (
    <div
      data-testid="app-ready"
      className={cn(
        'h-screen w-screen bg-background text-foreground flex flex-col overflow-hidden',
        IS_ELECTRON && 'rounded-t-[10px]'
      )}
    >
      {/* Custom title bar for frameless window */}
      {IS_ELECTRON && <TitleBar />}

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar navigation */}
        <nav className="w-14 flex flex-col items-center py-3 gap-1.5 border-r border-border bg-sidebar shrink-0">
          {NAV_ITEMS.map(item => (
            <Tooltip key={item.id}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => handleNavigate(item.id)}
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
              </TooltipTrigger>
              <TooltipContent side="right">{item.label}</TooltipContent>
            </Tooltip>
          ))}

          <div className="flex-1" />

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => handleNavigate(SETTINGS_ITEM.id)}
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
            </TooltipTrigger>
            <TooltipContent side="right">{SETTINGS_ITEM.label}</TooltipContent>
          </Tooltip>
        </nav>

        {/* Content area renders the active view */}
        <main className="flex-1 flex overflow-hidden bg-background">
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
