jest.mock('electron');
jest.mock('../../logging/logger', () => ({
  createMainLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

const mockOverlay = {
  setMascotVisible: jest.fn(),
  isMascotVisible: jest.fn(() => false),
  setMascotPosition: jest.fn(),
  getMascotPosition: jest.fn(() => ({ x: 0, y: 0 })),
  isMascotEnabled: jest.fn(() => true),
  setMascotEnabled: jest.fn(),
  getMascotSize: jest.fn(() => 1),
  setMascotSize: jest.fn(),
  getMascotVisibilityMode: jest.fn(() => 'always'),
  applyMascotVisibilityMode: jest.fn(),
  isMascotPositionLocked: jest.fn(() => false),
  setMascotPositionLocked: jest.fn(),
  resetMascotPosition: jest.fn(),
};
jest.mock('../../mascot/overlay', () => mockOverlay);

import { ipcMain } from 'electron';
import { registerOverlayHandlers, cleanupOverlayHandlers } from '../overlay';

describe('registerOverlayHandlers', () => {
  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (ipcMain as any).__reset();
    Object.values(mockOverlay).forEach(fn => (fn as jest.Mock).mockReset());
    // Restore sensible defaults after reset
    mockOverlay.isMascotVisible.mockReturnValue(false);
    mockOverlay.getMascotPosition.mockReturnValue({ x: 0, y: 0 });
    mockOverlay.isMascotEnabled.mockReturnValue(true);
    mockOverlay.getMascotSize.mockReturnValue(1);
    mockOverlay.getMascotVisibilityMode.mockReturnValue('always');
    mockOverlay.isMascotPositionLocked.mockReturnValue(false);
  });

  it('overlay:show sets visible true and returns success envelope', async () => {
    registerOverlayHandlers();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (ipcMain as any).__invoke('overlay:show');
    expect(mockOverlay.setMascotVisible).toHaveBeenCalledWith(true);
    expect(result).toEqual({ success: true });
  });

  it('overlay:hide sets visible false and returns success envelope', async () => {
    registerOverlayHandlers();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (ipcMain as any).__invoke('overlay:hide');
    expect(mockOverlay.setMascotVisible).toHaveBeenCalledWith(false);
    expect(result).toEqual({ success: true });
  });

  it('overlay:toggle inverts visibility', async () => {
    mockOverlay.isMascotVisible.mockReturnValue(true);
    registerOverlayHandlers();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (ipcMain as any).__invoke('overlay:toggle');
    expect(mockOverlay.setMascotVisible).toHaveBeenCalledWith(false);
    expect(result).toEqual({ success: true, visible: false });
  });

  it('overlay:get-status returns combined state', async () => {
    mockOverlay.getMascotPosition.mockReturnValue({ x: 100, y: 200 });
    mockOverlay.isMascotEnabled.mockReturnValue(true);
    mockOverlay.isMascotVisible.mockReturnValue(true);
    registerOverlayHandlers();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (ipcMain as any).__invoke('overlay:get-status');
    expect(result).toEqual({ enabled: true, visible: true, x: 100, y: 200 });
  });

  it('overlay:set-position calls setMascotPosition', async () => {
    registerOverlayHandlers();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (ipcMain as any).__invoke('overlay:set-position', 10, 20);
    expect(mockOverlay.setMascotPosition).toHaveBeenCalledWith(10, 20);
    expect(result).toEqual({ success: true });
  });

  it('overlay:set-position on service error returns failure envelope', async () => {
    mockOverlay.setMascotPosition.mockImplementation(() => {
      throw new Error('bad position');
    });
    registerOverlayHandlers();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (ipcMain as any).__invoke('overlay:set-position', 10, 20);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/bad position/);
  });

  it('overlay:set-visibility-mode with VALID mode (permissive schema accepts)', async () => {
    registerOverlayHandlers();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (ipcMain as any).__invoke('overlay:set-visibility-mode', 'tray-only');
    expect(mockOverlay.applyMascotVisibilityMode).toHaveBeenCalledWith('tray-only');
    expect(result).toEqual({ success: true, mode: 'tray-only' });
  });

  it('overlay:set-visibility-mode with INVALID mode returns envelope (NOT reject)', async () => {
    registerOverlayHandlers();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (ipcMain as any).__invoke('overlay:set-visibility-mode', 'bogus');
    expect(mockOverlay.applyMascotVisibilityMode).not.toHaveBeenCalled();
    expect(result).toEqual({ success: false, error: 'Invalid visibility mode' });
  });

  it('overlay:is-enabled returns boolean', async () => {
    mockOverlay.isMascotEnabled.mockReturnValue(true);
    registerOverlayHandlers();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (ipcMain as any).__invoke('overlay:is-enabled');
    expect(result).toBe(true);
  });

  it('overlay:set-enabled sets enabled and returns envelope', async () => {
    registerOverlayHandlers();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (ipcMain as any).__invoke('overlay:set-enabled', true);
    expect(mockOverlay.setMascotEnabled).toHaveBeenCalledWith(true);
    expect(result).toEqual({ success: true, enabled: true });
  });

  it('overlay:set-size sets size and returns envelope', async () => {
    registerOverlayHandlers();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (ipcMain as any).__invoke('overlay:set-size', 1.5);
    expect(mockOverlay.setMascotSize).toHaveBeenCalledWith(1.5);
    expect(result).toEqual({ success: true, size: 1.5 });
  });

  it('overlay:get-size returns current size', async () => {
    mockOverlay.getMascotSize.mockReturnValue(2);
    registerOverlayHandlers();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (ipcMain as any).__invoke('overlay:get-size');
    expect(result).toBe(2);
  });

  it('overlay:reset-position delegates', async () => {
    registerOverlayHandlers();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (ipcMain as any).__invoke('overlay:reset-position');
    expect(mockOverlay.resetMascotPosition).toHaveBeenCalled();
    expect(result).toEqual({ success: true });
  });

  it('overlay:set-position-locked delegates', async () => {
    registerOverlayHandlers();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (ipcMain as any).__invoke('overlay:set-position-locked', true);
    expect(mockOverlay.setMascotPositionLocked).toHaveBeenCalledWith(true);
    expect(result).toEqual({ success: true, locked: true });
  });

  describe('cleanupOverlayHandlers', () => {
    it('removes all overlay handlers', () => {
      registerOverlayHandlers();
      cleanupOverlayHandlers();
      [
        'overlay:show',
        'overlay:hide',
        'overlay:toggle',
        'overlay:set-position',
        'overlay:get-status',
        'overlay:set-enabled',
        'overlay:is-enabled',
        'overlay:set-size',
        'overlay:get-size',
        'overlay:set-visibility-mode',
        'overlay:get-visibility-mode',
        'overlay:set-position-locked',
        'overlay:get-position-locked',
        'overlay:reset-position',
      ].forEach(ch => {
        expect(ipcMain.removeHandler).toHaveBeenCalledWith(ch);
      });
    });
  });
});
