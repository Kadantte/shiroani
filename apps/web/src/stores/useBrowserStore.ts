import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { arrayMove } from '@dnd-kit/sortable';
import type { BrowserTab } from '@shiroani/shared';
import { createLogger, DEFAULT_HOMEPAGE_URL } from '@shiroani/shared';

const logger = createLogger('BrowserStore');

/**
 * Call a browser API method with standardized error logging.
 * Returns undefined if the browser API is not available.
 */
function callBrowserAPI<T>(
  action: string,
  fn: (
    browser: NonNullable<NonNullable<typeof window.electronAPI>['browser']>
  ) => Promise<T> | undefined
): Promise<T | undefined> {
  const browser = window.electronAPI?.browser;
  if (!browser) return Promise.resolve(undefined);
  return (fn(browser) ?? Promise.resolve(undefined))?.catch((err: Error) => {
    logger.error(`Failed to ${action}:`, err.message);
    return undefined;
  });
}

/**
 * Browser store state and actions
 */
interface BrowserState {
  tabs: BrowserTab[];
  activeTabId: string | null;
  isAddressBarFocused: boolean;
  adblockEnabled: boolean;
  isFullScreen: boolean;
}

interface BrowserActions {
  openTab: (url?: string) => void;
  closeTab: (tabId: string) => void;
  switchTab: (tabId: string) => void;
  reorderTabs: (activeId: string, overId: string) => void;
  navigate: (url: string) => void;
  goBack: () => void;
  goForward: () => void;
  reload: () => void;
  updateTabState: (tabId: string, updates: Partial<BrowserTab>) => void;
  setAddressBarFocused: (focused: boolean) => void;
  setAdblockEnabled: (enabled: boolean) => void;
  toggleAdblock: () => void;
  setDefaultUrl: (url: string) => void;
  getDefaultUrl: () => string;
  initListeners: () => () => void;
}

type BrowserStore = BrowserState & BrowserActions;

let defaultUrl = DEFAULT_HOMEPAGE_URL;

export const useBrowserStore = create<BrowserStore>()(
  devtools(
    (set, get) => ({
      // State
      tabs: [],
      activeTabId: null,
      isAddressBarFocused: false,
      adblockEnabled: true,
      isFullScreen: false,

      // Actions
      openTab: (url?: string) => {
        const targetUrl = typeof url === 'string' ? url : defaultUrl;
        callBrowserAPI('create browser tab', b => b.createTab(targetUrl)).then(tabId => {
          if (tabId) logger.debug(`Tab created: ${tabId}`);
          // The tab-updated event from the main process will populate the tab state
        });
      },

      closeTab: (tabId: string) => {
        callBrowserAPI('close browser tab', b => b.closeTab(tabId));
        // The tab-closed event from the main process will update the store
      },

      switchTab: (tabId: string) => {
        set({ activeTabId: tabId }, undefined, 'browser/switchTab');
        callBrowserAPI('switch browser tab', b => b.switchTab(tabId));
      },

      reorderTabs: (activeId: string, overId: string) => {
        const { tabs } = get();
        const oldIndex = tabs.findIndex(t => t.id === activeId);
        const newIndex = tabs.findIndex(t => t.id === overId);
        if (oldIndex === -1 || newIndex === -1) return;

        const reordered = arrayMove(tabs, oldIndex, newIndex);
        set({ tabs: reordered }, undefined, 'browser/reorderTabs');

        // Sync new order to main process for persistence
        const orderedIds = reordered.map(t => t.id);
        callBrowserAPI('reorder browser tabs', b => b.reorderTabs(orderedIds));
      },

      navigate: (url: string) => {
        const { activeTabId } = get();
        if (!activeTabId) return;
        // URL normalization is handled by BrowserManager on the main process side
        callBrowserAPI('navigate', b => b.navigate(activeTabId, url));
      },

      goBack: () => {
        const { activeTabId } = get();
        if (!activeTabId) return;
        callBrowserAPI('go back', b => b.goBack(activeTabId));
      },

      goForward: () => {
        const { activeTabId } = get();
        if (!activeTabId) return;
        callBrowserAPI('go forward', b => b.goForward(activeTabId));
      },

      reload: () => {
        const { activeTabId } = get();
        if (!activeTabId) return;
        callBrowserAPI('reload', b => b.refresh(activeTabId));
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
        callBrowserAPI('toggle adblock', b => b.toggleAdblock(enabled));
      },

      toggleAdblock: () => {
        const enabled = !get().adblockEnabled;
        get().setAdblockEnabled(enabled);
      },

      setDefaultUrl: (url: string) => {
        defaultUrl = url || DEFAULT_HOMEPAGE_URL;
        logger.debug('Default URL updated:', defaultUrl);
      },

      getDefaultUrl: () => defaultUrl,

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
            callBrowserAPI('switch tab after close', b => b.switchTab(newActiveId));
          }
        });

        // Listen for fullscreen enter/leave from main process
        const cleanupFullscreen = browser.onFullscreenChange((isFullScreen: boolean) => {
          set({ isFullScreen }, undefined, 'browser/fullscreenChange');
        });

        return () => {
          logger.debug('Cleaning up browser listeners');
          cleanupTabUpdated();
          cleanupTabClosed();
          cleanupFullscreen();
        };
      },
    }),
    { name: 'browser' }
  )
);
