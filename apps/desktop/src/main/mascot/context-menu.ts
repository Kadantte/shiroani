import { app, BrowserWindow, screen, ipcMain } from 'electron';
import * as path from 'path';
import { logger } from '../logger';

export interface MenuState {
  visible: boolean;
  positionLocked: boolean;
}

type MenuSelectHandler = (action: string) => void;

const MENU_WIDTH = 220;
const MENU_HEIGHT = 320;

let menuWindow: BrowserWindow | null = null;
let onMenuSelect: MenuSelectHandler | null = null;

/**
 * Get the path to the context menu HTML file.
 * In dev mode, the source file is used directly.
 * In production, it is compiled to dist/renderer/.
 */
function getMenuHtmlPath(): string {
  if (!app.isPackaged) {
    return path.join(__dirname, '../../../src/renderer/context-menu.html');
  }
  return path.join(app.getAppPath(), 'dist/renderer/context-menu.html');
}

/**
 * Get the path to the compiled menu preload script.
 */
function getMenuPreloadPath(): string {
  return path.join(__dirname, '../menu-preload.js');
}

/**
 * Create the hidden context menu BrowserWindow.
 * Should be called once during app startup, after mainWindow is created.
 */
export function createContextMenuWindow(): void {
  if (menuWindow) return;

  menuWindow = new BrowserWindow({
    width: MENU_WIDTH,
    height: MENU_HEIGHT,
    frame: false,
    transparent: true,
    show: false,
    skipTaskbar: true,
    resizable: false,
    alwaysOnTop: true,
    focusable: true,
    webPreferences: {
      preload: getMenuPreloadPath(),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      // Use a separate session so the main app's restrictive CSP
      // (set on defaultSession) doesn't block inline scripts in the menu HTML.
      partition: 'mascot-menu',
    },
  });

  // Set always-on-top level to pop-up-menu so it appears above the mascot overlay
  menuWindow.setAlwaysOnTop(true, 'pop-up-menu');

  menuWindow.loadFile(getMenuHtmlPath()).catch(err => {
    logger.error('Failed to load context menu HTML:', err);
  });

  // Auto-dismiss on blur (clicking outside)
  menuWindow.on('blur', () => {
    hideContextMenu();
  });

  // Prevent the menu window from being destroyed on close, just hide it
  menuWindow.on('close', event => {
    if (menuWindow && !menuWindow.isDestroyed()) {
      event.preventDefault();
      menuWindow.hide();
    }
  });

  // Register IPC handlers for the context menu.
  // Remove any existing listener first to prevent accumulation if called twice.
  ipcMain.removeAllListeners('menu:select');
  ipcMain.on('menu:select', (_event, action: string) => {
    hideContextMenu();
    if (onMenuSelect) {
      onMenuSelect(action);
    }
  });

  ipcMain.on('menu:ready', () => {
    logger.info('Context menu renderer ready');
  });
}

/**
 * Show the context menu at the given screen coordinates.
 * Clamps position to stay within screen bounds.
 */
export function showContextMenu(x: number, y: number, state: MenuState): void {
  if (!menuWindow || menuWindow.isDestroyed()) {
    logger.warn('Context menu window not available');
    return;
  }

  // Get the display that contains the cursor position
  const cursorPoint = { x, y };
  const display = screen.getDisplayNearestPoint(cursorPoint);
  const bounds = display.workArea;

  // Clamp menu position to stay within screen bounds
  let menuX = x;
  let menuY = y;

  if (menuX + MENU_WIDTH > bounds.x + bounds.width) {
    menuX = bounds.x + bounds.width - MENU_WIDTH;
  }
  if (menuX < bounds.x) {
    menuX = bounds.x;
  }

  // Position menu above the cursor if it would go off the bottom
  if (menuY + MENU_HEIGHT > bounds.y + bounds.height) {
    menuY = y - MENU_HEIGHT;
  }
  if (menuY < bounds.y) {
    menuY = bounds.y;
  }

  // Send state to the renderer before showing
  menuWindow.webContents.send('menu:state', state);

  // Position and show the window
  menuWindow.setBounds({
    x: Math.round(menuX),
    y: Math.round(menuY),
    width: MENU_WIDTH,
    height: MENU_HEIGHT,
  });

  menuWindow.showInactive();
  menuWindow.focus();
}

/**
 * Hide the context menu window.
 */
export function hideContextMenu(): void {
  if (menuWindow && !menuWindow.isDestroyed() && menuWindow.isVisible()) {
    menuWindow.hide();
  }
}

/**
 * Set the handler for menu item selections.
 */
export function setMenuSelectHandler(handler: MenuSelectHandler): void {
  onMenuSelect = handler;
}

/**
 * Destroy the context menu window. Call on app quit.
 */
export function destroyContextMenu(): void {
  if (menuWindow && !menuWindow.isDestroyed()) {
    // Remove the close prevention handler so it actually destroys
    menuWindow.removeAllListeners('close');
    menuWindow.destroy();
  }
  menuWindow = null;
  onMenuSelect = null;

  ipcMain.removeAllListeners('menu:select');
  ipcMain.removeAllListeners('menu:ready');
}
