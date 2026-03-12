import { app, BrowserWindow, screen, ipcMain } from 'electron';
import * as path from 'path';
import { logger } from '../logger';

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

export function isContextMenuVisible(): boolean {
  return menuWindow !== null && !menuWindow.isDestroyed() && menuWindow.isVisible();
}

export function setMainWindowRef(win: BrowserWindow | null): void {
  mainWindowRef = win;
}

function getMenuHtmlPath(): string {
  if (!app.isPackaged) {
    return path.join(__dirname, '../../../src/renderer/context-menu.html');
  }
  return path.join(app.getAppPath(), 'dist/renderer/context-menu.html');
}

function getMenuPreloadPath(): string {
  return path.join(__dirname, '../menu-preload.js');
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

  menuWindow.loadFile(getMenuHtmlPath()).catch(err => {
    logger.error('Failed to load context menu HTML:', err);
  });

  menuWindow.on('blur', () => {
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
    hideContextMenu();
    if (onMenuSelect) {
      onMenuSelect(action);
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

  try {
    const js = THEME_VARS.map(
      ([cssVar]) =>
        `getComputedStyle(document.documentElement).getPropertyValue('${cssVar}').trim()`
    ).join(',');

    const results = await mainWindowRef.webContents.executeJavaScript(`[${js}]`);

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

  menuWindow.show();
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
