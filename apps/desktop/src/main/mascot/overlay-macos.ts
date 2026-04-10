import { app, BrowserWindow, screen } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { logger } from '../logger';
import { setMenuSelectHandler, isContextMenuVisible, hideContextMenu } from './context-menu';
import { handleOverlayAction } from './mascot-actions';
import { isMascotPositionLocked, registerPositionCallbacks } from './mascot-position';
import {
  getMascotSize,
  getMascotVisibilityMode,
  getSavedPosition,
  savePosition,
} from './overlay-state';
import { registerMacIpcHandlers, cleanupMacIpcHandlers } from './overlay-ipc';

let mascotWindow: BrowserWindow | null = null;
let mascotWindowVisible = true;
const SHOW_ON_FULLSCREEN_SPACES = false;

function getMascotHtmlPath(): string {
  if (!app.isPackaged) {
    return path.join(__dirname, '../../src/renderer/mascot-overlay.html');
  }
  return path.join(app.getAppPath(), 'dist/renderer/mascot-overlay.html');
}

function getMascotPreloadPath(): string {
  return path.join(__dirname, 'mascot-preload.js');
}

function getResourcesPath(): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'mascot')
    : path.join(__dirname, '../../resources/mascot');
}

function showMascotWindowInactive(): void {
  if (!mascotWindow || mascotWindow.isDestroyed()) return;

  if (typeof mascotWindow.showInactive === 'function') {
    mascotWindow.showInactive();
    return;
  }

  mascotWindow.show();
  mascotWindow.blur();
}

export function createMacOverlay(mainWindow: BrowserWindow | null): boolean {
  if (mascotWindow && !mascotWindow.isDestroyed()) return true;

  const size = getMascotSize();
  const savedPos = getSavedPosition();

  // Default position: bottom-right of work area
  let startX: number;
  let startY: number;
  if (savedPos) {
    startX = savedPos.x;
    startY = savedPos.y;
  } else {
    const primaryDisplay = screen.getPrimaryDisplay();
    const workArea = primaryDisplay.workArea;
    startX = workArea.x + workArea.width - size - 20;
    startY = workArea.y + workArea.height - size - 10;
  }

  mascotWindow = new BrowserWindow({
    width: size,
    height: size,
    x: startX,
    y: startY,
    frame: false,
    transparent: true,
    hasShadow: false,
    show: false,
    skipTaskbar: true,
    resizable: false,
    focusable: false,
    fullscreenable: false,
    alwaysOnTop: true,
    webPreferences: {
      preload: getMascotPreloadPath(),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      // Use a separate session so the main app's restrictive CSP
      // (which strips 'unsafe-inline') doesn't block inline scripts.
      partition: 'mascot-overlay',
    },
  });

  mascotWindow.setAlwaysOnTop(true, 'floating');
  mascotWindow.setVisibleOnAllWorkspaces(true, {
    // Keep the mascot on regular desktops only. Showing it above fullscreen
    // Spaces on macOS can hijack focus and bounce users back into the app.
    visibleOnFullScreen: SHOW_ON_FULLSCREEN_SPACES,
  });

  // Hide from Mission Control
  if (typeof mascotWindow.setHiddenInMissionControl === 'function') {
    mascotWindow.setHiddenInMissionControl(true);
  }

  mascotWindow
    .loadFile(getMascotHtmlPath())
    .then(async () => {
      const spriteFile = path.join(getResourcesPath(), 'chibi_base.png');
      let spriteSrc: string;
      try {
        const data = await fs.promises.readFile(spriteFile);
        spriteSrc = `data:image/png;base64,${data.toString('base64')}`;
      } catch (err) {
        logger.error('Failed to read mascot sprite:', err);
        spriteSrc = '';
      }
      mascotWindow!.webContents.send('mascot:config', {
        spritePath: spriteSrc,
        positionLocked: isMascotPositionLocked(),
      });

      // Show the mascot without activating the overlay window.
      showMascotWindowInactive();
      mascotWindowVisible = true;

      // Apply tray-only visibility mode on startup
      const mode = getMascotVisibilityMode();
      if (mode === 'tray-only' && (!mainWindow || !mainWindow.isMinimized())) {
        mascotWindow!.hide();
        mascotWindowVisible = false;
      }
    })
    .catch(err => {
      logger.error('Failed to load mascot overlay HTML:', err);
    });

  // Register IPC handlers for drag and context menu
  registerMacIpcHandlers(
    () => mascotWindow,
    () => mascotWindowVisible,
    () => mainWindow
  );

  // Never force-focus the main window from the mascot.
  // On macOS this can yank users back into ShiroAni or a fullscreen Space.
  mascotWindow.on('focus', () => {
    if (mascotWindow && !mascotWindow.isDestroyed()) {
      // Dismiss context menu if it's open when mascot gets focus
      if (isContextMenuVisible()) {
        hideContextMenu();
        return;
      }
      mascotWindow.blur();
    }
  });

  mascotWindow.on('closed', () => {
    mascotWindow = null;
    mascotWindowVisible = false;
    cleanupMacIpcHandlers();
  });

  return true;
}

