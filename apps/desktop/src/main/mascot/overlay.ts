import { app, BrowserWindow } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
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
  setDarwinSprite,
} from './overlay-macos';

// ---------------------------------------------------------------------------
// Pose switching (macOS only — Win32 native addon doesn't support static sprite swap)
// ---------------------------------------------------------------------------

export type MascotPose = 'idle' | 'wave' | 'sleep';

const POSE_FILES: Record<MascotPose, string> = {
  idle: 'chibi_base.png',
  wave: 'chibi_wave.png',
  sleep: 'chibi_sleep.png',
};

/** Duration (ms) after which lack of interaction triggers the sleep pose */
const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
/** How often to check time-based pose changes (ms) */
const TIME_CHECK_INTERVAL_MS = 5 * 60 * 1000;

let currentPose: MascotPose = 'idle';
let poseTimer: ReturnType<typeof setTimeout> | null = null;
let idleTimer: ReturnType<typeof setTimeout> | null = null;
let timeCheckInterval: ReturnType<typeof setInterval> | null = null;

/** Cache base64-encoded sprites to avoid repeated file I/O */
const spriteCache = new Map<MascotPose, string>();

function getResourcesPath(): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'mascot')
    : path.join(__dirname, '../../../resources/mascot');
}

/**
 * Read a pose sprite file (cached) and send its base64 data URL to the macOS overlay.
 */
async function sendPoseToOverlay(pose: MascotPose): Promise<void> {
  if (process.platform !== 'darwin' || !hasDarwinWindow()) return;

  let spriteSrc = spriteCache.get(pose);
  if (!spriteSrc) {
    const spriteFile = path.join(getResourcesPath(), POSE_FILES[pose]);
    try {
      const data = await fs.promises.readFile(spriteFile);
      spriteSrc = `data:image/png;base64,${data.toString('base64')}`;
      spriteCache.set(pose, spriteSrc);
    } catch (err) {
      logger.error(`Failed to read mascot pose sprite (${pose}):`, err);
      return;
    }
  }
  setDarwinSprite(spriteSrc);
}

/** Sequence counter to prevent stale async pose updates from overriding newer ones */
let poseSeq = 0;

/**
 * Switch the mascot to a given pose (macOS only).
 * If `durationMs` is provided, automatically revert to idle after that time.
 */
export async function setMascotPose(pose: MascotPose, durationMs?: number): Promise<void> {
  if (process.platform !== 'darwin') return;

  currentPose = pose;
  const seq = ++poseSeq;
  await sendPoseToOverlay(pose);

  // Bail if another pose was set while we were reading the file
  if (poseSeq !== seq) return;

  if (poseTimer) {
    clearTimeout(poseTimer);
    poseTimer = null;
  }
  if (durationMs != null) {
    poseTimer = setTimeout(() => {
      poseTimer = null;
      setMascotPose('idle');
    }, durationMs);
  }
}

/**
 * Start / restart the idle inactivity timer.
 * After IDLE_TIMEOUT_MS of no user interaction the mascot switches to sleep.
 */
function startIdleCheck(): void {
  if (process.platform !== 'darwin') return;
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    idleTimer = null;
    if (currentPose === 'idle') {
      setMascotPose('sleep');
    }
  }, IDLE_TIMEOUT_MS);
}

/**
 * Apply time-of-day pose rules:
 * 23:00 -- 05:59 -> sleep (if currently idle)
 * 06:00 -- 22:59 -> idle (if currently sleeping from time check)
 */
function checkTimeBasedPose(): void {
  const hour = new Date().getHours();
  if (hour >= 23 || hour < 6) {
    if (currentPose === 'idle') setMascotPose('sleep');
  } else if (currentPose === 'sleep') {
    setMascotPose('idle');
  }
}

function startPoseTimers(): void {
  if (process.platform !== 'darwin') return;
  checkTimeBasedPose();
  startIdleCheck();
  if (timeCheckInterval) clearInterval(timeCheckInterval);
  timeCheckInterval = setInterval(checkTimeBasedPose, TIME_CHECK_INTERVAL_MS);
}

function clearPoseTimers(): void {
  if (poseTimer) {
    clearTimeout(poseTimer);
    poseTimer = null;
  }
  if (idleTimer) {
    clearTimeout(idleTimer);
    idleTimer = null;
  }
  if (timeCheckInterval) {
    clearInterval(timeCheckInterval);
    timeCheckInterval = null;
  }
  currentPose = 'idle';
  spriteCache.clear();
}

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

  let result: boolean;
  if (process.platform === 'darwin') {
    result = initDarwinOverlay(mainWindow);
  } else {
    result = createWin32Overlay(mainWindow, setMascotVisible);
  }

  if (result) {
    startPoseTimers();
  }
  return result;
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
  clearPoseTimers();
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

  // When the main window becomes visible and mascot is actually shown, greet with wave
  if (windowVisible && currentPose !== 'wave' && mode === 'always') {
    setMascotPose('wave', 3000);
  }

  // Only reset idle timer when user shows the window (active interaction)
  if (windowVisible) {
    startIdleCheck();
  }

  if (mode === 'always') return;

  // "tray-only" mode: show mascot when window is hidden/minimized, hide when visible
  if (windowVisible) {
    setMascotVisible(false);
  } else {
    setMascotVisible(true);
  }
}

/**
 * Persist the visibility mode AND immediately apply it based on the current
 * window state. Unlike bare setMascotVisibilityMode() (which only persists
 * to the store), this function ensures the mascot is shown/hidden right away.
 */
export function applyMascotVisibilityMode(mode: 'always' | 'tray-only'): void {
  setMascotVisibilityMode(mode);

  if (process.platform === 'win32' && !hasWin32Addon()) return;
  if (process.platform === 'darwin' && !hasDarwinWindow()) return;
  if (!isMascotEnabled()) return;

  if (mode === 'always') {
    setMascotVisible(true);
  } else {
    // tray-only: show mascot only when main window is hidden/minimized
    const windowVisible =
      mainWindow !== null &&
      !mainWindow.isDestroyed() &&
      mainWindow.isVisible() &&
      !mainWindow.isMinimized();
    setMascotVisible(!windowVisible);
  }
}

// Re-export from overlay-state
export { isMascotEnabled, getMascotSize, getMascotVisibilityMode, setMascotVisibilityMode };

// Position lock (re-exported from mascot-position for centralized imports)
export { isMascotPositionLocked, setMascotPositionLocked } from './mascot-position';
