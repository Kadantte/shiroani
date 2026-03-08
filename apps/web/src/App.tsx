import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { IS_ELECTRON } from '@/lib/platform';

// TODO: Import navigation icons from lucide-react
// import { Compass, Library, Calendar, Settings } from 'lucide-react';

// TODO: Import view components once created
// import { BrowserView } from '@/components/browser/BrowserView';
// import { LibraryView } from '@/components/library/LibraryView';
// import { ScheduleView } from '@/components/schedule/ScheduleView';
// import { SettingsView } from '@/components/settings/SettingsView';

type ActiveView = 'browser' | 'library' | 'schedule' | 'settings';

function App() {
  const [activeView, setActiveView] = useState<ActiveView>('browser');

  const handleNavigate = useCallback((view: ActiveView) => {
    setActiveView(view);
  }, []);

  return (
    <div
      data-testid="app-ready"
      className={cn(
        'h-screen w-screen bg-background text-foreground flex flex-col overflow-hidden',
        IS_ELECTRON && 'rounded-t-[10px]'
      )}
    >
      {/* TODO: Custom title bar for frameless window */}
      {/* <TitleBar /> */}

      <div className="flex-1 flex overflow-hidden">
        {/* TODO: Sidebar navigation */}
        {/* Sidebar has: Browser (Compass), Library, Schedule (Calendar), Settings icons */}
        <nav className="w-14 flex flex-col items-center py-4 gap-2 border-r border-border bg-sidebar">
          {/* TODO: Add navigation buttons with icons */}
          {/* Each button highlights when its view is active */}
          <button
            onClick={() => handleNavigate('browser')}
            className={cn(
              'w-10 h-10 rounded-lg flex items-center justify-center transition-colors',
              activeView === 'browser'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          >
            {/* TODO: <Compass className="w-5 h-5" /> */}B
          </button>
          <button
            onClick={() => handleNavigate('library')}
            className={cn(
              'w-10 h-10 rounded-lg flex items-center justify-center transition-colors',
              activeView === 'library'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          >
            {/* TODO: <Library className="w-5 h-5" /> */}L
          </button>
          <button
            onClick={() => handleNavigate('schedule')}
            className={cn(
              'w-10 h-10 rounded-lg flex items-center justify-center transition-colors',
              activeView === 'schedule'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          >
            {/* TODO: <Calendar className="w-5 h-5" /> */}S
          </button>

          <div className="flex-1" />

          <button
            onClick={() => handleNavigate('settings')}
            className={cn(
              'w-10 h-10 rounded-lg flex items-center justify-center transition-colors',
              activeView === 'settings'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          >
            {/* TODO: <Settings className="w-5 h-5" /> */}G
          </button>
        </nav>

        {/* TODO: Content area renders the active view */}
        <main className="flex-1 flex overflow-hidden bg-background">
          {/* TODO: Render active view component based on activeView state */}
          {/* {activeView === 'browser' && <BrowserView />} */}
          {/* {activeView === 'library' && <LibraryView />} */}
          {/* {activeView === 'schedule' && <ScheduleView />} */}
          {/* {activeView === 'settings' && <SettingsView />} */}
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <p className="text-lg">
              {activeView.charAt(0).toUpperCase() + activeView.slice(1)} View — Coming Soon
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
