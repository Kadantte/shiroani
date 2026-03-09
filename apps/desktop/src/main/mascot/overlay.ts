import { app, BrowserWindow, screen, ipcMain } from 'electron';
import * as path from 'path';
import { logger } from '../logger';
import { store } from '../store';
import { showContextMenu, setMenuSelectHandler, type MenuState } from './context-menu';
import { handleOverlayAction, registerVisibilitySetter } from './mascot-actions';
import {
  isMascotPositionLocked,
  registerPositionCallbacks,
  clearPositionCallbacks,
} from './mascot-position';

type MascotVisibilityMode = 'always' | 'tray-only';

/**
 * Native addon interface for the desktop mascot overlay (Windows only).
 */
interface OverlayAddon {
  createOverlay(opts: {
    spritePath: string;
    iconPath: string;
    x: number;
    y: number;
    frameWidth: number;
    frameHeight: number;
    frameCount: number;
    intervalMs: number;
  }): boolean;
  destroyOverlay(): void;
  setPosition(x: number, y: number): void;
  setAnimation(opts: {
    sheetPath: string;
    frameCount: number;
    frameWidth: number;
    intervalMs: number;
  }): void;
  setVisible(visible: boolean): void;
  isVisible(): boolean;
  getPosition(): { x: number; y: number };
  setSize(size: number): void;
  setCallback(callback: (event: string) => void): void;
  setPositionLocked(locked: boolean): void;
}

const DEFAULT_MASCOT_SIZE = 128;
const MASCOT_FRAME_COUNT = 8;
const MASCOT_ANIM_INTERVAL = 100;

let addon: OverlayAddon | null = null;
let mainWindow: BrowserWindow | null = null;

// macOS BrowserWindow-based overlay
let mascotWindow: BrowserWindow | null = null;
let mascotWindowVisible = true;

/**
 * Set the main window reference so the overlay can interact with it.
 */
export function setMainWindow(win: BrowserWindow): void {
  mainWindow = win;
}

function getAddonPath(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'native', 'desktop_overlay.node');
  }
  return path.join(__dirname, '../../../build/Release/desktop_overlay.node');
}

function loadAddon(): boolean {
  if (addon) return true;
  try {
    addon = require(getAddonPath()) as OverlayAddon;
    return true;
  } catch (error) {
    logger.error('Failed to load desktop overlay addon:', error);
    return false;
  }
}

/**
 * Check if the mascot overlay is enabled in settings.
 */
export function isMascotEnabled(): boolean {
  const enabled = store.get('settings.mascotEnabled');
  return enabled !== false;
}

/**
 * Get the configured mascot size from settings.
 */
export function getMascotSize(): number {
  const size = store.get('settings.mascotSize') as number | undefined;
  return size && size >= 48 && size <= 512 ? size : DEFAULT_MASCOT_SIZE;
}

/**
 * Set the mascot overlay size and persist it.
 */
export function setMascotSize(size: number): void {
  const clamped = Math.max(48, Math.min(512, Math.round(size)));
  store.set('settings.mascotSize', clamped);
  if (process.platform === 'win32') {
    if (addon) addon.setSize(clamped);
  } else if (process.platform === 'darwin') {
    if (mascotWindow && !mascotWindow.isDestroyed()) {
      const pos = mascotWindow.getBounds();
      mascotWindow.setBounds({ x: pos.x, y: pos.y, width: clamped, height: clamped });
    }
  }
}

/**
 * Enable or disable the mascot overlay.
 */
export function setMascotEnabled(enabled: boolean): void {
  store.set('settings.mascotEnabled', enabled);
  if (enabled) {
    createMascotOverlay();
  } else {
    destroyMascotOverlay();
  }
}

// ============================================================================
// macOS BrowserWindow overlay
// ============================================================================

function getMascotHtmlPath(): string {
  if (process.env.NODE_ENV === 'development') {
    return path.join(__dirname, '../../../src/renderer/mascot-overlay.html');
  }
  return path.join(__dirname, '../../renderer/mascot-overlay.html');
}

function getMascotPreloadPath(): string {
  return path.join(__dirname, '../mascot-preload.js');
}

