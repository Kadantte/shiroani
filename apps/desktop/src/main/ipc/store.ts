import { ipcMain } from 'electron';
import { createMainLogger } from '../logger';
import { store } from '../store';
import { handle, handleWithFallback } from './with-ipc-handler';
import { storeGetSchema, storeSetSchema, storeDeleteSchema } from './schemas';

const logger = createMainLogger('IPC:Store');

/**
 * Security: Whitelist of allowed store keys
 * Only these keys can be read/written from the renderer process
 */
const ALLOWED_STORE_KEYS = new Set([
  // Theme
  'preferences.theme',
  'preferences',
  // Settings
  'settings',
  'settings.language',
  'settings.autoUpdate',
  'settings.adblockEnabled',
  'settings.uiFontScale',
  // Library bookmarks
  'library-bookmarks',
  // Update channel
  'preferences.updateChannel',
  // Custom backgrounds
  'custom-backgrounds',
  // Custom themes
  'custom-themes',
  // Browser settings (homepage, adblock)
  'browser-settings',
  // Notification settings
  'notification-settings',
  // Window state
  'window.bounds',
  'window.maximized',
  // Mascot overlay
  'settings.mascotEnabled',
  'settings.mascotSize',
  'settings.mascotVisibilityMode',
  'settings.mascotPositionLocked',
  'settings.mascotPosition',
  // Discord RPC settings
  'discord-rpc-settings',
  // Browser tab persistence (renderer saves/loads tabs directly)
  'browser-tabs',
  // Quick access sites and frequent visits
  'quick-access-sites',
  'quick-access-frequent',
  // Dock position and settings
  'dock-settings',
  // Onboarding completion
  'onboarding-completed',
  // AniList profile username
  'anilist-username',
  // Feed bookmarks and read state (mirrored from renderer for cross-window access)
  'shiroani:feed-bookmarks',
  'shiroani:feedReadIds',
]);

/**
 * Check if a key is allowed (exact match or prefix match for nested keys)
 */
function isKeyAllowed(key: string): boolean {
  // Check exact match
  if (ALLOWED_STORE_KEYS.has(key)) {
    return true;
  }

  // Check if key starts with an allowed prefix (for nested access)
  for (const allowedKey of ALLOWED_STORE_KEYS) {
    if (key.startsWith(`${allowedKey}.`)) {
      return true;
    }
  }

  return false;
}

/**
 * Register electron-store IPC handlers
 */
export function registerStoreHandlers(): void {
  handleWithFallback(
    'store:get',
    (_event, key) => {
      if (!isKeyAllowed(key)) {
        logger.warn(`Blocked store:get for unauthorized key: ${key}`);
        return undefined;
      }
      return store.get(key);
    },
    () => undefined,
    { schema: storeGetSchema }
  );

  handle(
    'store:set',
    (_event, key, value) => {
      if (!isKeyAllowed(key)) {
        logger.warn(`Blocked store:set for unauthorized key: ${key}`);
        return;
      }
      const serialized = JSON.stringify(value);
      if (serialized.length > 1_000_000) {
        throw new Error('Value too large');
      }
      store.set(key, value);
    },
    { schema: storeSetSchema }
  );

  handle(
    'store:delete',
    (_event, key) => {
      if (!isKeyAllowed(key)) {
        logger.warn(`Blocked store:delete for unauthorized key: ${key}`);
        return;
      }
      store.delete(key);
    },
    { schema: storeDeleteSchema }
  );
}

/**
 * Clean up electron-store IPC handlers
 */
export function cleanupStoreHandlers(): void {
  ipcMain.removeHandler('store:get');
  ipcMain.removeHandler('store:set');
  ipcMain.removeHandler('store:delete');
}
