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

export type MascotWindowState = 'visible' | 'hidden' | 'minimized';

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
  setWin32Size(clamped);
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
  if (process.platform !== 'win32') {
    logger.info('Mascot overlay is only supported on Windows');
    return false;
  }

  if (!isMascotEnabled()) {
    logger.info('Mascot overlay is disabled in settings');
    return false;
  }

  // Wire up the visibility setter so mascot-actions can show/hide without circular imports
  registerVisibilitySetter(setMascotVisible);

  return createWin32Overlay(mainWindow, setMascotVisible);
}

/**
 * Save the current mascot position to the store.
 */
export function saveMascotPosition(): void {
  saveWin32Position();
}

/**
 * Reset the mascot position to the default (bottom-right of work area).
 */
export function resetMascotPosition(): void {
  deletePosition();
  const size = getMascotSize();
  const { x, y } = getDefaultPosition(size);
  setWin32Position(x, y);
}

/**
 * Destroy the mascot overlay and release all resources.
 */
export function destroyMascotOverlay(): void {
  clearPositionCallbacks();
  destroyWin32Overlay(() => saveMascotPosition());
}

/**
 * Show or hide the mascot overlay.
 */
export function setMascotVisible(visible: boolean): void {
  setWin32Visible(visible);
}

/**
 * Move the mascot overlay to the specified position.
 */
export function setMascotPosition(x: number, y: number): void {
  setWin32Position(x, y);
}

/**
 * Check whether the mascot overlay is currently visible.
 */
export function isMascotVisible(): boolean {
  return isWin32Visible();
}

/**
 * Get the current position of the mascot overlay.
 */
export function getMascotPosition(): { x: number; y: number } {
  return getWin32Position();
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
  setWin32Animation(sheetPath, frameCount, frameWidth, intervalMs);
}

/**
 * Update mascot visibility based on current window state and visibility mode.
 */
export function updateMascotVisibilityForWindowState(windowState: MascotWindowState): void {
  if (!hasWin32Addon()) return;
  if (!isMascotEnabled()) return;

  const mode = getMascotVisibilityMode();
  if (mode === 'always') return;

  // "tray-only" mode: show the mascot only when the main window is minimized.
  setMascotVisible(windowState === 'minimized');
}

/**
 * Persist the visibility mode AND immediately apply it based on the current
 * window state. Unlike bare setMascotVisibilityMode() (which only persists
 * to the store), this function ensures the mascot is shown/hidden right away.
 */
export function applyMascotVisibilityMode(mode: 'always' | 'tray-only'): void {
  setMascotVisibilityMode(mode);

  if (!hasWin32Addon()) return;
  if (!isMascotEnabled()) return;

  if (mode === 'always') {
    setMascotVisible(true);
  } else {
    const isMinimized =
      mainWindow !== null && !mainWindow.isDestroyed() && mainWindow.isMinimized();
    setMascotVisible(isMinimized);
  }
}

// Re-export from overlay-state
export { isMascotEnabled, getMascotSize, getMascotVisibilityMode, setMascotVisibilityMode };

// Position lock (re-exported from mascot-position for centralized imports)
export { isMascotPositionLocked, setMascotPositionLocked } from './mascot-position';