function getResourcesPath(): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'mascot')
    : path.join(__dirname, '../../../resources/mascot');
}

function createMacOverlay(): boolean {
  if (mascotWindow && !mascotWindow.isDestroyed()) return true;

  const size = getMascotSize();
  const savedPos = store.get('settings.mascotPosition') as { x: number; y: number } | undefined;

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
    focusable: true,
    alwaysOnTop: true,
    webPreferences: {
      preload: getMascotPreloadPath(),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  mascotWindow.setAlwaysOnTop(true, 'floating');
  mascotWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  // Hide from Mission Control
  if (typeof mascotWindow.setHiddenInMissionControl === 'function') {
    mascotWindow.setHiddenInMissionControl(true);
  }

  mascotWindow
    .loadFile(getMascotHtmlPath())
    .then(() => {
      const spritePath = path.join(getResourcesPath(), 'chibi_base.png');
      mascotWindow!.webContents.send('mascot:config', {
        spritePath,
        positionLocked: isMascotPositionLocked(),
      });

      // Use showInactive() to avoid stealing focus from the main window
      mascotWindow!.showInactive();
      mascotWindowVisible = true;

      // Apply tray-only visibility mode on startup
      const mode = getMascotVisibilityMode();
      if (
        mode === 'tray-only' &&
        mainWindow &&
        mainWindow.isVisible() &&
        !mainWindow.isMinimized()
      ) {
        mascotWindow!.hide();
        mascotWindowVisible = false;
      }
    })
    .catch(err => {
      logger.error('Failed to load mascot overlay HTML:', err);
    });

  // Register IPC handlers for drag and context menu
  registerMacIpcHandlers();

  // Prevent the mascot from stealing focus from the main window.
  // When the mascot is clicked, immediately return focus to the previously active window.
  mascotWindow.on('focus', () => {
    if (mascotWindow && !mascotWindow.isDestroyed()) {
      mascotWindow.blur();
      // If the main window was visible, refocus it
      if (mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible()) {
        mainWindow.focus();
      }
    }
  });

  mascotWindow.on('closed', () => {
    mascotWindow = null;
    mascotWindowVisible = false;
    cleanupMacIpcHandlers();
  });

  return true;
}

let macIpcRegistered = false;

function registerMacIpcHandlers(): void {
  if (macIpcRegistered) return;
  macIpcRegistered = true;

  ipcMain.on('mascot:start-drag', () => {
    // Drag started — position updates come via mascot:drag
  });

  ipcMain.on('mascot:drag', (_event, dx: number, dy: number) => {
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
    if (!mascotWindow || mascotWindow.isDestroyed()) return;
    // Save position after drag
    const bounds = mascotWindow.getBounds();
    store.set('settings.mascotPosition', { x: bounds.x, y: bounds.y });
  });

  ipcMain.on('mascot:context-menu', (_event, screenX: number, screenY: number) => {
    const state: MenuState = {
      visible: mascotWindowVisible,
      positionLocked: isMascotPositionLocked(),
    };
    showContextMenu(screenX, screenY, state);
  });
}

function cleanupMacIpcHandlers(): void {
  if (!macIpcRegistered) return;
  macIpcRegistered = false;
  ipcMain.removeAllListeners('mascot:start-drag');
  ipcMain.removeAllListeners('mascot:drag');
  ipcMain.removeAllListeners('mascot:end-drag');
  ipcMain.removeAllListeners('mascot:context-menu');
}

// ============================================================================
// Platform-specific position callbacks
// ============================================================================

function registerWin32PositionCallbacks(): void {
  registerPositionCallbacks({
    setPositionLocked: locked => {
      if (addon) addon.setPositionLocked(locked);
    },
    getPosition: () => (addon ? addon.getPosition() : { x: 0, y: 0 }),
    setPosition: (x, y) => {
      if (addon) addon.setPosition(x, y);
    },
    savePosition: () => {
      if (addon) {
        const pos = addon.getPosition();
        if (pos.x !== 0 || pos.y !== 0) {
          store.set('settings.mascotPosition', pos);
        }
      }
    },
  });
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
        store.set('settings.mascotPosition', { x: bounds.x, y: bounds.y });
      }
    },
  });
}

