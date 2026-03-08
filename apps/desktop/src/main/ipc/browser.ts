import { BrowserWindow, ipcMain } from 'electron';
import { createLogger } from '@shiroani/shared';

const logger = createLogger('IPC:Browser');

// TODO: Import adblock utilities
// import { enableBlockingInSession, disableBlockingInSession, getBlocker } from '../adblock';

/**
 * Browser tab IPC handlers for WebContentsView management.
 *
 * These handlers manage embedded browser tabs (WebContentsView instances)
 * for streaming anime content within the app.
 *
 * TODO: Implementation details:
 * - Each tab is a WebContentsView attached to the main BrowserWindow
 * - Tabs are tracked in a Map<string, WebContentsView> by tabId (UUID)
 * - Navigation events (did-navigate, page-title-updated, did-start-loading, did-stop-loading)
 *   are forwarded to the renderer via IPC
 * - Adblock can be enabled/disabled per-session using @ghostery/adblocker-electron
 */

/**
 * Register browser IPC handlers for WebContentsView tab management
 */
export function registerBrowserHandlers(_mainWindow: BrowserWindow): void {
  // TODO: Initialize tab tracking map
  // const tabs = new Map<string, WebContentsView>();

  ipcMain.handle('browser:open-tab', async (_event, url: string) => {
    logger.debug(`browser:open-tab invoked for "${url}"`);
    // TODO: Implement tab creation
    // 1. Create a new WebContentsView
    // 2. Set its bounds to fill the browser area of the window
    // 3. Load the URL
    // 4. Register navigation event listeners (did-navigate, page-title-updated, etc.)
    // 5. Forward events to renderer via mainWindow.webContents.send()
    // 6. Enable adblock on the view's session if adblock is active
    // 7. Return the tabId
    const tabId = crypto.randomUUID();
    return { tabId };
  });

  ipcMain.handle('browser:close-tab', async (_event, tabId: string) => {
    logger.debug(`browser:close-tab invoked for "${tabId}"`);
    // TODO: Implement tab destruction
    // 1. Get the WebContentsView from the tabs map
    // 2. Remove navigation event listeners
    // 3. Remove the view from the main window
    // 4. Destroy the web contents
    // 5. Delete from the tabs map
  });

  ipcMain.handle('browser:navigate', async (_event, tabId: string, url: string) => {
    logger.debug(`browser:navigate invoked for tab="${tabId}" url="${url}"`);
    // TODO: Implement navigation
    // 1. Get the WebContentsView from the tabs map
    // 2. Validate the URL (must be http/https)
    // 3. Call view.webContents.loadURL(url)
  });

  ipcMain.handle('browser:go-back', async (_event, tabId: string) => {
    logger.debug(`browser:go-back invoked for "${tabId}"`);
    // TODO: Implement back navigation
    // 1. Get the WebContentsView from the tabs map
    // 2. Call view.webContents.goBack()
  });

  ipcMain.handle('browser:go-forward', async (_event, tabId: string) => {
    logger.debug(`browser:go-forward invoked for "${tabId}"`);
    // TODO: Implement forward navigation
    // 1. Get the WebContentsView from the tabs map
    // 2. Call view.webContents.goForward()
  });

  ipcMain.handle('browser:refresh', async (_event, tabId: string) => {
    logger.debug(`browser:refresh invoked for "${tabId}"`);
    // TODO: Implement refresh
    // 1. Get the WebContentsView from the tabs map
    // 2. Call view.webContents.reload()
  });

  ipcMain.handle('browser:toggle-adblock', async (_event, enabled: boolean) => {
    logger.debug(`browser:toggle-adblock invoked, enabled=${enabled}`);
    // TODO: Implement adblock toggle
    // 1. If enabled, call enableBlockingInSession() for all active tab sessions
    // 2. If disabled, call disableBlockingInSession() for all active tab sessions
    // 3. Store preference so new tabs get the correct setting
  });
}

/**
 * Clean up browser IPC handlers
 */
export function cleanupBrowserHandlers(): void {
  ipcMain.removeHandler('browser:open-tab');
  ipcMain.removeHandler('browser:close-tab');
  ipcMain.removeHandler('browser:navigate');
  ipcMain.removeHandler('browser:go-back');
  ipcMain.removeHandler('browser:go-forward');
  ipcMain.removeHandler('browser:refresh');
  ipcMain.removeHandler('browser:toggle-adblock');

  // TODO: Destroy all active WebContentsView instances
  // for (const [_id, view] of tabs) {
  //   view.webContents.close();
  // }
  // tabs.clear();
}
