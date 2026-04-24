import { ElectronBlocker } from '@ghostery/adblocker-electron';
import { app, ipcMain, type IpcMainInvokeEvent } from 'electron';
import fetch from 'cross-fetch';
import { promises as fs } from 'fs';
import { join } from 'path';
import { createMainLogger } from './logging/logger';

const logger = createMainLogger('Adblock');

// Live uBO filter list URLs. quick-fixes.txt has an 8h TTL upstream — the
// primary reason we refresh on a schedule instead of shipping a prebuilt
// snapshot.
const FILTER_LIST_URLS = [
  'https://ublockorigin.github.io/uAssets/filters/filters.txt',
  'https://ublockorigin.github.io/uAssets/filters/badware.txt',
  'https://ublockorigin.github.io/uAssets/filters/privacy.txt',
  'https://ublockorigin.github.io/uAssets/filters/resource-abuse.txt',
  'https://ublockorigin.github.io/uAssets/filters/unbreak.txt',
  'https://ublockorigin.github.io/uAssets/filters/quick-fixes.txt',
  'https://easylist.to/easylist/easylist.txt',
  'https://easylist.to/easylist/easyprivacy.txt',
];

// Bumped when the filter set or engine config changes to invalidate stale
// on-disk serialized engines. v3 = enabled guessRequestTypeFromUrl +
// loadExtendedSelectors.
const CACHE_FILENAME = 'adblock-engine-v3.bin';

// quick-fixes.txt has an 8h TTL but often sees 2–4h updates during active
// YouTube breakage — refresh every 2h to stay close to upstream.
const REFRESH_INTERVAL_MS = 2 * 60 * 60 * 1000;

// Abort live fetches that take too long so the fallback runs promptly.
const FETCH_TIMEOUT_MS = 20_000;

const ENGINE_CONFIG = {
  // Re-classify requests tagged `other` when the URL hints at the real type.
  // Fixes YouTube's `/youtubei/v1/player` XHRs missing `$xhr`-tagged filters.
  guessRequestTypeFromUrl: true,
  // Enable uBO's procedural selectors (`:has-text()`, `:has()`, `:xpath()`,
  // etc.). uBO uses these heavily for YouTube ad containers.
  loadExtendedSelectors: true,
};

/** Watch these hostnames for blocked requests / injected scriptlets. */
const OBSERVABILITY_HOST_NEEDLES = [
  'youtube.com',
  'youtu.be',
  'googlevideo.com',
  'googleads',
  'doubleclick',
];

type CosmeticIpc = {
  onInjectCosmeticFilters(event: IpcMainInvokeEvent, url: string, msg: unknown): unknown;
  onIsMutationObserverEnabled(event: IpcMainInvokeEvent): boolean;
};

let blocker: ElectronBlocker | null = null;
let refreshTimer: NodeJS.Timeout | null = null;
let isRefreshing = false;

/** Track cosmetic filtering state per session to avoid double-registration */
const cosmeticState = new WeakMap<
  Electron.Session,
  { preloadScriptId: string; injectRegistered: boolean; mutationRegistered: boolean }
>();

function getCaching() {
  return {
    path: join(app.getPath('userData'), CACHE_FILENAME),
    read: fs.readFile,
    write: fs.writeFile,
  };
}

/** fetch wrapper that aborts after FETCH_TIMEOUT_MS so slow upstreams don't hang init */
function fetchWithTimeout(input: RequestInfo, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  return fetch(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer));
}

async function buildBlockerFromLiveLists(bypassCache = false): Promise<ElectronBlocker> {
  const caching = getCaching();
  // During scheduled refreshes we bypass the read side so fromLists always
  // fetches fresh filter lists instead of returning the stale on-disk binary.
  const effectiveCaching = bypassCache
    ? { ...caching, read: () => Promise.reject(new Error('cache bypass')) }
    : caching;
  return ElectronBlocker.fromLists(
    fetchWithTimeout,
    FILTER_LIST_URLS,
    ENGINE_CONFIG,
    effectiveCaching
  );
}

async function buildBlockerFromPrebuilt(): Promise<ElectronBlocker> {
  // NB: fromPrebuiltFull doesn't accept a Config (baked into the prebuilt
  // binary). The fallback therefore uses the library defaults — acceptable
  // because this path only runs when live fetch fails on a cold start.
  return ElectronBlocker.fromPrebuiltFull(fetchWithTimeout, getCaching());
}

