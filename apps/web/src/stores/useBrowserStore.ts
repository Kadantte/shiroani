import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { BrowserTab } from '@shiroani/shared';
import { createLogger } from '@shiroani/shared';

const logger = createLogger('BrowserStore');

/**
 * Browser store state and actions
 */
interface BrowserState {
  tabs: BrowserTab[];
  activeTabId: string | null;
  isAddressBarFocused: boolean;
  adblockEnabled: boolean;
}

interface BrowserActions {
  openTab: (url?: string) => void;
  closeTab: (tabId: string) => void;
  switchTab: (tabId: string) => void;
  navigate: (url: string) => void;
  goBack: () => void;
  goForward: () => void;
  reload: () => void;
  updateTabState: (tabId: string, updates: Partial<BrowserTab>) => void;
  setAddressBarFocused: (focused: boolean) => void;
  setAdblockEnabled: (enabled: boolean) => void;
  toggleAdblock: () => void;
  initListeners: () => () => void;
}

type BrowserStore = BrowserState & BrowserActions;

const DEFAULT_URL = 'https://anilist.co';

export const useBrowserStore = create<BrowserStore>()(
  devtools(
    (set, get) => ({
      // State
      tabs: [],
      activeTabId: null,
      isAddressBarFocused: false,
      adblockEnabled: true,

      // Actions
      openTab: (url?: string) => {
        const targetUrl = url ?? DEFAULT_URL;
        window.electronAPI?.browser
          ?.createTab(targetUrl)
          .then((tabId: string) => {
            logger.debug(`Tab created: ${tabId}`);
            // The tab-updated event from the main process will populate the tab state
          })
          .catch((err: Error) => {
            logger.error('Failed to create browser tab:', err.message);
          });
      },

      closeTab: (tabId: string) => {
        window.electronAPI?.browser?.closeTab(tabId).catch((err: Error) => {
          logger.error('Failed to close browser tab:', err.message);
        });
        // The tab-closed event from the main process will update the store
      },

      switchTab: (tabId: string) => {
        set({ activeTabId: tabId }, undefined, 'browser/switchTab');
        window.electronAPI?.browser?.switchTab(tabId).catch((err: Error) => {
          logger.error('Failed to switch browser tab:', err.message);
        });
      },

      navigate: (url: string) => {
        const { activeTabId } = get();
        if (!activeTabId) return;

        // URL normalization is handled by BrowserManager on the main process side
        window.electronAPI?.browser?.navigate(activeTabId, url).catch((err: Error) => {
          logger.error('Failed to navigate:', err.message);
        });
      },

      goBack: () => {
        const { activeTabId } = get();
        if (!activeTabId) return;
        window.electronAPI?.browser?.goBack(activeTabId).catch((err: Error) => {
          logger.error('Failed to go back:', err.message);
        });
      },

      goForward: () => {
        const { activeTabId } = get();
        if (!activeTabId) return;
        window.electronAPI?.browser?.goForward(activeTabId).catch((err: Error) => {
          logger.error('Failed to go forward:', err.message);
        });
      },

      reload: () => {
        const { activeTabId } = get();
        if (!activeTabId) return;
        window.electronAPI?.browser?.refresh(activeTabId).catch((err: Error) => {
          logger.error('Failed to reload:', err.message);
        });
      },

      updateTabState: (tabId: string, updates: Partial<BrowserTab>) => {
        set(
          state => ({
            tabs: state.tabs.map(t => (t.id === tabId ? { ...t, ...updates } : t)),
          }),
          undefined,
          'browser/updateTabState'
        );
      },

      setAddressBarFocused: (focused: boolean) => {
        set({ isAddressBarFocused: focused }, undefined, 'browser/setAddressBarFocused');
      },

      setAdblockEnabled: (enabled: boolean) => {
        set({ adblockEnabled: enabled }, undefined, 'browser/setAdblockEnabled');
        window.electronAPI?.browser?.toggleAdblock(enabled).catch((err: Error) => {
          logger.error('Failed to toggle adblock:', err.message);
        });
      },

      toggleAdblock: () => {
        const enabled = !get().adblockEnabled;
        get().setAdblockEnabled(enabled);
      },

      initListeners: () => {
        const browser = window.electronAPI?.browser;
        if (!browser) {
          logger.warn('Browser API not available - skipping listener init');
          return () => {};
        }

        logger.debug('Initializing browser listeners');

        // Listen for tab state updates from the main process
        const cleanupTabUpdated = browser.onTabUpdated((tab: BrowserTab) => {
          const { tabs } = get();
          const existing = tabs.find(t => t.id === tab.id);

          if (existing) {
            // Update existing tab
            get().updateTabState(tab.id, tab);
          } else {
            // New tab created (e.g. from popup interception or initial creation)
            set(
              state => ({
                tabs: [...state.tabs, tab],
                activeTabId: tab.id,
              }),
              undefined,
              'browser/tabAdded'
            );
          }
        });

        // Listen for tab close events from the main process
        const cleanupTabClosed = browser.onTabClosed((tabId: string) => {
          const { tabs, activeTabId } = get();
          const index = tabs.findIndex(t => t.id === tabId);
          if (index === -1) return;

          const newTabs = tabs.filter(t => t.id !== tabId);
          let newActiveId = activeTabId;

          if (activeTabId === tabId) {
            if (newTabs.length > 0) {
              newActiveId = newTabs[Math.min(index, newTabs.length - 1)].id;
            } else {
              newActiveId = null;
            }
          }

          set({ tabs: newTabs, activeTabId: newActiveId }, undefined, 'browser/tabClosed');

          // Switch to the new active tab if needed
          if (newActiveId && newActiveId !== activeTabId) {
            window.electronAPI?.browser?.switchTab(newActiveId).catch((err: Error) => {
              logger.error('Failed to switch tab after close:', err.message);
            });
          }
        });

        return () => {
          logger.debug('Cleaning up browser listeners');
          cleanupTabUpdated();
          cleanupTabClosed();
        };
      },
    }),
    { name: 'browser' }
  )
);