// ============================================================================
// Cross-platform entry points
// ============================================================================

/**
 * Create and display the mascot overlay window.
 */
export function createMascotOverlay(): boolean {
  if (process.platform !== 'win32' && process.platform !== 'darwin') {
    logger.info('Mascot overlay is only supported on Windows and macOS');
    return false;
  }

  if (!isMascotEnabled()) {
    logger.info('Mascot overlay is disabled in settings');
    return false;
  }

  // Wire up the visibility setter so mascot-actions can show/hide without circular imports
  registerVisibilitySetter(setMascotVisible);

  // macOS: use BrowserWindow-based overlay
  if (process.platform === 'darwin') {
    // Register handler for context menu selections
    setMenuSelectHandler((action: string) => {
      handleOverlayAction(action, mainWindow);
    });
    registerDarwinPositionCallbacks();
    const result = createMacOverlay();
    logger.info(`Mascot overlay created (macOS BrowserWindow): ${result}`);
    return result;
  }

  // Windows: use native addon
  if (!loadAddon()) return false;

  const resourcesPath = getResourcesPath();
  const spritePath = path.join(resourcesPath, 'chibi_base.png');
  const iconPath = path.join(
    app.isPackaged ? process.resourcesPath : path.join(__dirname, '../../../resources'),
    'icon.ico'
  );

  try {
    setMenuSelectHandler((action: string) => {
      handleOverlayAction(action, mainWindow);
    });

    addon!.setCallback((event: string) => {
      logger.info(`Mascot overlay event: ${event}`);

      if (event.startsWith('context-menu:')) {
        const parts = event.split(':');
        const x = parseInt(parts[1], 10);
        const y = parseInt(parts[2], 10);
        if (!isNaN(x) && !isNaN(y)) {
          const state: MenuState = {
            visible: isMascotVisible(),
            positionLocked: isMascotPositionLocked(),
          };
          showContextMenu(x, y, state);
        }
        return;
      }

      handleOverlayAction(event, mainWindow);
    });

    registerWin32PositionCallbacks();

    const size = getMascotSize();
    const savedPos = store.get('settings.mascotPosition') as { x: number; y: number } | undefined;
    const startX = savedPos?.x ?? -1;
    const startY = savedPos?.y ?? -1;

    const result = addon!.createOverlay({
      spritePath,
      iconPath,
      x: startX,
      y: startY,
      frameWidth: size,
      frameHeight: size,
      frameCount: MASCOT_FRAME_COUNT,
      intervalMs: MASCOT_ANIM_INTERVAL,
    });

    if (result) {
      const locked = store.get('settings.mascotPositionLocked') === true;
      if (locked) addon!.setPositionLocked(true);

      const mode = getMascotVisibilityMode();
      if (
        mode === 'tray-only' &&
        mainWindow &&
        mainWindow.isVisible() &&
        !mainWindow.isMinimized()
      ) {
        addon!.setVisible(false);
      }
    }

    logger.info(`Mascot overlay created: ${result}`);
    return result;
  } catch (error) {
    logger.error('Failed to create mascot overlay:', error);
    return false;
  }
}

/**
 * Save the current mascot position to the store.
 */
export function saveMascotPosition(): void {
  if (process.platform === 'win32' && addon) {
    const pos = addon.getPosition();
    if (pos.x !== 0 || pos.y !== 0) {
      store.set('settings.mascotPosition', pos);
    }
  } else if (process.platform === 'darwin' && mascotWindow && !mascotWindow.isDestroyed()) {
    const bounds = mascotWindow.getBounds();
    store.set('settings.mascotPosition', { x: bounds.x, y: bounds.y });
  }
}

/**
 * Reset the mascot position to the default (bottom-right of work area).
 */
export function resetMascotPosition(): void {
  store.delete('settings.mascotPosition');
  const primaryDisplay = screen.getPrimaryDisplay();
  const workArea = primaryDisplay.workArea;
  const size = getMascotSize();
  const x = workArea.x + workArea.width - size - 20;
  const y = workArea.y + workArea.height - size - 10;

  if (process.platform === 'win32' && addon) {
    addon.setPosition(x, y);
  } else if (process.platform === 'darwin' && mascotWindow && !mascotWindow.isDestroyed()) {
    mascotWindow.setBounds({ x, y, width: size, height: size });
  }
}

