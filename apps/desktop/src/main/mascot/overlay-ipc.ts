import { BrowserWindow, ipcMain, screen } from 'electron';
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
    let newX = bounds.x + dx;
    let newY = bounds.y + dy;

    const display = screen.getDisplayNearestPoint({ x: newX, y: newY });
    const workArea = display.workArea;
    newX = Math.max(workArea.x - bounds.width + 20, Math.min(newX, workArea.x + workArea.width - 20));
    newY = Math.max(workArea.y - bounds.height + 20, Math.min(newY, workArea.y + workArea.height - 20));

    mascotWindow.setBounds({
      x: newX,
      y: newY,
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
