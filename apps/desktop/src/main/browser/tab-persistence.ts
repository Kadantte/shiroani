import { createLogger } from '@shiroani/shared';
import { store } from '../store';

const logger = createLogger('TabPersistence');

export interface PersistedTab {
  url: string;
  title: string;
}

export interface PersistedTabState {
  tabs: PersistedTab[];
  activeIndex: number;
}

/** Legacy format (pre-title persistence) for backward compat */
interface LegacyPersistedTabState {
  urls: string[];
  activeIndex: number;
}

/**
 * Save the current tab URLs, titles, and active tab index to persistent storage.
 * Called on quit and debounced after tab mutations so tabs survive crashes.
 */
export function saveTabState(tabs: PersistedTab[], activeIndex: number): void {
  const filtered = tabs.filter(t => t.url && t.url !== 'about:blank');

  if (filtered.length === 0) {
    store.delete('browser-tabs');
    return;
  }

  const state: PersistedTabState = {
    tabs: filtered,
    activeIndex: Math.max(0, activeIndex),
  };

  store.set('browser-tabs', state);
  logger.debug(`Saved ${filtered.length} tab(s) to persistent storage`);
}

/**
 * Load persisted tab state from storage. Returns null if nothing was saved.
 * Handles legacy format (urls-only) for backward compatibility.
 */
export function loadPersistedTabs(): PersistedTabState | null {
  const saved = store.get('browser-tabs') as
    | PersistedTabState
    | LegacyPersistedTabState
    | undefined;

  if (!saved) return null;

  // New format: has `tabs` array
  if ('tabs' in saved && saved.tabs?.length) {
    return saved as PersistedTabState;
  }

  // Legacy format: has `urls` array — migrate to new format
  if ('urls' in saved && saved.urls?.length) {
    return {
      tabs: saved.urls.map(url => ({ url, title: 'New Tab' })),
      activeIndex: saved.activeIndex,
    };
  }

  return null;
}
