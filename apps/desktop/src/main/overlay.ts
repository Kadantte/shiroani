import { app, BrowserWindow, screen } from 'electron';
import * as path from 'path';
import { logger } from './logger';
import { store } from './store';
import { showContextMenu, setMenuSelectHandler, type MenuState } from './context-menu';

type MascotVisibilityMode = 'always' | 'tray-only';

/**
 * Native addon interface for the desktop mascot overlay.
 *
 * The addon creates a Win32 transparent overlay window with an animated sprite
 * and a system tray icon on a dedicated thread.
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

/**
 * Set the main window reference so the overlay can interact with it
 * (e.g. show/focus on "open-app", send navigation events).
 */
export function setMainWindow(win: BrowserWindow): void {
  mainWindow = win;
}

function getAddonPath(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'native', 'desktop_overlay.node');
  }
  return path.join(__dirname, '../../build/Release/desktop_overlay.node');
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
 * Defaults to true if not set.
 */
export function isMascotEnabled(): boolean {
  const enabled = store.get('settings.mascotEnabled');
  return enabled !== false; // default to true
}

/**
 * Get the configured mascot size from settings.
 * Defaults to DEFAULT_MASCOT_SIZE if not set.
 */
export function getMascotSize(): number {
  const size = store.get('settings.mascotSize') as number | undefined;
  return size && size >= 48 && size <= 512 ? size : DEFAULT_MASCOT_SIZE;
}

/**
 * Set the mascot overlay size and persist it.
 * If the overlay is running, resizes it immediately.
 */
export function setMascotSize(size: number): void {
  const clamped = Math.max(48, Math.min(512, Math.round(size)));
  store.set('settings.mascotSize', clamped);
  if (addon) {
    addon.setSize(clamped);
  }
}

/**
 * Enable or disable the mascot overlay.
 * When enabling, creates the overlay if not already running.
 * When disabling, destroys the overlay if running.
 */
export function setMascotEnabled(enabled: boolean): void {
  store.set('settings.mascotEnabled', enabled);
  if (enabled) {
    createMascotOverlay();
  } else {
    destroyMascotOverlay();
  }
}

/**
 * Handle an overlay action from either the native tray menu callback
 * or the custom context menu selection.
 */
function handleOverlayAction(action: string): void {
  logger.info(`Handling overlay action: ${action}`);
  switch (action) {
    case 'quit':
      app.quit();
      break;
    case 'open-app':
      mainWindow?.show();
      mainWindow?.focus();
      break;
    case 'navigate:schedule':
      mainWindow?.show();
      mainWindow?.focus();
      mainWindow?.webContents.send('navigate', 'schedule');
      break;
    case 'navigate:library':
      mainWindow?.show();
      mainWindow?.focus();
      mainWindow?.webContents.send('navigate', 'library');
      break;
    case 'navigate:settings':
      mainWindow?.show();
      mainWindow?.focus();
      mainWindow?.webContents.send('navigate', 'settings');
      break;
    case 'lock-position':
      setMascotPositionLocked(!isMascotPositionLocked());
      break;
    case 'unlock-position':
      store.set('settings.mascotPositionLocked', false);
      if (addon) addon.setPositionLocked(false);
      break;
    case 'hide':
      setMascotVisible(false);
      break;
    case 'show':
      setMascotVisible(true);
      break;
    // 'hide' and 'show' from the native callback are already handled by the C++ side
  }
}

/**
 * Create and display the mascot overlay window.
 * Loads the native addon, sets up the overlay with the idle animation,
 * and registers a callback for overlay events (hide, show, quit).
 */