export async function initializeAdblock(): Promise<ElectronBlocker> {
  logger.info('Initializing adblocker...');

  let next: ElectronBlocker;
  try {
    next = await buildBlockerFromLiveLists();
    logger.info(`Adblocker initialized from ${FILTER_LIST_URLS.length} live filter list(s)`);
  } catch (error) {
    logger.warn(
      'Failed to initialize from live filter lists; falling back to prebuilt snapshot:',
      error
    );
    next = await buildBlockerFromPrebuilt();
    logger.info('Adblocker initialized from prebuilt snapshot (fallback)');
  }

  blocker = next;
  attachObservability(blocker);
  scheduleListRefresh();
  return blocker;
}

/**
 * Subscribe to engine events for a subset of ad-heavy hostnames so we can
 * see in logs which requests are being blocked and which scriptlets are
 * firing. Gated to watched hosts to avoid log spam.
 */
function attachObservability(engine: ElectronBlocker): void {
  const isWatched = (url: string): boolean =>
    OBSERVABILITY_HOST_NEEDLES.some(needle => url.includes(needle));

  engine.on('request-blocked', request => {
    if (isWatched(request.url)) {
      logger.debug(`[blocked] ${request.url}`);
    }
  });
  engine.on('request-redirected', request => {
    if (isWatched(request.url)) {
      logger.debug(`[redirected] ${request.url}`);
    }
  });
  engine.on('script-injected', (_script, url) => {
    if (isWatched(url)) {
      logger.debug(`[scriptlet] ${url}`);
    }
  });
}

function scheduleListRefresh(): void {
  if (refreshTimer) return;
  refreshTimer = setInterval(() => {
    void refreshFilterLists();
  }, REFRESH_INTERVAL_MS);
  // Don't keep the Node event loop alive just for the refresh timer.
  refreshTimer.unref();
}

async function refreshFilterLists(): Promise<void> {
  if (isRefreshing) return;
  isRefreshing = true;
  try {
    logger.info('Refreshing filter lists...');
    const next = await buildBlockerFromLiveLists(true);
    blocker = next;
    attachObservability(next);
    logger.info('Filter lists refreshed successfully');
  } catch (err) {
    logger.warn('Filter list refresh failed (will retry next interval):', err);
  } finally {
    isRefreshing = false;
  }
}

export function getBlocker(): ElectronBlocker | null {
  return blocker;
}

/** Shut down the filter-list refresh timer. Idempotent. */
export function shutdownAdblock(): void {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
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

    // Register IPC handlers (global, not per-session).
    // We proxy through the module-level `blocker` so that periodic list
    // refreshes (which replace the instance) are picked up automatically.
    // Each handler is registered independently so a failure on one doesn't
    // leave the other's cleanup state misreported.
    let injectRegistered = false;
    let mutationRegistered = false;

    try {
      ipcMain.handle('@ghostery/adblocker/inject-cosmetic-filters', (event, url, msg) =>
        blocker
          ? (blocker as unknown as CosmeticIpc).onInjectCosmeticFilters(event, url, msg)
          : undefined
      );
      injectRegistered = true;
    } catch {
      // IPC handler may already be registered from another session
    }

    try {
      ipcMain.handle('@ghostery/adblocker/is-mutation-observer-enabled', event =>
        blocker ? (blocker as unknown as CosmeticIpc).onIsMutationObserverEnabled(event) : false
      );
      mutationRegistered = true;
    } catch {
      // IPC handler may already be registered from another session
    }

    cosmeticState.set(session, { preloadScriptId, injectRegistered, mutationRegistered });
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

  if (state.injectRegistered) {
    try {
      ipcMain.removeHandler('@ghostery/adblocker/inject-cosmetic-filters');
    } catch {
      // May already be removed
    }
  }

  if (state.mutationRegistered) {
    try {
      ipcMain.removeHandler('@ghostery/adblocker/is-mutation-observer-enabled');
    } catch {
      // May already be removed
    }
  }

  cosmeticState.delete(session);
  logger.info('Cosmetic filtering disabled for session');
}
