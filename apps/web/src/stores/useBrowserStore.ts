import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { arrayMove } from '@dnd-kit/sortable';
import type { BrowserTab } from '@shiroani/shared';
import { createLogger, NEW_TAB_URL } from '@shiroani/shared';
import { getWebview, unregisterWebview } from '@/components/browser/webviewRefs';
import { normalizeUrl, normalizeWhitelistHost } from '@/lib/url-utils';
import { electronStoreGet, electronStoreSet, electronStoreDelete } from '@/lib/electron-store';
import { updateAnimePresence } from '@/lib/anime-detection';

const logger = createLogger('BrowserStore');

/** Keep renderer state in lockstep with the main-process slice in browser IPC. */
const MAX_ADBLOCK_WHITELIST_ENTRIES = 500;

interface BrowserState {
  tabs: BrowserTab[];
  activeTabId: string | null;
  isAddressBarFocused: boolean;
  adblockEnabled: boolean;
  popupBlockEnabled: boolean;
  /** Top-frame hostnames where adblock network filtering is disabled. */
  adblockWhitelist: string[];
  /** Whether to restore the previous session's tabs on app start. */
  restoreTabsOnStartup: boolean;
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
  setPopupBlockEnabled: (enabled: boolean) => void;
  togglePopupBlock: () => void;
  addAdblockDomain: (host: string) => void;
  removeAdblockDomain: (host: string) => void;
  setRestoreTabsOnStartup: (enabled: boolean) => void;
  persistTabs: () => void;
  restoreTabs: () => Promise<void>;
}

type BrowserStore = BrowserState & BrowserActions;

// Debounce timer for tab persistence
let persistTimer: ReturnType<typeof setTimeout> | null = null;
const PERSIST_DEBOUNCE_MS = 1000;

/**
 * Persist the browser-settings slice (adblock toggle, popup switch, whitelist)
 * back to electron-store, merging with whatever else lives under that key.
 */
async function persistBrowserSettings(updates: {
  adblockEnabled?: boolean;
  popupBlockEnabled?: boolean;
  adblockWhitelist?: string[];
  restoreTabsOnStartup?: boolean;
}): Promise<void> {
  const existing = (await electronStoreGet<Record<string, unknown>>('browser-settings')) ?? {};
  await electronStoreSet('browser-settings', { ...existing, ...updates });
}