/**
 * Destroy the mascot overlay and release all resources.
 */
export function destroyMascotOverlay(): void {
  clearPositionCallbacks();

  if (process.platform === 'win32' && addon) {
    try {
      saveMascotPosition();
      addon.destroyOverlay();
      logger.info('Mascot overlay destroyed');
    } catch (error) {
      logger.error('Failed to destroy mascot overlay:', error);
    }
    addon = null;
  } else if (process.platform === 'darwin') {
    if (mascotWindow && !mascotWindow.isDestroyed()) {
      try {
        saveMascotPosition();
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
}

/**
 * Show or hide the mascot overlay.
 */
export function setMascotVisible(visible: boolean): void {
  if (process.platform === 'win32') {
    if (addon) addon.setVisible(visible);
  } else if (process.platform === 'darwin') {
    if (mascotWindow && !mascotWindow.isDestroyed()) {
      if (visible) {
        mascotWindow.show();
      } else {
        mascotWindow.hide();
      }
      mascotWindowVisible = visible;
    }
  }
}

/**
 * Move the mascot overlay to the specified position.
 */
export function setMascotPosition(x: number, y: number): void {
  if (process.platform === 'win32') {
    if (addon) addon.setPosition(x, y);
  } else if (process.platform === 'darwin') {
    if (mascotWindow && !mascotWindow.isDestroyed()) {
      const bounds = mascotWindow.getBounds();
      mascotWindow.setBounds({ x, y, width: bounds.width, height: bounds.height });
    }
  }
}

/**
 * Check whether the mascot overlay is currently visible.
 */
export function isMascotVisible(): boolean {
  if (process.platform === 'win32') {
    return addon ? addon.isVisible() : false;
  }
  if (process.platform === 'darwin') {
    return mascotWindowVisible;
  }
  return false;
}

/**
 * Get the current position of the mascot overlay.
 */
export function getMascotPosition(): { x: number; y: number } {
  if (process.platform === 'win32') {
    return addon ? addon.getPosition() : { x: 0, y: 0 };
  }
  if (process.platform === 'darwin' && mascotWindow && !mascotWindow.isDestroyed()) {
    const bounds = mascotWindow.getBounds();
    return { x: bounds.x, y: bounds.y };
  }
  return { x: 0, y: 0 };
}

/**
 * Switch the mascot animation to a different sprite sheet.
 */
export function setMascotAnimation(
  sheetPath: string,
  frameCount: number,
  frameWidth: number,
  intervalMs: number
): void {
  if (process.platform === 'win32' && addon) {
    addon.setAnimation({ sheetPath, frameCount, frameWidth, intervalMs });
  }
  // macOS: sprite sheet animation not yet supported (uses single image with CSS bob)
}

// ============================================================================
// Visibility mode
// ============================================================================

/**
 * Get the mascot visibility mode.
 */
export function getMascotVisibilityMode(): MascotVisibilityMode {
  const mode = store.get('settings.mascotVisibilityMode') as string | undefined;
  return mode === 'tray-only' ? 'tray-only' : 'always';
}

/**
 * Set the mascot visibility mode and persist it.
 */
export function setMascotVisibilityMode(mode: MascotVisibilityMode): void {
  store.set('settings.mascotVisibilityMode', mode);
}

/**
 * Update mascot visibility based on current window state and visibility mode.
 */
export function updateMascotVisibilityForWindowState(windowVisible: boolean): void {
  if (process.platform === 'win32' && !addon) return;
  if (process.platform === 'darwin' && (!mascotWindow || mascotWindow.isDestroyed())) return;
  if (!isMascotEnabled()) return;

  const mode = getMascotVisibilityMode();
  if (mode === 'always') return;

  // "tray-only" mode: show mascot when window is hidden/minimized, hide when visible
  if (windowVisible) {
    setMascotVisible(false);
  } else {
    setMascotVisible(true);
  }
}

// ============================================================================
// Position lock (re-exported from mascot-position for backward compatibility)
// ============================================================================

export { isMascotPositionLocked, setMascotPositionLocked } from './mascot-position';
