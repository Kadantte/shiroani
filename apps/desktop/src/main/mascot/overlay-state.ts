import { screen } from 'electron';
import { store } from '../store';

type MascotVisibilityMode = 'always' | 'tray-only';

const DEFAULT_MASCOT_SIZE = 128;

export const MASCOT_FRAME_COUNT = 8;
export const MASCOT_ANIM_INTERVAL = 100;

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

export function getSavedPosition(): { x: number; y: number } | undefined {
  return store.get('settings.mascotPosition') as { x: number; y: number } | undefined;
}

export function savePosition(pos: { x: number; y: number }): void {
  store.set('settings.mascotPosition', pos);
}

export function deletePosition(): void {
  store.delete('settings.mascotPosition');
}

export function getDefaultPosition(size: number): { x: number; y: number } {
  const primaryDisplay = screen.getPrimaryDisplay();
  const workArea = primaryDisplay.workArea;
  return {
    x: workArea.x + workArea.width - size - 20,
    y: workArea.y + workArea.height - size - 10,
  };
}
