import { ElectronBlocker } from '@ghostery/adblocker-electron';
import fetch from 'cross-fetch';
import { promises as fs } from 'fs';
import { app } from 'electron';
import { join } from 'path';
import { createLogger } from '@shiroani/shared';

const logger = createLogger('Adblock');

let blocker: ElectronBlocker | null = null;

export async function initializeAdblock(): Promise<ElectronBlocker> {
  const cachePath = join(app.getPath('userData'), 'adblock-engine.bin');

  logger.info('Initializing adblocker...');

  blocker = await ElectronBlocker.fromPrebuiltAdsAndTracking(fetch, {
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

export function enableBlockingInSession(session: Electron.Session): void {
  if (blocker) {
    blocker.enableBlockingInSession(session);
    logger.info('Adblocking enabled for session');
  }
}

export function disableBlockingInSession(session: Electron.Session): void {
  if (blocker) {
    blocker.disableBlockingInSession(session);
    logger.info('Adblocking disabled for session');
  }
}
