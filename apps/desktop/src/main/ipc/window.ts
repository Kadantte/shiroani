import { BrowserWindow, ipcMain } from 'electron';
import { createMainLogger } from '../logger';
import { handle, on } from './with-ipc-handler';
import {
  windowMinimizeSchema,
  windowMaximizeSchema,
  windowCloseSchema,
  windowIsMaximizedSchema,
  windowOpenDevtoolsSchema,
} from './schemas';

const logger = createMainLogger('IPC:Window');

/**
 * Register window control IPC handlers
 */
export function registerWindowHandlers(mainWindow: BrowserWindow): void {
  logger.debug('registering window handlers');

  on(
    'window:minimize',
    () => {
      mainWindow.minimize();
    },
    { schema: windowMinimizeSchema }
  );

  on(
    'window:maximize',
    () => {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
    },
    { schema: windowMaximizeSchema }
  );

  on(
    'window:close',
    () => {
      mainWindow.close();
    },
    { schema: windowCloseSchema }
  );

  handle(
    'window:is-maximized',
    () => {
      return mainWindow.isMaximized();
    },
    { schema: windowIsMaximizedSchema }
  );

  handle(
    'window:open-devtools',
    () => {
      if (mainWindow.isDestroyed()) return;
      const wc = mainWindow.webContents;
      if (wc.isDevToolsOpened()) {
        wc.devToolsWebContents?.focus();
        return;
      }
      wc.openDevTools({ mode: 'detach' });
    },
    { schema: windowOpenDevtoolsSchema }
  );

  // Forward window state changes to renderer
  mainWindow.on('maximize', () => {
    mainWindow.webContents.send('window:maximized-change', true);
  });

  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.send('window:maximized-change', false);
  });
}

/**
 * Clean up window control IPC handlers
 */
export function cleanupWindowHandlers(): void {
  ipcMain.removeAllListeners('window:minimize');
  ipcMain.removeAllListeners('window:maximize');
  ipcMain.removeAllListeners('window:close');
  ipcMain.removeHandler('window:is-maximized');
  ipcMain.removeHandler('window:open-devtools');

  // Note: Window event listeners are cleaned up when window is destroyed
}
