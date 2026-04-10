import { ElectronBlocker } from '@ghostery/adblocker-electron';
import { ipcMain } from 'electron';
import fetch from 'cross-fetch';
import { promises as fs } from 'fs';
import { app } from 'electron';
import { join } from 'path';
import { createMainLogger } from './logger';

const logger = createMainLogger('Adblock');

let blocker: ElectronBlocker | null = null;

/** Track cosmetic filtering state per session to avoid double-registration */
const cosmeticState = new WeakMap<
  Electron.Session,
  { preloadScriptId: string; ipcRegistered: boolean }
>();

export async function initializeAdblock(): Promise<ElectronBlocker> {
  const cachePath = join(app.getPath('userData'), 'adblock-engine.bin');

  logger.info('Initializing adblocker...');

  blocker = await ElectronBlocker.fromPrebuiltFull(fetch, {
    path: cachePath,
    read: fs.readFile,
    write: fs.writeFile,
  });

  logger.info('Adblocker initialized successfully');
  return blocker;
}

export function getBlocker(): ElectronBlocker | null {
  return blocker;
}

/**
 * Enable cosmetic filtering (CSS injection, scriptlets) for a session.
 * This registers the preload script and IPC handlers used by the adblocker
 * for cosmetic filter injection. Does NOT register webRequest listeners —
 * those are managed by BrowserManager's composite handlers.
 */
export function enableCosmeticFiltering(session: Electron.Session): void {
  if (!blocker) return;

  const existing = cosmeticState.get(session);
  if (existing) return; // Already enabled

  try {
    // Resolve the preload script path
    const preloadPath = require.resolve('@ghostery/adblocker-electron-preload');

    const preloadScriptId = session.registerPreloadScript({
      type: 'frame',
      filePath: preloadPath,
    });

    // Register IPC handlers (global, not per-session)
    let ipcRegistered = false;
    try {
      ipcMain.handle(
        '@ghostery/adblocker/inject-cosmetic-filters',
        (blocker as any).onInjectCosmeticFilters.bind(blocker)
      );
      ipcMain.handle(
        '@ghostery/adblocker/is-mutation-observer-enabled',
        (blocker as any).onIsMutationObserverEnabled.bind(blocker)
      );
      ipcRegistered = true;
    } catch {
      // IPC handlers may already be registered from another session
      ipcRegistered = false;
    }

    cosmeticState.set(session, { preloadScriptId, ipcRegistered });
    logger.info('Cosmetic filtering enabled for session');
  } catch (error) {
    logger.warn('Failed to enable cosmetic filtering:', error);
  }
}

/**
 * Disable cosmetic filtering for a session.
 * Removes the preload script and IPC handlers.
 */
export function disableCosmeticFiltering(session: Electron.Session): void {
  const state = cosmeticState.get(session);
  if (!state) return;

  try {
    session.unregisterPreloadScript(state.preloadScriptId);
  } catch {
    // May already be unregistered
  }

  if (state.ipcRegistered) {
    try {
      ipcMain.removeHandler('@ghostery/adblocker/inject-cosmetic-filters');
      ipcMain.removeHandler('@ghostery/adblocker/is-mutation-observer-enabled');
    } catch {
      // May already be removed
    }
  }

  cosmeticState.delete(session);
  logger.info('Cosmetic filtering disabled for session');
}
