import { BrowserWindow, ipcMain } from 'electron';
import { createLogger } from '@shiroani/shared';
import { BrowserManager } from '../browser/browser-manager';

const logger = createLogger('IPC:Browser');

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

  // Intercept window.open calls from webview guest pages.
  // Since the `new-window` event was removed in Electron 22, we must use
  // `did-attach-webview` to access each webview's webContents and set up
  // the window open handler from the main process side.
  mainWindow.webContents.on('did-attach-webview', (_event, webContents) => {
    webContents.setWindowOpenHandler(({ url }) => {
      // Send the URL to the renderer so it can open it as a new tab
      if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('browser:new-window-request', url);
        }
      }
      return { action: 'deny' };
    });
  });
}

/**
 * Clean up browser IPC handlers
 */
export function cleanupBrowserHandlers(): void {
  ipcMain.removeHandler('browser:toggle-adblock');
  ipcMain.removeHandler('browser:set-fullscreen');
}
