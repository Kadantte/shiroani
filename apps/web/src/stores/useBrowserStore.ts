import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { arrayMove } from '@dnd-kit/sortable';
import type { BrowserTab } from '@shiroani/shared';
import { createLogger, DEFAULT_HOMEPAGE_URL } from '@shiroani/shared';
import { getWebview, unregisterWebview } from '@/components/browser/webviewRefs';
import { normalizeUrl } from '@/lib/url-utils';

const logger = createLogger('BrowserStore');

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
  persistTabs: () => void;
  restoreTabs: () => Promise<void>;
}

type BrowserStore = BrowserState & BrowserActions;

let defaultUrl = DEFAULT_HOMEPAGE_URL;

// Debounce timer for tab persistence
let persistTimer: ReturnType<typeof setTimeout> | null = null;
const PERSIST_DEBOUNCE_MS = 1000;

export const useBrowserStore = create<BrowserStore>()(
  devtools(
    (set, get) => ({
      // State
      tabs: [],
      activeTabId: null,
      isAddressBarFocused: false,
      adblockEnabled: true,
      isFullScreen: false,

      // ── Tab CRUD (all local now) ────────────────────────────────

      openTab: (url?: string) => {
        const targetUrl = typeof url === 'string' ? url : defaultUrl;
        const tabId = crypto.randomUUID();

        const newTab: BrowserTab = {
          id: tabId,
          url: targetUrl,
          title: 'Nowa karta',
          isLoading: true,
          canGoBack: false,
          canGoForward: false,
        };

        set(
          state => ({
            tabs: [...state.tabs, newTab],
            activeTabId: tabId,
          }),
          undefined,
          'browser/openTab'
        );

        logger.debug(`Tab created: ${tabId} → ${targetUrl}`);
      },

      closeTab: (tabId: string) => {
        const { tabs, activeTabId } = get();
        const index = tabs.findIndex(t => t.id === tabId);
        if (index === -1) return;

        // Unregister webview ref immediately
        unregisterWebview(tabId);

        const newTabs = tabs.filter(t => t.id !== tabId);
        let newActiveId = activeTabId;

        if (activeTabId === tabId) {
          if (newTabs.length > 0) {
            newActiveId = newTabs[Math.min(index, newTabs.length - 1)].id;
          } else {
            newActiveId = null;
          }
        }

        set({ tabs: newTabs, activeTabId: newActiveId }, undefined, 'browser/closeTab');
        get().persistTabs();
      },

      switchTab: (tabId: string) => {
        set({ activeTabId: tabId }, undefined, 'browser/switchTab');
      },

      reorderTabs: (activeId: string, overId: string) => {
        const { tabs } = get();
        const oldIndex = tabs.findIndex(t => t.id === activeId);
        const newIndex = tabs.findIndex(t => t.id === overId);
        if (oldIndex === -1 || newIndex === -1) return;

        const reordered = arrayMove(tabs, oldIndex, newIndex);
        set({ tabs: reordered }, undefined, 'browser/reorderTabs');
        get().persistTabs();
      },

      // ── Navigation (calls webview methods directly) ─────────────

      navigate: (url: string) => {
        const { activeTabId } = get();
        if (!activeTabId) return;

        const webview = getWebview(activeTabId);
        if (!webview) {
          logger.warn(`No webview ref for tab ${activeTabId}`);
          return;
        }

        const normalizedUrl = normalizeUrl(url);
        webview.loadURL(normalizedUrl).catch((err: Error) => {
          logger.error(`Failed to navigate tab ${activeTabId}:`, err.message);
        });
      },

      goBack: () => {
        const { activeTabId } = get();
        if (!activeTabId) return;
        getWebview(activeTabId)?.goBack();
      },

      goForward: () => {
        const { activeTabId } = get();
        if (!activeTabId) return;
        getWebview(activeTabId)?.goForward();
      },

      reload: () => {
        const { activeTabId } = get();
        if (!activeTabId) return;
        getWebview(activeTabId)?.reload();
      },

      // ── State updates ───────────────────────────────────────────

      updateTabState: (tabId: string, updates: Partial<BrowserTab>) => {
        set(
          state => ({
            tabs: state.tabs.map(t => (t.id === tabId ? { ...t, ...updates } : t)),
          }),
          undefined,
          'browser/updateTabState'
        );
        // Debounced persistence when tab state changes (URL, title, etc.)
        if (updates.url || updates.title) {
          get().persistTabs();
        }
      },

      setAddressBarFocused: (focused: boolean) => {
        set({ isAddressBarFocused: focused }, undefined, 'browser/setAddressBarFocused');
      },

      setAdblockEnabled: (enabled: boolean) => {
        set({ adblockEnabled: enabled }, undefined, 'browser/setAdblockEnabled');
        // Adblock toggle still goes through IPC — the session-level webRequest
        // handlers live in the main process
        window.electronAPI?.browser?.toggleAdblock(enabled);
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

      // ── Persistence ─────────────────────────────────────────────

      persistTabs: () => {
        if (persistTimer) clearTimeout(persistTimer);
        persistTimer = setTimeout(() => {
          const { tabs, activeTabId } = get();
          const filtered = tabs.filter(t => t.url && t.url !== 'about:blank');

          if (filtered.length === 0) {
            window.electronAPI?.store?.delete('browser-tabs');
            return;
          }

          const activeIndex = activeTabId ? filtered.findIndex(t => t.id === activeTabId) : 0;

          const state = {
            tabs: filtered.map(t => ({ url: t.url, title: t.title })),
            activeIndex: Math.max(0, activeIndex),
          };

          window.electronAPI?.store?.set('browser-tabs', state);
          logger.debug(`Persisted ${filtered.length} tab(s)`);
        }, PERSIST_DEBOUNCE_MS);
      },

      restoreTabs: async () => {
        // Restore adblock setting
        const settings = await window.electronAPI?.store?.get<{
          adblockEnabled?: boolean;
          homepage?: string;
        }>('browser-settings');

        if (settings) {
          if (typeof settings.adblockEnabled === 'boolean') {
            set({ adblockEnabled: settings.adblockEnabled });
          }
          if (settings.homepage) {
            defaultUrl = settings.homepage;
          }
        }

        // Restore tabs
        const saved = await window.electronAPI?.store?.get<{
          tabs: Array<{ url: string; title: string }>;
          activeIndex: number;
        }>('browser-tabs');

        if (saved?.tabs?.length) {
          const restoredTabs: BrowserTab[] = saved.tabs.map(t => ({
            id: crypto.randomUUID(),
            url: t.url,
            title: t.title || 'Nowa karta',
            isLoading: true, // Will start loading when webview mounts
            canGoBack: false,
            canGoForward: false,
          }));

          const activeIndex = Math.min(saved.activeIndex, restoredTabs.length - 1);

          set(
            {
              tabs: restoredTabs,
              activeTabId: restoredTabs[Math.max(0, activeIndex)]?.id ?? null,
            },
            undefined,
            'browser/restoreTabs'
          );

          logger.debug(`Restored ${restoredTabs.length} tab(s)`);
        }
      },
    }),
    { name: 'browser' }
  )
);
