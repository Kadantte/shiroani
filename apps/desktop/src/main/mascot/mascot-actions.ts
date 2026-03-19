import { app, BrowserWindow } from 'electron';
import { logger } from '../logger';
import { isMascotPositionLocked, setMascotPositionLocked } from './mascot-position';

type SetVisibleFn = (visible: boolean) => void;

let setMascotVisibleFn: SetVisibleFn | null = null;

function describeMainWindow(mainWindow: BrowserWindow | null): string {
  if (!mainWindow) {
    return 'window=null';
  }

  if (mainWindow.isDestroyed()) {
    return 'window=destroyed';
  }

  const bounds = mainWindow.getBounds();
  const appHidden = process.platform === 'darwin' ? app.isHidden() : false;

  return [
    `visible=${mainWindow.isVisible()}`,
    `minimized=${mainWindow.isMinimized()}`,
    `focused=${mainWindow.isFocused()}`,
    `fullScreen=${mainWindow.isFullScreen()}`,
    `appHidden=${appHidden}`,
    `bounds=${bounds.x},${bounds.y},${bounds.width}x${bounds.height}`,
  ].join(' ');
}

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
  logger.info(`[MascotDebug] focusMainWindow before: ${describeMainWindow(mainWindow)}`);

  if (!mainWindow || mainWindow.isDestroyed()) {
    logger.warn('[MascotDebug] focusMainWindow aborted: main window missing');
    return;
  }

  if (process.platform === 'darwin') {
    if (app.isHidden()) {
      logger.info('[MascotDebug] app.show() because app is hidden');
      app.show();
    }
    logger.info('[MascotDebug] app.focus({ steal: true })');
    app.focus({ steal: true });
  }
  if (mainWindow.isMinimized()) {
    logger.info('[MascotDebug] mainWindow.restore()');
    mainWindow.restore();
  }
  logger.info('[MascotDebug] mainWindow.show()');
  mainWindow.show();
  logger.info('[MascotDebug] mainWindow.moveTop()');
  mainWindow.moveTop();
  logger.info('[MascotDebug] mainWindow.focus()');
  mainWindow.focus();

  logger.info(`[MascotDebug] focusMainWindow after immediate: ${describeMainWindow(mainWindow)}`);
  setTimeout(() => {
    logger.info(`[MascotDebug] focusMainWindow after 100ms: ${describeMainWindow(mainWindow)}`);
  }, 100);
  setTimeout(() => {
    logger.info(`[MascotDebug] focusMainWindow after 300ms: ${describeMainWindow(mainWindow)}`);
  }, 300);
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
