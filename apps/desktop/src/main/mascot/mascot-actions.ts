import { app, BrowserWindow } from 'electron';
import { logger } from '../logging/logger';
import { isMascotPositionLocked, setMascotPositionLocked } from './mascot-position';

type SetVisibleFn = (visible: boolean) => void;

let setMascotVisibleFn: SetVisibleFn | null = null;

/**
 * Register the visibility setter so mascot-actions can show/hide
 * without importing overlay.ts (which would create a circular dependency).
 */
export function registerVisibilitySetter(fn: SetVisibleFn): void {
  setMascotVisibleFn = fn;
}

/**
 * Focus the main window by showing and focusing it.
 * Shared helper for overlay actions that need to bring the app forward.
 */
function focusMainWindow(mainWindow: BrowserWindow | null): void {
  if (!mainWindow || mainWindow.isDestroyed()) return;

  if (process.platform === 'darwin') {
    if (app.isHidden()) {
      app.show();
    }
    app.focus({ steal: true });
  }
  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }
  mainWindow.show();
  mainWindow.moveTop();
  mainWindow.focus();
}

/**
 * Handle an overlay action from the context menu or tray.
 *
 * @param action - The action string (e.g. 'quit', 'open-app', 'navigate:schedule')
 * @param mainWindow - Reference to the main application window
 */
export function handleOverlayAction(action: string, mainWindow: BrowserWindow | null): void {
  logger.info(`Handling overlay action: ${action}`);

  // Handle navigation actions with a common pattern
  if (action.startsWith('navigate:')) {
    focusMainWindow(mainWindow);
    mainWindow?.webContents.send('navigate', action.split(':')[1]);
    return;
  }

  switch (action) {
    case 'quit':
      app.quit();
      break;
    case 'open-app':
      focusMainWindow(mainWindow);
      break;
    case 'lock-position':
      setMascotPositionLocked(!isMascotPositionLocked());
      break;
    case 'unlock-position':
      setMascotPositionLocked(false);
      break;
    case 'hide':
      setMascotVisibleFn?.(false);
      break;
    case 'show':
      setMascotVisibleFn?.(true);
      break;
  }
}
