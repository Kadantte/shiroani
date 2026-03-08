import { BrowserWindow } from 'electron';
import {
  registerWindowHandlers,
  cleanupWindowHandlers,
  registerDialogHandlers,
  cleanupDialogHandlers,
  registerStoreHandlers,
  cleanupStoreHandlers,
  registerAppHandlers,
  cleanupAppHandlers,
  registerUpdaterHandlers,
  cleanupUpdaterHandlers,
  registerBrowserHandlers,
  cleanupBrowserHandlers,
} from './ipc';
import { BrowserManager } from './browser-manager';

/**
 * Register all IPC handlers for the application
 */
export function registerIpcHandlers(
  mainWindow: BrowserWindow,
  browserManager: BrowserManager
): void {
  registerWindowHandlers(mainWindow);
  registerDialogHandlers(mainWindow);
  registerStoreHandlers();
  registerAppHandlers();
  registerUpdaterHandlers();
  registerBrowserHandlers(mainWindow, browserManager);
}

/**
 * Clean up IPC handlers (call on app quit)
 */
export function cleanupIpcHandlers(): void {
  cleanupWindowHandlers();
  cleanupDialogHandlers();
  cleanupStoreHandlers();
  cleanupAppHandlers();
  cleanupUpdaterHandlers();
  cleanupBrowserHandlers();
}
