import { app, BrowserWindow, screen, ipcMain } from 'electron';
import * as path from 'path';
import { logger } from '../logging/logger';

export interface MenuState {
  visible: boolean;
  positionLocked: boolean;
}

interface ThemeColors {
  popover?: string;
  popoverForeground?: string;
  primary?: string;
  border?: string;
  destructive?: string;
  mutedForeground?: string;
}

type MenuSelectHandler = (action: string) => void;

const MENU_WIDTH = 220;
const MENU_HEIGHT = 320;
const EXIT_ANIMATION_MS = 150;

const THEME_VARS = [
  ['--popover', 'popover'],
  ['--popover-foreground', 'popoverForeground'],
  ['--primary', 'primary'],
  ['--border', 'border'],
  ['--destructive', 'destructive'],
  ['--muted-foreground', 'mutedForeground'],
] as const;

let menuWindow: BrowserWindow | null = null;
let mainWindowRef: BrowserWindow | null = null;
let onMenuSelect: MenuSelectHandler | null = null;
let hideTimeout: ReturnType<typeof setTimeout> | null = null;
let lastShowTime = 0;

function hideContextMenuImmediately(): void {
  if (!menuWindow || menuWindow.isDestroyed()) return;

  if (hideTimeout) {
    clearTimeout(hideTimeout);
    hideTimeout = null;
  }

  menuWindow.hide();
}

export function isContextMenuVisible(): boolean {
  return menuWindow !== null && !menuWindow.isDestroyed() && menuWindow.isVisible();
}

export function setMainWindowRef(win: BrowserWindow | null): void {
  mainWindowRef = win;
}

function getMenuHtmlPath(): string {
  const p = app.isPackaged
    ? path.join(app.getAppPath(), 'dist/renderer/context-menu.html')
    : path.join(__dirname, '../../src/renderer/context-menu.html');
  logger.info(`Context menu HTML path: ${p}`);
  return p;
}

function getMenuPreloadPath(): string {
  const p = path.join(__dirname, 'menu-preload.js');
  logger.info(`Context menu preload path: ${p}`);
  return p;
}

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
      partition: 'mascot-menu',
    },
  });

  menuWindow.setAlwaysOnTop(true, 'pop-up-menu');

  menuWindow
    .loadFile(getMenuHtmlPath())
    .then(() => {
      logger.info('Context menu HTML loaded successfully');
    })
    .catch(err => {
      logger.error('Failed to load context menu HTML:', err);
    });

  menuWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    logger.error(`Context menu did-fail-load: ${errorCode} ${errorDescription}`);
  });

  menuWindow.on('blur', () => {
    // Guard against immediate blur after show (race with native overlay focus)
    if (Date.now() - lastShowTime < 300) return;
    hideContextMenu();
  });

  menuWindow.on('close', event => {
    if (menuWindow && !menuWindow.isDestroyed()) {
      event.preventDefault();
      menuWindow.hide();
    }
  });

  ipcMain.removeAllListeners('menu:select');
  ipcMain.on('menu:select', (_event, action: string) => {
    hideContextMenuImmediately();
    const handler = onMenuSelect;
    if (handler) {
      setTimeout(() => handler(action), 0);
    }
  });

  ipcMain.removeAllListeners('menu:ready');
  ipcMain.on('menu:ready', () => {
    logger.info('Context menu renderer ready');
  });

  ipcMain.removeAllListeners('menu:dismiss');
  ipcMain.on('menu:dismiss', () => {
    hideContextMenu();
  });

  ipcMain.removeAllListeners('menu:hidden');
  ipcMain.on('menu:hidden', () => {
    if (hideTimeout) {
      clearTimeout(hideTimeout);
      hideTimeout = null;
    }
    if (menuWindow && !menuWindow.isDestroyed()) {
      menuWindow.hide();
    }
  });
}

async function extractThemeColors(): Promise<ThemeColors | undefined> {
  if (!mainWindowRef || mainWindowRef.isDestroyed()) return undefined;

  const wc = mainWindowRef.webContents;
  if (wc.isDestroyed() || wc.isLoading()) return undefined;

  try {
    const js = THEME_VARS.map(
      ([cssVar]) =>
        `getComputedStyle(document.documentElement).getPropertyValue('${cssVar}').trim()`
    ).join(',');

    // Chain .catch() directly on the promise to guard against rejections
    // from Electron's IPC layer when the renderer is in a transitional
    // state (navigating, being destroyed between guard and execution).
    const results = await wc.executeJavaScript(`[${js}]`).catch(() => undefined);

    if (!results) return undefined;

    const theme: ThemeColors = {};
    THEME_VARS.forEach(([, key], i) => {
      const val = results[i];
      if (val) {
        (theme as Record<string, string>)[key] = val;
      }
    });

    return Object.keys(theme).length > 0 ? theme : undefined;
  } catch {
    return undefined;
  }
}

export async function showContextMenu(x: number, y: number, state: MenuState): Promise<void> {
  if (!menuWindow || menuWindow.isDestroyed()) {
    logger.warn('Context menu window not available');
    return;
  }

  if (hideTimeout) {
    clearTimeout(hideTimeout);
    hideTimeout = null;
  }

  const cursorPoint = { x, y };
  const display = screen.getDisplayNearestPoint(cursorPoint);
  const bounds = display.workArea;

  let menuX = x;
  let menuY = y;

  if (menuX + MENU_WIDTH > bounds.x + bounds.width) {
    menuX = bounds.x + bounds.width - MENU_WIDTH;
  }
  if (menuX < bounds.x) {
    menuX = bounds.x;
  }

  if (menuY + MENU_HEIGHT > bounds.y + bounds.height) {
    menuY = y - MENU_HEIGHT;
  }
  if (menuY < bounds.y) {
    menuY = bounds.y;
  }

  const theme = await extractThemeColors();
  const fullState = { ...state, theme };

  menuWindow.webContents.send('menu:state', fullState);

  menuWindow.setBounds({
    x: Math.round(menuX),
    y: Math.round(menuY),
    width: MENU_WIDTH,
    height: MENU_HEIGHT,
  });

  lastShowTime = Date.now();
  logger.info(`Showing context menu at (${Math.round(menuX)}, ${Math.round(menuY)})`);
  menuWindow.showInactive();
  menuWindow.focus();
}

export function hideContextMenu(): void {
  if (!menuWindow || menuWindow.isDestroyed() || !menuWindow.isVisible()) return;

  if (hideTimeout) return;

  menuWindow.webContents.send('menu:hide');

  hideTimeout = setTimeout(() => {
    hideTimeout = null;
    if (menuWindow && !menuWindow.isDestroyed()) {
      menuWindow.hide();
    }
  }, EXIT_ANIMATION_MS);
}

export function setMenuSelectHandler(handler: MenuSelectHandler): void {
  onMenuSelect = handler;
}

export function destroyContextMenu(): void {
  if (hideTimeout) {
    clearTimeout(hideTimeout);
    hideTimeout = null;
  }

  if (menuWindow && !menuWindow.isDestroyed()) {
    menuWindow.removeAllListeners('close');
    menuWindow.destroy();
  }
  menuWindow = null;
  mainWindowRef = null;
  onMenuSelect = null;

  ipcMain.removeAllListeners('menu:select');
  ipcMain.removeAllListeners('menu:ready');
  ipcMain.removeAllListeners('menu:dismiss');
  ipcMain.removeAllListeners('menu:hidden');
}
