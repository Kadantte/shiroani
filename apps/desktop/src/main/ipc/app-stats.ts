import { ipcMain } from 'electron';
import { appStatsTracker } from '../stats/app-stats-tracker';
import { handle, handleWithFallback } from './with-ipc-handler';
import {
  appStatsGetSnapshotSchema,
  appStatsResetSchema,
  appStatsSetWatchingAnimeSchema,
} from './schemas';

/**
 * Register IPC handlers for the local "time spent in ShiroAni" tracker.
 */
export function registerAppStatsHandlers(): void {
  handle(
    'app-stats:get-snapshot',
    () => {
      return appStatsTracker.getSnapshot();
    },
    { schema: appStatsGetSnapshotSchema }
  );

  handleWithFallback(
    'app-stats:set-watching-anime',
    (_event, watching) => {
      appStatsTracker.setWatchingAnime(watching);
    },
    () => undefined,
    { schema: appStatsSetWatchingAnimeSchema }
  );

  handle(
    'app-stats:reset',
    () => {
      return appStatsTracker.reset();
    },
    { schema: appStatsResetSchema }
  );
}

/**
 * Clean up app-stats IPC handlers
 */
export function cleanupAppStatsHandlers(): void {
  ipcMain.removeHandler('app-stats:get-snapshot');
  ipcMain.removeHandler('app-stats:set-watching-anime');
  ipcMain.removeHandler('app-stats:reset');
}
