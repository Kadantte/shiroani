jest.mock('electron');
jest.mock('../../logger', () => ({
  createMainLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}));

const mockUpdater = {
  getUpdateChannel: jest.fn(),
  setUpdateChannel: jest.fn(),
  checkForUpdates: jest.fn(),
  downloadUpdate: jest.fn(),
  quitAndInstall: jest.fn(),
};
jest.mock('../../updater', () => mockUpdater);

import { ipcMain, BrowserWindow } from 'electron';
import { registerUpdaterHandlers, cleanupUpdaterHandlers } from '../updater';

describe('registerUpdaterHandlers', () => {
  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (ipcMain as any).__reset();
    Object.values(mockUpdater).forEach(fn => (fn as jest.Mock).mockReset());
    (BrowserWindow.getAllWindows as jest.Mock).mockReset();
    (BrowserWindow.getAllWindows as jest.Mock).mockReturnValue([]);
  });

  it('updater:get-channel returns the current channel', async () => {
    mockUpdater.getUpdateChannel.mockReturnValue('beta');
    registerUpdaterHandlers();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (ipcMain as any).__invoke('updater:get-channel');
    expect(mockUpdater.getUpdateChannel).toHaveBeenCalled();
    expect(result).toBe('beta');
  });

  it('updater:get-channel falls back to "stable" on error', async () => {
    mockUpdater.getUpdateChannel.mockImplementation(() => {
      throw new Error('boom');
    });
    registerUpdaterHandlers();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (ipcMain as any).__invoke('updater:get-channel');
    expect(result).toBe('stable');
  });

  it('updater:set-channel delegates and broadcasts', async () => {
    mockUpdater.setUpdateChannel.mockResolvedValue('beta');
    const win = new BrowserWindow();
    (BrowserWindow.getAllWindows as jest.Mock).mockReturnValue([win]);
    registerUpdaterHandlers();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (ipcMain as any).__invoke('updater:set-channel', 'beta');
    expect(mockUpdater.setUpdateChannel).toHaveBeenCalledWith('beta');
    expect(result).toBe('beta');
    expect(win.webContents.send).toHaveBeenCalledWith('updater:channel-changed', 'beta');
  });

  it('updater:set-channel BAD_REQUEST on unknown channel', async () => {
    registerUpdaterHandlers();
    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (ipcMain as any).__invoke('updater:set-channel', 'canary')
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });

  it('updater:check-for-updates delegates', async () => {
    mockUpdater.checkForUpdates.mockResolvedValue({ enabled: true, channel: 'stable' });
    registerUpdaterHandlers();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (ipcMain as any).__invoke('updater:check-for-updates');
    expect(mockUpdater.checkForUpdates).toHaveBeenCalled();
    expect(result).toEqual({ enabled: true, channel: 'stable' });
  });

  it('updater:start-download delegates to downloadUpdate', async () => {
    mockUpdater.downloadUpdate.mockResolvedValue(undefined);
    registerUpdaterHandlers();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (ipcMain as any).__invoke('updater:start-download');
    expect(mockUpdater.downloadUpdate).toHaveBeenCalled();
  });

  it('updater:install-now calls quitAndInstall', async () => {
    registerUpdaterHandlers();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (ipcMain as any).__invoke('updater:install-now');
    expect(mockUpdater.quitAndInstall).toHaveBeenCalled();
  });

  describe('cleanupUpdaterHandlers', () => {
    it('removes all updater handlers', () => {
      registerUpdaterHandlers();
      cleanupUpdaterHandlers();
      [
        'updater:check-for-updates',
        'updater:start-download',
        'updater:install-now',
        'updater:get-channel',
        'updater:set-channel',
      ].forEach(ch => {
        expect(ipcMain.removeHandler).toHaveBeenCalledWith(ch);
      });
    });
  });
});