export function createMascotOverlay(): boolean {
  if (process.platform !== 'win32') {
    logger.info('Mascot overlay is only supported on Windows');
    return false;
  }

  if (!isMascotEnabled()) {
    logger.info('Mascot overlay is disabled in settings');
    return false;
  }

  if (!loadAddon()) return false;

  const resourcesPath = app.isPackaged
    ? path.join(process.resourcesPath, 'mascot')
    : path.join(__dirname, '../../resources/mascot');

  const spritePath = path.join(resourcesPath, 'chibi_base.png');
  const iconPath = path.join(
    app.isPackaged ? process.resourcesPath : path.join(__dirname, '../../resources'),
    'icon.ico'
  );

  try {
    // Register handler for context menu selections
    setMenuSelectHandler((action: string) => {
      handleOverlayAction(action);
    });

    // Register event callback before creating the overlay
    addon!.setCallback((event: string) => {
      logger.info(`Mascot overlay event: ${event}`);

      // Handle custom context menu trigger from the overlay
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

      handleOverlayAction(event);
    });

    const size = getMascotSize();

    // Restore saved position or use auto-position (-1)
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

    // Restore position lock state from settings
    if (result) {
      const locked = store.get('settings.mascotPositionLocked') === true;
      if (locked) {
        addon!.setPositionLocked(true);
      }

      // Apply tray-only visibility mode on startup:
      // If mode is tray-only and the main window is visible, hide the mascot
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
 * Save the current mascot position to the store for persistence.
 */
export function saveMascotPosition(): void {
  if (addon) {
    const pos = addon.getPosition();
    if (pos.x !== 0 || pos.y !== 0) {
      store.set('settings.mascotPosition', pos);
    }
  }
}

/**
 * Reset the mascot position to the default (bottom-right of work area).
 * Clears saved position and moves the overlay.
 */
export function resetMascotPosition(): void {
  store.delete('settings.mascotPosition');
  if (addon) {
    const primaryDisplay = screen.getPrimaryDisplay();
    const workArea = primaryDisplay.workArea;
    const size = getMascotSize();
    const x = workArea.x + workArea.width - size - 20;
    const y = workArea.y + workArea.height - size - 10;
    addon.setPosition(x, y);
  }
}

/**
 * Destroy the mascot overlay and release all resources.
 */
export function destroyMascotOverlay(): void {
  if (addon) {
    try {
      // Save position before destroying
      saveMascotPosition();
      addon.destroyOverlay();
      logger.info('Mascot overlay destroyed');
    } catch (error) {
      logger.error('Failed to destroy mascot overlay:', error);
    }
    addon = null;
  }
}

/**
 * Show or hide the mascot overlay.
 */
export function setMascotVisible(visible: boolean): void {
  if (addon) addon.setVisible(visible);
}

/**
 * Move the mascot overlay to the specified position.
 */
export function setMascotPosition(x: number, y: number): void {
  if (addon) addon.setPosition(x, y);
}

/**
 * Check whether the mascot overlay is currently visible.
 */
export function isMascotVisible(): boolean {
  return addon ? addon.isVisible() : false;
}

/**
 * Get the current position of the mascot overlay.
 */
export function getMascotPosition(): { x: number; y: number } {
  return addon ? addon.getPosition() : { x: 0, y: 0 };
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
  if (addon) {
    addon.setAnimation({ sheetPath, frameCount, frameWidth, intervalMs });
  }
}

// ============================================================================
// Visibility mode
// ============================================================================

/**
 * Get the mascot visibility mode.
 * "always" = always visible, "tray-only" = visible only when app is minimized/hidden.
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
 * Called when the main window is shown/hidden/minimized/restored.
 */
export function updateMascotVisibilityForWindowState(windowVisible: boolean): void {
  if (!addon || !isMascotEnabled()) return;

  const mode = getMascotVisibilityMode();
  if (mode === 'always') {
    // In "always" mode, the mascot is always shown (user can still manually hide)
    return;
  }

  // "tray-only" mode: show mascot when window is hidden/minimized, hide when visible
  if (windowVisible) {
    addon.setVisible(false);
  } else {
    addon.setVisible(true);
  }
}

// ============================================================================
// Position lock
// ============================================================================

/**
 * Get whether the mascot position is locked.
 */
export function isMascotPositionLocked(): boolean {
  return store.get('settings.mascotPositionLocked') === true;
}

/**
 * Set whether the mascot position is locked and persist it.
 * Also updates the native addon state.
 */
export function setMascotPositionLocked(locked: boolean): void {
  store.set('settings.mascotPositionLocked', locked);
  if (addon) {
    addon.setPositionLocked(locked);
  }
}
