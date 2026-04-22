jest.mock('electron');
jest.mock('../../logger', () => ({
  createMainLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}));

import { ipcMain, BrowserWindow } from 'electron';
import {
  registerBrowserHandlers,
  cleanupBrowserHandlers,
  getPopupBlockEnabled,
  setPopupBlockEnabled,
} from '../browser';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const makeBrowserManagerStub = (overrides: Partial<any> = {}) => ({
  enableAdblock: jest.fn().mockResolvedValue(undefined),
  disableAdblock: jest.fn().mockResolvedValue(undefined),
  setAdblockWhitelist: jest.fn(),
  isAdblockEnabled: jest.fn(() => false),
  ...overrides,
});

describe('registerBrowserHandlers', () => {
  let win: InstanceType<typeof BrowserWindow>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let browserManager: any;

  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (ipcMain as any).__reset();
    win = new BrowserWindow();
    browserManager = makeBrowserManagerStub();
    // Reset popup block to default (true) between tests
    setPopupBlockEnabled(true);
  });

  describe('browser:toggle-adblock', () => {
    it('enables adblock when arg is true', async () => {
      registerBrowserHandlers(win, browserManager);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (ipcMain as any).__invoke('browser:toggle-adblock', true);
      expect(browserManager.enableAdblock).toHaveBeenCalled();
      expect(browserManager.disableAdblock).not.toHaveBeenCalled();
    });

    it('disables adblock when arg is false', async () => {
      registerBrowserHandlers(win, browserManager);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (ipcMain as any).__invoke('browser:toggle-adblock', false);
      expect(browserManager.disableAdblock).toHaveBeenCalled();
      expect(browserManager.enableAdblock).not.toHaveBeenCalled();
    });

    it('BAD_REQUEST on non-boolean', async () => {
      registerBrowserHandlers(win, browserManager);
      await expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (ipcMain as any).__invoke('browser:toggle-adblock', 'yes')
      ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    });
  });

  describe('browser:set-fullscreen', () => {
    it('calls win.setFullScreen', async () => {
      registerBrowserHandlers(win, browserManager);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (ipcMain as any).__invoke('browser:set-fullscreen', true);
      expect(win.setFullScreen).toHaveBeenCalledWith(true);
    });

    it('no-ops on destroyed window', async () => {
      win.isDestroyed = jest.fn(() => true);
      registerBrowserHandlers(win, browserManager);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (ipcMain as any).__invoke('browser:set-fullscreen', true);
      expect(win.setFullScreen).not.toHaveBeenCalled();
    });
  });

  describe('browser:get-popup-block-enabled', () => {
    it('returns current popup block state', async () => {
      setPopupBlockEnabled(false);
      registerBrowserHandlers(win, browserManager);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (ipcMain as any).__invoke('browser:get-popup-block-enabled');
      expect(result).toBe(false);
    });
  });

  describe('browser:set-popup-block-enabled', () => {
    it('updates the popup block state', async () => {
      registerBrowserHandlers(win, browserManager);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (ipcMain as any).__invoke('browser:set-popup-block-enabled', false);
      expect(getPopupBlockEnabled()).toBe(false);
    });
  });

  describe('browser:set-adblock-whitelist', () => {
    it('forwards cleaned host list to browser manager', async () => {
      registerBrowserHandlers(win, browserManager);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (ipcMain as any).__invoke('browser:set-adblock-whitelist', [
        'example.com',
        '  trimmed.io  ',
      ]);
      expect(browserManager.setAdblockWhitelist).toHaveBeenCalledWith([
        'example.com',
        'trimmed.io',
      ]);
    });

    it('ignores non-array payloads', async () => {
      registerBrowserHandlers(win, browserManager);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (ipcMain as any).__invoke('browser:set-adblock-whitelist', 'not-an-array');
      expect(browserManager.setAdblockWhitelist).not.toHaveBeenCalled();
    });

    it('filters out non-string entries', async () => {
      registerBrowserHandlers(win, browserManager);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (ipcMain as any).__invoke('browser:set-adblock-whitelist', [
        'ok.com',
        123,
        null,
        'also-ok.com',
      ]);
      expect(browserManager.setAdblockWhitelist).toHaveBeenCalledWith(['ok.com', 'also-ok.com']);
    });
  });

  describe('cleanupBrowserHandlers', () => {
    it('removes all browser handlers', () => {
      registerBrowserHandlers(win, browserManager);
      cleanupBrowserHandlers();
      [
        'browser:toggle-adblock',
        'browser:set-fullscreen',
        'browser:get-popup-block-enabled',
        'browser:set-popup-block-enabled',
        'browser:set-adblock-whitelist',
      ].forEach(ch => {
        expect(ipcMain.removeHandler).toHaveBeenCalledWith(ch);
      });
    });
  });
});