export const useBrowserStore = create<BrowserStore>()(
  devtools(
    (set, get) => ({
      // State
      tabs: [],
      activeTabId: null,
      isAddressBarFocused: false,
      adblockEnabled: true,
      popupBlockEnabled: true,
      adblockWhitelist: [],
      restoreTabsOnStartup: true,
      isFullScreen: false,

      // ── Tab CRUD (all local now) ────────────────────────────────

      openTab: (url?: string) => {
        const targetUrl = typeof url === 'string' ? url : NEW_TAB_URL;
        const tabId = crypto.randomUUID();

        const newTab: BrowserTab = {
          id: tabId,
          url: targetUrl,
          title: 'Nowa karta',
          isLoading: targetUrl !== NEW_TAB_URL,
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
        // Re-evaluate anime detection on the newly-active tab. Without this,
        // switching from an anime tab to a non-anime tab whose URL/title
        // doesn't change leaves `setWatchingAnime(true)` stuck and
        // `animeWatchSeconds` keeps incrementing for the wrong tab.
        updateAnimePresence(tabId);
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
        const { activeTabId, updateTabState } = get();
        if (!activeTabId) return;

        const normalizedUrl = normalizeUrl(url);
        const webview = getWebview(activeTabId);

        if (!webview) {
          // No webview (e.g., new tab page) — update state to trigger webview mount
          updateTabState(activeTabId, { url: normalizedUrl, isLoading: true });
          return;
        }

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

      setAdblockEnabled: async (enabled: boolean) => {
        const previous = get().adblockEnabled;
        set({ adblockEnabled: enabled }, undefined, 'browser/setAdblockEnabled');
        try {
          await window.electronAPI?.browser?.toggleAdblock(enabled);
          await persistBrowserSettings({ adblockEnabled: enabled });
        } catch (err) {
          logger.warn('useBrowserStore: failed to persist adblockEnabled', err);
          set({ adblockEnabled: previous }, undefined, 'browser/setAdblockEnabled:revert');
        }
      },

      toggleAdblock: () => {
        const enabled = !get().adblockEnabled;
        get().setAdblockEnabled(enabled);
      },

      setPopupBlockEnabled: async (enabled: boolean) => {
        const previous = get().popupBlockEnabled;
        set({ popupBlockEnabled: enabled }, undefined, 'browser/setPopupBlockEnabled');
        try {
          await window.electronAPI?.browser?.setPopupBlockEnabled(enabled);
          await persistBrowserSettings({ popupBlockEnabled: enabled });
        } catch (err) {
          logger.warn('useBrowserStore: failed to persist popupBlockEnabled', err);
          set({ popupBlockEnabled: previous }, undefined, 'browser/setPopupBlockEnabled:revert');
        }
      },

      togglePopupBlock: () => {
        get().setPopupBlockEnabled(!get().popupBlockEnabled);
      },

      addAdblockDomain: (host: string) => {
        const normalized = normalizeWhitelistHost(host);
        if (!normalized) return;

        const current = get().adblockWhitelist;
        if (current.includes(normalized)) return;
        // Main process silently slices to MAX_ADBLOCK_WHITELIST_ENTRIES; mirror
        // that here so renderer state matches what's actually applied.
        if (current.length >= MAX_ADBLOCK_WHITELIST_ENTRIES) return;

        const next = [...current, normalized];
        set({ adblockWhitelist: next }, undefined, 'browser/addAdblockDomain');
        void window.electronAPI?.browser?.setAdblockWhitelist?.(next);
        void persistBrowserSettings({ adblockWhitelist: next });
      },

      setRestoreTabsOnStartup: async (enabled: boolean) => {
        const previous = get().restoreTabsOnStartup;
        set({ restoreTabsOnStartup: enabled }, undefined, 'browser/setRestoreTabsOnStartup');
        try {
          await persistBrowserSettings({ restoreTabsOnStartup: enabled });
          // When turning off, drop any stored tabs so toggling back on
          // doesn't resurrect a stale session the user can't see anymore.
          if (!enabled) {
            electronStoreDelete('browser-tabs');
          }
        } catch (err) {
          logger.warn('useBrowserStore: failed to persist restoreTabsOnStartup', err);
          set(
            { restoreTabsOnStartup: previous },
            undefined,
            'browser/setRestoreTabsOnStartup:revert'
          );
        }
      },

      removeAdblockDomain: (host: string) => {
        const normalized = normalizeWhitelistHost(host);
        if (!normalized) return;

        const current = get().adblockWhitelist;
        if (!current.includes(normalized)) return;

        const next = current.filter(h => h !== normalized);
        set({ adblockWhitelist: next }, undefined, 'browser/removeAdblockDomain');
        void window.electronAPI?.browser?.setAdblockWhitelist?.(next);
        void persistBrowserSettings({ adblockWhitelist: next });
      },

      // ── Persistence ─────────────────────────────────────────────

      persistTabs: () => {
        // Gated by the "Przywróć karty po restarcie" toggle — when off we
        // drop writes entirely so nothing lingers under the store key.
        if (!get().restoreTabsOnStartup) return;

        if (persistTimer) clearTimeout(persistTimer);
        persistTimer = setTimeout(() => {
          const { tabs, activeTabId } = get();
          const filtered = tabs.filter(t => t.url && t.url !== 'about:blank');

          if (filtered.length === 0) {
            electronStoreDelete('browser-tabs');
            return;
          }

          const activeIndex = activeTabId ? filtered.findIndex(t => t.id === activeTabId) : 0;

          const state = {
            tabs: filtered.map(t => ({ url: t.url, title: t.title })),
            activeIndex: Math.max(0, activeIndex),
          };

          electronStoreSet('browser-tabs', state);
          logger.debug(`Persisted ${filtered.length} tab(s)`);
        }, PERSIST_DEBOUNCE_MS);
      },

      restoreTabs: async () => {
        // Restore browser settings (adblock toggle, popup switch, whitelist).
        // Legacy `popupBlockMode` string is migrated to the new boolean shape.
        const settings = await electronStoreGet<{
          adblockEnabled?: boolean;
          popupBlockEnabled?: boolean;
          popupBlockMode?: string;
          adblockWhitelist?: unknown;
          restoreTabsOnStartup?: boolean;
        }>('browser-settings');

        if (settings) {
          if (typeof settings.adblockEnabled === 'boolean') {
            set({ adblockEnabled: settings.adblockEnabled });
          }

          // Popup block: prefer the new boolean, fall back to legacy string.
          let popupEnabled: boolean | null = null;
          if (typeof settings.popupBlockEnabled === 'boolean') {
            popupEnabled = settings.popupBlockEnabled;
          } else if (typeof settings.popupBlockMode === 'string') {
            // Legacy migration: 'off' → false, anything else ('smart' | 'strict') → true
            popupEnabled = settings.popupBlockMode !== 'off';
          }
          if (popupEnabled !== null) {
            set({ popupBlockEnabled: popupEnabled });
            // Sync with main process and persist in the new shape so this
            // migration runs at most once.
            void window.electronAPI?.browser?.setPopupBlockEnabled?.(popupEnabled);
            void persistBrowserSettings({ popupBlockEnabled: popupEnabled });
          }

          if (typeof settings.restoreTabsOnStartup === 'boolean') {
            set({ restoreTabsOnStartup: settings.restoreTabsOnStartup });
          }

          // Restore + push whitelist to main
          if (Array.isArray(settings.adblockWhitelist)) {
            const cleaned = Array.from(
              new Set(
                settings.adblockWhitelist
                  .filter((h): h is string => typeof h === 'string')
                  .map(h => normalizeWhitelistHost(h))
                  .filter(h => h.length > 0)
              )
            );
            set({ adblockWhitelist: cleaned });
            void window.electronAPI?.browser?.setAdblockWhitelist?.(cleaned);
          }
        }

        // Restore tabs (unless the user disabled session restore)
        if (!get().restoreTabsOnStartup) return;

        const saved = await electronStoreGet<{
          tabs: Array<{ url: string; title: string }>;
          activeIndex: number;
        }>('browser-tabs');

        if (saved?.tabs?.length) {
          const restoredTabs: BrowserTab[] = saved.tabs.map(t => ({
            id: crypto.randomUUID(),
            url: t.url,
            title: t.title || 'Nowa karta',
            isLoading: t.url !== NEW_TAB_URL, // New tab pages don't load
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
