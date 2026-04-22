import { EventEmitter } from 'events';

class MockAutoUpdater extends EventEmitter {
  autoDownload = false;
  autoInstallOnAppQuit = true;
  allowPrerelease = false;
  allowDowngrade = false;
  channel: string | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  logger: any = null;

  checkForUpdates = jest.fn().mockResolvedValue(null);
  downloadUpdate = jest.fn().mockResolvedValue(null);
  quitAndInstall = jest.fn();
}

export const autoUpdater = new MockAutoUpdater();
