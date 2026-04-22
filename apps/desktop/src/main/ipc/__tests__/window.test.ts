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
import { registerWindowHandlers, cleanupWindowHandlers } from '../window';

describe('registerWindowHandlers', () => {
  let win: InstanceType<typeof BrowserWindow>;

  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (ipcMain as any).__reset();
    win = new BrowserWindow();
  });

  it('window:is-maximized returns false when not maximized', async () => {
    registerWindowHandlers(win);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (ipcMain as any).__invoke('window:is-maximized');
    expect(result).toBe(false);
  });

  it('window:is-maximized returns true when maximized', async () => {
    win.isMaximized = jest.fn(() => true);
    registerWindowHandlers(win);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (ipcMain as any).__invoke('window:is-maximized');
    expect(result).toBe(true);
  });

  it('window:minimize calls win.minimize()', () => {
    registerWindowHandlers(win);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (ipcMain as any).__send('window:minimize');
    expect(win.minimize).toHaveBeenCalled();
  });

  it('window:maximize calls win.maximize() when not maximized', () => {
    win.isMaximized = jest.fn(() => false);
    registerWindowHandlers(win);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (ipcMain as any).__send('window:maximize');
    expect(win.maximize).toHaveBeenCalled();
    expect(win.unmaximize).not.toHaveBeenCalled();
  });

  it('window:maximize calls win.unmaximize() when already maximized', () => {
    win.isMaximized = jest.fn(() => true);
    registerWindowHandlers(win);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (ipcMain as any).__send('window:maximize');
    expect(win.unmaximize).toHaveBeenCalled();
    expect(win.maximize).not.toHaveBeenCalled();
  });

  it('window:close calls win.close()', () => {
    registerWindowHandlers(win);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (ipcMain as any).__send('window:close');
    expect(win.close).toHaveBeenCalled();
  });

  it('window:open-devtools opens devtools when not already open', async () => {
    registerWindowHandlers(win);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (ipcMain as any).__invoke('window:open-devtools');
    expect(win.webContents.openDevTools).toHaveBeenCalledWith({ mode: 'detach' });
  });

  it('window:open-devtools is a no-op on destroyed windows', async () => {
    win.isDestroyed = jest.fn(() => true);
    registerWindowHandlers(win);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (ipcMain as any).__invoke('window:open-devtools');
    expect(win.webContents.openDevTools).not.toHaveBeenCalled();
  });

  it('forwards maximize event to renderer', () => {
    registerWindowHandlers(win);
    win.emit('maximize');
    expect(win.webContents.send).toHaveBeenCalledWith('window:maximized-change', true);
  });

  it('forwards unmaximize event to renderer', () => {
    registerWindowHandlers(win);
    win.emit('unmaximize');
    expect(win.webContents.send).toHaveBeenCalledWith('window:maximized-change', false);
  });

  it('cleanupWindowHandlers removes all handlers', () => {
    registerWindowHandlers(win);
    cleanupWindowHandlers();
    expect(ipcMain.removeHandler).toHaveBeenCalledWith('window:is-maximized');
    expect(ipcMain.removeHandler).toHaveBeenCalledWith('window:open-devtools');
    expect(ipcMain.removeAllListeners).toHaveBeenCalledWith('window:minimize');
    expect(ipcMain.removeAllListeners).toHaveBeenCalledWith('window:maximize');
    expect(ipcMain.removeAllListeners).toHaveBeenCalledWith('window:close');
  });
});
