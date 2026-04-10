import { BrowserWindow, ipcMain } from 'electron';
import { createMainLogger } from '../logger';
import { Request } from '@ghostery/adblocker-electron';
import { BrowserManager } from '../browser/browser-manager';
import { getBlocker } from '../adblock';

const logger = createMainLogger('IPC:Browser');

/**
 * Domains that must always be allowed as popups (OAuth, auth flows, etc.).
 */
const POPUP_ALLOWLIST = new Set([
  'accounts.google.com',
  'myaccount.google.com',
  'appleid.apple.com',
  'login.microsoftonline.com',
  'github.com',
  'discord.com',
]);

/** Popup block mode: 'smart' uses blocker + origin heuristics, 'strict' blocks all cross-origin */
type PopupBlockMode = 'smart' | 'strict' | 'off';
let popupBlockMode: PopupBlockMode = 'smart';

export function getPopupBlockMode(): PopupBlockMode {
  return popupBlockMode;
}

export function setPopupBlockMode(mode: PopupBlockMode): void {
  popupBlockMode = mode;
  logger.info(`Popup block mode set to: ${mode}`);
}

/**
 * Check if a popup URL should be blocked.
 * Returns true if the popup should be blocked (not opened as a tab).
 */
function shouldBlockPopup(popupUrl: string, openerUrl: string): boolean {
  if (popupBlockMode === 'off') return false;

  let popupHostname: string;
  let openerHostname: string;
  try {
    popupHostname = new URL(popupUrl).hostname;
    openerHostname = new URL(openerUrl).hostname;
  } catch {
    return true; // Block malformed URLs
  }

  // Always allow same-origin popups
  if (popupHostname === openerHostname) return false;

  // Always allow auth/OAuth domains
  if (POPUP_ALLOWLIST.has(popupHostname)) return false;

  // Block about:blank popups (common ad launcher technique)
  if (popupUrl === 'about:blank') return true;

  if (popupBlockMode === 'strict') {
    // Strict mode: block all cross-origin popups not in the allowlist
    logger.debug(`Popup blocked (strict): ${popupUrl} from ${openerUrl}`);
    return true;
  }

  // Smart mode: check against adblocker filter lists
  const blocker = getBlocker();
  if (blocker) {
    const request = Request.fromRawDetails({
      url: popupUrl,
      sourceUrl: openerUrl,
      type: 'document',
    });
    const { match } = blocker.match(request);
    if (match) {
      logger.debug(`Popup blocked (adblock match): ${popupUrl} from ${openerUrl}`);
      return true;
    }
  }

  return false;
}

/**
 * Register browser IPC handlers.
 * Main process handles session-level concerns and window-level actions.
 */
export function registerBrowserHandlers(
  mainWindow: BrowserWindow,
  browserManager: BrowserManager
): void {
  // Toggle adblock (session-level, must stay in main process)
  ipcMain.handle('browser:toggle-adblock', async (_event, enabled: boolean) => {
    logger.debug(`browser:toggle-adblock invoked, enabled=${enabled}`);
    if (enabled) {
      await browserManager.enableAdblock();
    } else {
      await browserManager.disableAdblock();
    }
  });

  // Set fullscreen state — renderer calls this when webview enters/exits HTML5 fullscreen
  // because webview cannot directly control the BrowserWindow fullscreen state
  ipcMain.handle('browser:set-fullscreen', (_event, isFullscreen: boolean) => {
    logger.debug(`browser:set-fullscreen invoked, isFullscreen=${isFullscreen}`);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setFullScreen(isFullscreen);
    }
  });

  // Popup block mode IPC
  ipcMain.handle('browser:get-popup-block-mode', () => {
    return popupBlockMode;
  });

  ipcMain.handle('browser:set-popup-block-mode', (_event, mode: string) => {
    if (mode === 'smart' || mode === 'strict' || mode === 'off') {
      setPopupBlockMode(mode);
    }
  });

  // Intercept window.open calls from webview guest pages.
  // Since the `new-window` event was removed in Electron 22, we must use
  // `did-attach-webview` to access each webview's webContents and set up
  // the window open handler from the main process side.
  mainWindow.webContents.on('did-attach-webview', (_event, webContents) => {
    webContents.setWindowOpenHandler(({ url }) => {
      if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
        const openerUrl = webContents.getURL();

        if (shouldBlockPopup(url, openerUrl)) {
          logger.debug(`Popup denied: ${url}`);
          return { action: 'deny' };
        }

        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('browser:new-window-request', url);
        }
      }
      return { action: 'deny' };
    });

    // Intercept keyboard shortcuts while webview has focus.
    // Key events inside a <webview> don't bubble to the renderer's window,
    // so we catch them here and forward to the renderer via IPC.
    webContents.on('before-input-event', (event, input) => {
      if (mainWindow.isDestroyed() || input.type !== 'keyDown') return;
      const ctrl = input.control || input.meta;

      // Ctrl+key shortcuts
      if (ctrl) {
        switch (input.key) {
          case 'w':
          case 't':
          case 'l':
          case 'r':
          case 'Tab':
            event.preventDefault();
            mainWindow.webContents.send('browser:shortcut', {
              key: input.key,
              ctrl: true,
              shift: input.shift,
            });
            return;
        }
      }

      // Alt+Arrow navigation
      if (input.alt && !ctrl) {
        if (input.key === 'ArrowLeft' || input.key === 'ArrowRight') {
          event.preventDefault();
          mainWindow.webContents.send('browser:shortcut', {
            key: input.key,
            alt: true,
          });
        }
      }
    });
  });
}

/**
 * Clean up browser IPC handlers
 */
export function cleanupBrowserHandlers(): void {
  ipcMain.removeHandler('browser:toggle-adblock');
  ipcMain.removeHandler('browser:set-fullscreen');
  ipcMain.removeHandler('browser:get-popup-block-mode');
  ipcMain.removeHandler('browser:set-popup-block-mode');
}
