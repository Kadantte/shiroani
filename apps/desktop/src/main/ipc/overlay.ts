import { ipcMain } from 'electron';
import { createLogger } from '@shiroani/shared';
import {
  setMascotVisible,
  isMascotVisible,
  setMascotPosition,
  getMascotPosition,
  isMascotEnabled,
  setMascotEnabled,
  getMascotSize,
  setMascotSize,
  getMascotVisibilityMode,
  applyMascotVisibilityMode,
  isMascotPositionLocked,
  setMascotPositionLocked,
  resetMascotPosition,
} from '../mascot/overlay';

const logger = createLogger('IPC:Overlay');

/**
 * Register overlay control IPC handlers.
 *
 * Channels:
 *   overlay:show          - Show the mascot overlay
 *   overlay:hide          - Hide the mascot overlay
 *   overlay:toggle        - Toggle mascot visibility
 *   overlay:set-position  - Move the mascot to (x, y)
 *   overlay:get-status    - Get current visibility and position
 */
export function registerOverlayHandlers(): void {
  ipcMain.handle('overlay:show', () => {
    try {
      setMascotVisible(true);
      return { success: true };
    } catch (error) {
      logger.error('Failed to show overlay:', error);
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('overlay:hide', () => {
    try {
      setMascotVisible(false);
      return { success: true };
    } catch (error) {
      logger.error('Failed to hide overlay:', error);
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('overlay:toggle', () => {
    try {
      const visible = isMascotVisible();
      setMascotVisible(!visible);
      return { success: true, visible: !visible };
    } catch (error) {
      logger.error('Failed to toggle overlay:', error);
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('overlay:set-position', (_event, x: number, y: number) => {
    try {
      setMascotPosition(x, y);
      return { success: true };
    } catch (error) {
      logger.error('Failed to set overlay position:', error);
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('overlay:get-status', () => {
    try {
      const enabled = isMascotEnabled();
      const visible = isMascotVisible();
      const position = getMascotPosition();
      return { enabled, visible, ...position };
    } catch (error) {
      logger.error('Failed to get overlay status:', error);
      return { enabled: false, visible: false, x: 0, y: 0, error: String(error) };
    }
  });

  ipcMain.handle('overlay:set-enabled', (_event, enabled: boolean) => {
    try {
      setMascotEnabled(enabled);
      return { success: true, enabled };
    } catch (error) {
      logger.error('Failed to set overlay enabled:', error);
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('overlay:is-enabled', () => {
    return isMascotEnabled();
  });

  ipcMain.handle('overlay:set-size', (_event, size: number) => {
    try {
      setMascotSize(size);
      return { success: true, size };
    } catch (error) {
      logger.error('Failed to set overlay size:', error);
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('overlay:get-size', () => {
    return getMascotSize();
  });

  ipcMain.handle('overlay:set-visibility-mode', (_event, mode: string) => {
    try {
      if (mode !== 'always' && mode !== 'tray-only') {
        return { success: false, error: 'Invalid visibility mode' };
      }
      applyMascotVisibilityMode(mode);
      return { success: true, mode };
    } catch (error) {
      logger.error('Failed to set visibility mode:', error);
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('overlay:get-visibility-mode', () => {
    return getMascotVisibilityMode();
  });

  ipcMain.handle('overlay:set-position-locked', (_event, locked: boolean) => {
    try {
      setMascotPositionLocked(locked);
      return { success: true, locked };
    } catch (error) {
      logger.error('Failed to set position locked:', error);
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('overlay:get-position-locked', () => {
    return isMascotPositionLocked();
  });

  ipcMain.handle('overlay:reset-position', () => {
    try {
      resetMascotPosition();
      return { success: true };
    } catch (error) {
      logger.error('Failed to reset mascot position:', error);
      return { success: false, error: String(error) };
    }
  });
}

/**
 * Clean up overlay IPC handlers.
 */
export function cleanupOverlayHandlers(): void {
  ipcMain.removeHandler('overlay:show');
  ipcMain.removeHandler('overlay:hide');
  ipcMain.removeHandler('overlay:toggle');
  ipcMain.removeHandler('overlay:set-position');
  ipcMain.removeHandler('overlay:get-status');
  ipcMain.removeHandler('overlay:set-enabled');
  ipcMain.removeHandler('overlay:is-enabled');
  ipcMain.removeHandler('overlay:set-size');
  ipcMain.removeHandler('overlay:get-size');
  ipcMain.removeHandler('overlay:set-visibility-mode');
  ipcMain.removeHandler('overlay:get-visibility-mode');
  ipcMain.removeHandler('overlay:set-position-locked');
  ipcMain.removeHandler('overlay:get-position-locked');
  ipcMain.removeHandler('overlay:reset-position');
}
