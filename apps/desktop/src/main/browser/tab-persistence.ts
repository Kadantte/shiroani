import { createLogger } from '@shiroani/shared';
import { store } from '../store';

const logger = createLogger('TabPersistence');

export interface PersistedTabState {
  urls: string[];
  activeIndex: number;
}

/**
 * Save the current tab URLs and active tab index to persistent storage.
 * Called before app quit so tabs can be restored on next launch.
 */
export function saveTabState(tabUrls: string[], activeIndex: number): void {
  const urls = tabUrls.filter(url => url && url !== 'about:blank');

  if (urls.length === 0) {
    store.delete('browser-tabs');
    return;
  }

  const state: PersistedTabState = {
    urls,
    activeIndex: Math.max(0, activeIndex),
  };

  store.set('browser-tabs', state);
  logger.debug(`Saved ${urls.length} tab(s) to persistent storage`);
}

/**
 * Load persisted tab state from storage. Returns null if nothing was saved.
 */
export function loadPersistedTabs(): PersistedTabState | null {
  const saved = store.get('browser-tabs') as PersistedTabState | undefined;
  if (!saved?.urls?.length) return null;
  return saved;
}
