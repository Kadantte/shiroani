import { BrowserWindow } from 'electron';
import { logger } from '../logger';
import { store } from '../store';
import { registerVisibilitySetter } from './mascot-actions';
import { clearPositionCallbacks } from './mascot-position';
import {
  isMascotEnabled,
  getMascotSize,
  getMascotVisibilityMode,
  setMascotVisibilityMode,
  getDefaultPosition,
  deletePosition,
} from './overlay-state';
import {
  createWin32Overlay,
  destroyWin32Overlay,
  isWin32Visible,
  setWin32Visible,
  setWin32Position,
  getWin32Position,
  setWin32Size,
  setWin32Animation,
  saveWin32Position,
  hasWin32Addon,
} from './overlay-windows';
import {
  initDarwinOverlay,
  destroyDarwinOverlay,
  isDarwinVisible,
  setDarwinVisible,
  setDarwinPosition,
  getDarwinPosition,
  setDarwinSize,
  saveDarwinPosition,
  hasDarwinWindow,
} from './overlay-macos';

let mainWindow: BrowserWindow | null = null;

/**
 * Set the main window reference so the overlay can interact with it.
 */
export function setMainWindow(win: BrowserWindow): void {
  mainWindow = win;
}

/**
 * Set the mascot overlay size and persist it.
 */
export function setMascotSize(size: number): void {
  const clamped = Math.max(48, Math.min(512, Math.round(size)));
  store.set('settings.mascotSize', clamped);
  if (process.platform === 'win32') {
    setWin32Size(clamped);
  } else if (process.platform === 'darwin') {
    setDarwinSize(clamped);
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
    return initDarwinOverlay(mainWindow);
  }

  // Windows: use native addon
  return createWin32Overlay(mainWindow, setMascotVisible);
}

/**
 * Save the current mascot position to the store.
 */
export function saveMascotPosition(): void {
  if (process.platform === 'win32') {
    saveWin32Position();
  } else if (process.platform === 'darwin') {
    saveDarwinPosition();
  }
}

/**
 * Reset the mascot position to the default (bottom-right of work area).
 */
export function resetMascotPosition(): void {
  deletePosition();
  const size = getMascotSize();
  const { x, y } = getDefaultPosition(size);

  if (process.platform === 'win32') {
    setWin32Position(x, y);
  } else if (process.platform === 'darwin') {
    setDarwinPosition(x, y);
  }
}

/**
 * Destroy the mascot overlay and release all resources.
 */
export function destroyMascotOverlay(): void {
  clearPositionCallbacks();

  if (process.platform === 'win32') {
    destroyWin32Overlay(() => saveMascotPosition());
  } else if (process.platform === 'darwin') {
    destroyDarwinOverlay(() => saveMascotPosition());
  }
}

/**
 * Show or hide the mascot overlay.
 */
export function setMascotVisible(visible: boolean): void {
  if (process.platform === 'win32') {
    setWin32Visible(visible);
  } else if (process.platform === 'darwin') {
    setDarwinVisible(visible);
  }
}

/**
 * Move the mascot overlay to the specified position.
 */
export function setMascotPosition(x: number, y: number): void {
  if (process.platform === 'win32') {
    setWin32Position(x, y);
  } else if (process.platform === 'darwin') {
    setDarwinPosition(x, y);
  }
}

/**
 * Check whether the mascot overlay is currently visible.
 */
export function isMascotVisible(): boolean {
  if (process.platform === 'win32') {
    return isWin32Visible();
  }
  if (process.platform === 'darwin') {
    return isDarwinVisible();
  }
  return false;
}

/**
 * Get the current position of the mascot overlay.
 */
export function getMascotPosition(): { x: number; y: number } {
  if (process.platform === 'win32') {
    return getWin32Position();
  }
  if (process.platform === 'darwin') {
    return getDarwinPosition();
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
  if (process.platform === 'win32') {
    setWin32Animation(sheetPath, frameCount, frameWidth, intervalMs);
  }
  // macOS: sprite sheet animation not yet supported (uses single image with CSS bob)
}

/**
 * Update mascot visibility based on current window state and visibility mode.
 */
export function updateMascotVisibilityForWindowState(windowVisible: boolean): void {
  if (process.platform === 'win32' && !hasWin32Addon()) return;
  if (process.platform === 'darwin' && !hasDarwinWindow()) return;
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

// Re-export from overlay-state
export { isMascotEnabled, getMascotSize, getMascotVisibilityMode, setMascotVisibilityMode };

// Position lock (re-exported from mascot-position for centralized imports)
export { isMascotPositionLocked, setMascotPositionLocked } from './mascot-position';
