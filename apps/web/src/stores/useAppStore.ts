import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { IS_ELECTRON } from '@/lib/platform';

export type ActiveView = 'browser' | 'library' | 'schedule' | 'settings';

interface AppState {
  activeView: ActiveView;
}

interface AppActions {
  navigateTo: (view: ActiveView) => void;
}

type AppStore = AppState & AppActions;

export const useAppStore = create<AppStore>()(
  devtools(
    (set, get) => ({
      activeView: 'browser',

      navigateTo: (view: ActiveView) => {
        const prev = get().activeView;
        if (prev === view) return;

        // Tell main process to hide/show the native WebContentsView overlay
        if (IS_ELECTRON && window.electronAPI?.browser) {
          if (prev === 'browser' && view !== 'browser') {
            window.electronAPI.browser.hide();
          } else if (prev !== 'browser' && view === 'browser') {
            window.electronAPI.browser.show();
          }
        }

        set({ activeView: view }, undefined, 'app/navigateTo');
      },
    }),
    { name: 'app' }
  )
);
