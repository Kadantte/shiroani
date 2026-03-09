import { BrowserWindow, ipcMain } from 'electron';
import { createLogger } from '@shiroani/shared';
import { BrowserManager } from '../browser/browser-manager';

const logger = createLogger('IPC:Browser');

let browserManagerRef: BrowserManager | null = null;

/**
 * Register browser IPC handlers for WebContentsView tab management.
 * Delegates all operations to the BrowserManager instance.
 */
export function registerBrowserHandlers(
  _mainWindow: BrowserWindow,
  browserManager: BrowserManager
): void {
  browserManagerRef = browserManager;

  ipcMain.handle('browser:create-tab', (_event, url?: string) => {
    logger.debug(`browser:create-tab invoked, url="${url ?? ''}"`);
    const tabId = browserManager.createTab(url);
    return tabId;
  });

  ipcMain.handle('browser:close-tab', (_event, tabId: string) => {
    logger.debug(`browser:close-tab invoked for "${tabId}"`);
    browserManager.closeTab(tabId);
  });

  ipcMain.handle('browser:switch-tab', (_event, tabId: string) => {
    logger.debug(`browser:switch-tab invoked for "${tabId}"`);
    browserManager.switchTab(tabId);
  });

  ipcMain.handle('browser:navigate', (_event, tabId: string, url: string) => {
    logger.debug(`browser:navigate invoked for tab="${tabId}" url="${url}"`);
    browserManager.navigate(tabId, url);
  });

  ipcMain.handle('browser:go-back', (_event, tabId: string) => {
    logger.debug(`browser:go-back invoked for "${tabId}"`);
    browserManager.goBack(tabId);
  });

  ipcMain.handle('browser:go-forward', (_event, tabId: string) => {
    logger.debug(`browser:go-forward invoked for "${tabId}"`);
    browserManager.goForward(tabId);
  });

  ipcMain.handle('browser:refresh', (_event, tabId: string) => {
    logger.debug(`browser:refresh invoked for "${tabId}"`);
    browserManager.refresh(tabId);
  });

  ipcMain.handle('browser:get-tabs', () => {
    logger.debug('browser:get-tabs invoked');
    return browserManager.getAllTabs();
  });

  ipcMain.handle('browser:get-active-tab', () => {
    logger.debug('browser:get-active-tab invoked');
    return browserManager.getActiveTabId();
  });

  ipcMain.handle('browser:toggle-adblock', async (_event, enabled: boolean) => {
    logger.debug(`browser:toggle-adblock invoked, enabled=${enabled}`);
    if (enabled) {
      await browserManager.enableAdblock();
    } else {
      await browserManager.disableAdblock();
    }
  });

  ipcMain.handle(
    'browser:resize',
    (_event, bounds: { x: number; y: number; width: number; height: number }) => {
      browserManager.resizeActiveTab(bounds);
    }
  );

  ipcMain.handle('browser:execute-script', (_event, tabId: string, script: string) => {
    logger.debug(`browser:execute-script invoked for tab="${tabId}"`);
    return browserManager.executeScript(tabId, script);
  });

  ipcMain.handle('browser:hide', () => {
    browserManager.hideAllViews();
  });

  ipcMain.handle('browser:show', () => {
    browserManager.showActiveView();
  });
}

/**
 * Clean up browser IPC handlers
 */
export function cleanupBrowserHandlers(): void {
  ipcMain.removeHandler('browser:create-tab');
  ipcMain.removeHandler('browser:close-tab');
  ipcMain.removeHandler('browser:switch-tab');
  ipcMain.removeHandler('browser:navigate');
  ipcMain.removeHandler('browser:go-back');
  ipcMain.removeHandler('browser:go-forward');
  ipcMain.removeHandler('browser:refresh');
  ipcMain.removeHandler('browser:get-tabs');
  ipcMain.removeHandler('browser:get-active-tab');
  ipcMain.removeHandler('browser:toggle-adblock');
  ipcMain.removeHandler('browser:resize');
  ipcMain.removeHandler('browser:execute-script');
  ipcMain.removeHandler('browser:hide');
  ipcMain.removeHandler('browser:show');

  if (browserManagerRef) {
    browserManagerRef.destroy();
    browserManagerRef = null;
  }
}
