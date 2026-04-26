jest.mock('electron');
jest.mock('../../logging/logger', () => ({
  createMainLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}));

const mockTracker = {
  getSnapshot: jest.fn(),
  setWatchingAnime: jest.fn(),
  reset: jest.fn(),
};
jest.mock('../../stats/app-stats-tracker', () => ({ appStatsTracker: mockTracker }));

import { ipcMain } from 'electron';
import { registerAppStatsHandlers, cleanupAppStatsHandlers } from '../app-stats';

describe('registerAppStatsHandlers', () => {
  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (ipcMain as any).__reset();
    Object.values(mockTracker).forEach(fn => (fn as jest.Mock).mockReset());
  });

  it('app-stats:get-snapshot returns the tracker snapshot', async () => {
    const snap = { version: 1, totals: { appOpenSeconds: 42 } };
    mockTracker.getSnapshot.mockReturnValue(snap);
    registerAppStatsHandlers();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (ipcMain as any).__invoke('app-stats:get-snapshot');
    expect(mockTracker.getSnapshot).toHaveBeenCalled();
    expect(result).toEqual(snap);
  });

  it('app-stats:set-watching-anime forwards boolean', async () => {
    registerAppStatsHandlers();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (ipcMain as any).__invoke('app-stats:set-watching-anime', true);
    expect(mockTracker.setWatchingAnime).toHaveBeenCalledWith(true);
  });

  it('app-stats:set-watching-anime swallows tracker errors (fallback)', async () => {
    mockTracker.setWatchingAnime.mockImplementation(() => {
      throw new Error('boom');
    });
    registerAppStatsHandlers();
    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (ipcMain as any).__invoke('app-stats:set-watching-anime', false)
    ).resolves.toBeUndefined();
  });

  it('app-stats:set-watching-anime rejects non-boolean payload', async () => {
    registerAppStatsHandlers();
    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (ipcMain as any).__invoke('app-stats:set-watching-anime', 'yes')
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });

  it('app-stats:reset returns the fresh snapshot', async () => {
    const fresh = { version: 1, totals: { appOpenSeconds: 0 } };
    mockTracker.reset.mockReturnValue(fresh);
    registerAppStatsHandlers();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (ipcMain as any).__invoke('app-stats:reset');
    expect(mockTracker.reset).toHaveBeenCalled();
    expect(result).toEqual(fresh);
  });

  describe('cleanupAppStatsHandlers', () => {
    it('removes all app-stats handlers', () => {
      registerAppStatsHandlers();
      cleanupAppStatsHandlers();
      ['app-stats:get-snapshot', 'app-stats:set-watching-anime', 'app-stats:reset'].forEach(ch => {
        expect(ipcMain.removeHandler).toHaveBeenCalledWith(ch);
      });
    });
  });
});