function registerDarwinPositionCallbacks(): void {
  registerPositionCallbacks({
    setPositionLocked: locked => {
      if (mascotWindow && !mascotWindow.isDestroyed()) {
        mascotWindow.webContents.send('mascot:position-locked', locked);
      }
    },
    getPosition: () => {
      if (mascotWindow && !mascotWindow.isDestroyed()) {
        const bounds = mascotWindow.getBounds();
        return { x: bounds.x, y: bounds.y };
      }
      return { x: 0, y: 0 };
    },
    setPosition: (x, y) => {
      if (mascotWindow && !mascotWindow.isDestroyed()) {
        const bounds = mascotWindow.getBounds();
        mascotWindow.setBounds({ x, y, width: bounds.width, height: bounds.height });
      }
    },
    savePosition: () => {
      if (mascotWindow && !mascotWindow.isDestroyed()) {
        const bounds = mascotWindow.getBounds();
        savePosition({ x: bounds.x, y: bounds.y });
      }
    },
  });
}

export function initDarwinOverlay(mainWindow: BrowserWindow | null): boolean {
  setMenuSelectHandler((action: string) => {
    handleOverlayAction(action, mainWindow);
  });
  registerDarwinPositionCallbacks();
  const result = createMacOverlay(mainWindow);
  logger.info(`Mascot overlay created (macOS BrowserWindow): ${result}`);
  return result;
}

export function destroyDarwinOverlay(savePosCallback: () => void): void {
  if (mascotWindow && !mascotWindow.isDestroyed()) {
    try {
      savePosCallback();
      mascotWindow.removeAllListeners('closed');
      mascotWindow.destroy();
      logger.info('Mascot overlay destroyed (macOS)');
    } catch (error) {
      logger.error('Failed to destroy mascot overlay:', error);
    }
    mascotWindow = null;
    mascotWindowVisible = false;
  }
  cleanupMacIpcHandlers();
}

export function isDarwinVisible(): boolean {
  return mascotWindowVisible;
}

export function setDarwinVisible(visible: boolean): void {
  if (mascotWindow && !mascotWindow.isDestroyed()) {
    if (visible) {
      showMascotWindowInactive();
    } else {
      mascotWindow.hide();
    }
    mascotWindowVisible = visible;
  }
}

export function setDarwinPosition(x: number, y: number): void {
  if (mascotWindow && !mascotWindow.isDestroyed()) {
    const bounds = mascotWindow.getBounds();
    mascotWindow.setBounds({ x, y, width: bounds.width, height: bounds.height });
  }
}

export function getDarwinPosition(): { x: number; y: number } {
  if (mascotWindow && !mascotWindow.isDestroyed()) {
    const bounds = mascotWindow.getBounds();
    return { x: bounds.x, y: bounds.y };
  }
  return { x: 0, y: 0 };
}

export function setDarwinSize(size: number): void {
  if (mascotWindow && !mascotWindow.isDestroyed()) {
    const pos = mascotWindow.getBounds();
    mascotWindow.setBounds({ x: pos.x, y: pos.y, width: size, height: size });
  }
}

export function saveDarwinPosition(): void {
  if (mascotWindow && !mascotWindow.isDestroyed()) {
    const bounds = mascotWindow.getBounds();
    savePosition({ x: bounds.x, y: bounds.y });
  }
}

export function setDarwinSprite(spriteSrc: string): void {
  if (mascotWindow && !mascotWindow.isDestroyed()) {
    mascotWindow.webContents.send('mascot:set-sprite', spriteSrc);
  }
}

export function hasDarwinWindow(): boolean {
  return mascotWindow !== null && !mascotWindow.isDestroyed();
}
