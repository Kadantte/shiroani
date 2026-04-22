import { BrowserWindow, ipcMain } from 'electron';
import {
  checkForUpdates,
  downloadUpdate,
  quitAndInstall,
  getUpdateChannel,
  setUpdateChannel,
} from '../updater';
import { handle, handleWithFallback } from './with-ipc-handler';
import {
  updaterCheckForUpdatesSchema,
  updaterStartDownloadSchema,
  updaterInstallNowSchema,
  updaterGetChannelSchema,
  updaterSetChannelSchema,
} from './schemas';

/**
 * Register updater IPC handlers
 */
export function registerUpdaterHandlers(): void {
  handle(
    'updater:check-for-updates',
    async () => {
      return await checkForUpdates();
    },
    { schema: updaterCheckForUpdatesSchema }
  );

  handle(
    'updater:start-download',
    async () => {
      await downloadUpdate();
    },
    { schema: updaterStartDownloadSchema }
  );

  handle(
    'updater:install-now',
    async () => {
      quitAndInstall();
    },
    { schema: updaterInstallNowSchema }
  );

  handleWithFallback(
    'updater:get-channel',
    () => {
      return getUpdateChannel();
    },
    () => 'stable' as const,
    { schema: updaterGetChannelSchema }
  );

  handle(
    'updater:set-channel',
    async (_event, channel) => {
      const result = await setUpdateChannel(channel);
      // Broadcast to all windows
      for (const win of BrowserWindow.getAllWindows()) {
        win.webContents.send('updater:channel-changed', result);
      }
      return result;
    },
    { schema: updaterSetChannelSchema }
  );
}

/**
 * Clean up updater IPC handlers
 */
export function cleanupUpdaterHandlers(): void {
  ipcMain.removeHandler('updater:check-for-updates');
  ipcMain.removeHandler('updater:start-download');
  ipcMain.removeHandler('updater:install-now');
  ipcMain.removeHandler('updater:get-channel');
  ipcMain.removeHandler('updater:set-channel');
}
