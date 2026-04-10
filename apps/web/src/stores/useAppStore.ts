import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { IS_ELECTRON } from '@/lib/platform';
import { updateAnimePresence } from '@/lib/anime-detection';
import { useBrowserStore } from '@/stores/useBrowserStore';
import { useLibraryStore } from '@/stores/useLibraryStore';

export type ActiveView =
  | 'browser'
  | 'library'
  | 'discover'
  | 'diary'
  | 'schedule'
  | 'feed'
  | 'profile'
  | 'settings';

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

        // Set state first so updateAnimePresence sees the correct activeView
        set({ activeView: view }, undefined, 'app/navigateTo');

        // Update Discord Rich Presence with the new view
        if (IS_ELECTRON && window.electronAPI?.discordRpc) {
          if (view === 'browser') {
            // When navigating back to browser, restore anime-specific presence
            const activeTabId = useBrowserStore.getState().activeTabId;
            if (activeTabId) {
              updateAnimePresence(activeTabId);
            } else {
              window.electronAPI.discordRpc.updatePresence({ view });
            }
          } else if (view === 'library') {
            const libraryCount = useLibraryStore.getState().entries.length;
            window.electronAPI.discordRpc.updatePresence({ view, libraryCount });
          } else {
            window.electronAPI.discordRpc.updatePresence({ view });
          }
        }
      },
    }),
    { name: 'app' }
  )
);
