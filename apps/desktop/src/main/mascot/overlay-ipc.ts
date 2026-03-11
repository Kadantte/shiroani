import { BrowserWindow, ipcMain } from 'electron';
import { store } from '../store';
import { showContextMenu, type MenuState } from './context-menu';
import { isMascotPositionLocked } from './mascot-position';

let macIpcRegistered = false;

export function registerMacIpcHandlers(
  getMascotWindow: () => BrowserWindow | null,
  getMascotWindowVisible: () => boolean,
  _getMainWindow: () => BrowserWindow | null
): void {
  if (macIpcRegistered) return;
  macIpcRegistered = true;

  ipcMain.on('mascot:start-drag', () => {
    // Drag started — position updates come via mascot:drag
  });

  ipcMain.on('mascot:drag', (_event, dx: number, dy: number) => {
    const mascotWindow = getMascotWindow();
    if (!mascotWindow || mascotWindow.isDestroyed()) return;
    const bounds = mascotWindow.getBounds();
    mascotWindow.setBounds({
      x: bounds.x + dx,
      y: bounds.y + dy,
      width: bounds.width,
      height: bounds.height,
    });
  });

  ipcMain.on('mascot:end-drag', () => {
    const mascotWindow = getMascotWindow();
    if (!mascotWindow || mascotWindow.isDestroyed()) return;
    // Save position after drag
    const bounds = mascotWindow.getBounds();
    store.set('settings.mascotPosition', { x: bounds.x, y: bounds.y });
  });

  ipcMain.on('mascot:context-menu', (_event, screenX: number, screenY: number) => {
    const state: MenuState = {
      visible: getMascotWindowVisible(),
      positionLocked: isMascotPositionLocked(),
    };
    showContextMenu(screenX, screenY, state);
  });
}

export function cleanupMacIpcHandlers(): void {
  if (!macIpcRegistered) return;
  macIpcRegistered = false;
  ipcMain.removeAllListeners('mascot:start-drag');
  ipcMain.removeAllListeners('mascot:drag');
  ipcMain.removeAllListeners('mascot:end-drag');
  ipcMain.removeAllListeners('mascot:context-menu');
}
