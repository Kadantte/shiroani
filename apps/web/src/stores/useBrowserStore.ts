import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

// TODO: Import browser-related types from @shiroani/shared
// import { type BrowserTab } from '@shiroani/shared';

/**
 * Browser tab state
 *
 * TODO: Replace with proper type from shared package
 */
interface BrowserTab {
  id: string;
  url: string;
  title: string;
  isLoading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
}

/**
 * Browser store state
 *
 * TODO: Define the following state fields:
 * - tabs: BrowserTab[] — Array of open browser tabs
 * - activeTabId: string | null — Currently active tab
 * - isAddressBarFocused: boolean — Whether the address bar is focused
 * - bookmarks: string[] — Bookmarked URLs
 * - history: { url: string; title: string; visitedAt: number }[] — Navigation history
 */
interface BrowserState {
  tabs: BrowserTab[];
  activeTabId: string | null;
  isAddressBarFocused: boolean;
}

/**
 * Browser store actions
 *
 * TODO: Define the following actions:
 * - openTab(url?: string): void — Open a new tab (default to homepage)
 * - closeTab(tabId: string): void — Close a tab
 * - switchTab(tabId: string): void — Switch to a tab
 * - navigate(url: string): void — Navigate active tab to URL
 * - goBack(): void — Navigate back in active tab
 * - goForward(): void — Navigate forward in active tab
 * - reload(): void — Reload active tab
 * - updateTabState(tabId: string, updates: Partial<BrowserTab>): void — Update tab metadata
 * - reorderTabs(fromIndex: number, toIndex: number): void — Reorder tabs via drag
 * - setAddressBarFocused(focused: boolean): void — Track address bar focus
 */
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
}

type BrowserStore = BrowserState & BrowserActions;

let nextTabId = 1;

function createTabId(): string {
  return `tab-${nextTabId++}`;
}

// TODO: Replace with actual default homepage URL
const DEFAULT_URL = 'about:blank';

export const useBrowserStore = create<BrowserStore>()(
  devtools(
    (set, get) => ({
      // State
      tabs: [],
      activeTabId: null,
      isAddressBarFocused: false,

      // Actions
      openTab: (url?: string) => {
        const id = createTabId();
        const newTab: BrowserTab = {
          id,
          url: url ?? DEFAULT_URL,
          title: 'New Tab',
          isLoading: true,
          canGoBack: false,
          canGoForward: false,
        };
        set(
          state => ({
            tabs: [...state.tabs, newTab],
            activeTabId: id,
          }),
          undefined,
          'browser/openTab'
        );
        // TODO: Tell Electron to create a new BrowserView/webview for this tab
      },

      closeTab: (tabId: string) => {
        const { tabs, activeTabId } = get();
        const index = tabs.findIndex(t => t.id === tabId);
        if (index === -1) return;

        const newTabs = tabs.filter(t => t.id !== tabId);
        let newActiveId = activeTabId;

        if (activeTabId === tabId) {
          // Switch to adjacent tab
          if (newTabs.length > 0) {
            newActiveId = newTabs[Math.min(index, newTabs.length - 1)].id;
          } else {
            newActiveId = null;
          }
        }

        set({ tabs: newTabs, activeTabId: newActiveId }, undefined, 'browser/closeTab');
        // TODO: Tell Electron to destroy the BrowserView/webview for this tab
      },

      switchTab: (tabId: string) => {
        set({ activeTabId: tabId }, undefined, 'browser/switchTab');
        // TODO: Tell Electron to show the BrowserView for this tab
      },

      navigate: (url: string) => {
        const { activeTabId, tabs } = get();
        if (!activeTabId) return;

        set(
          {
            tabs: tabs.map(t => (t.id === activeTabId ? { ...t, url, isLoading: true } : t)),
          },
          undefined,
          'browser/navigate'
        );
        // TODO: Tell Electron to navigate the webview to the URL
      },

      goBack: () => {
        // TODO: Tell Electron to go back in the active webview
      },

      goForward: () => {
        // TODO: Tell Electron to go forward in the active webview
      },

      reload: () => {
        const { activeTabId, tabs } = get();
        if (!activeTabId) return;

        set(
          {
            tabs: tabs.map(t => (t.id === activeTabId ? { ...t, isLoading: true } : t)),
          },
          undefined,
          'browser/reload'
        );
        // TODO: Tell Electron to reload the active webview
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
    }),
    { name: 'browser' }
  )
);
