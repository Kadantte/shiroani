import { app, BrowserWindow } from 'electron';
import * as path from 'path';
import { logger } from '../logger';
import { store } from '../store';
import { showContextMenu, setMenuSelectHandler, type MenuState } from './context-menu';
import { handleOverlayAction } from './mascot-actions';
import { isMascotPositionLocked, registerPositionCallbacks } from './mascot-position';
import {
  getMascotSize,
  getMascotVisibilityMode,
  getSavedPosition,
  savePosition,
  MASCOT_FRAME_COUNT,
  MASCOT_ANIM_INTERVAL,
} from './overlay-state';

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

let addon: OverlayAddon | null = null;

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

function getResourcesPath(): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'mascot')
    : path.join(__dirname, '../../../resources/mascot');
}

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
          savePosition(pos);
        }
      }
    },
  });
}

export function createWin32Overlay(
  mainWindow: BrowserWindow | null,
  _setMascotVisible: (visible: boolean) => void
): boolean {
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
            visible: isWin32Visible(),
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
    const savedPos = getSavedPosition();
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

export function destroyWin32Overlay(savePosCallback: () => void): void {
  if (!addon) return;
  try {
    savePosCallback();
    addon.destroyOverlay();
    logger.info('Mascot overlay destroyed');
  } catch (error) {
    logger.error('Failed to destroy mascot overlay:', error);
  }
  addon = null;
}

export function isWin32Visible(): boolean {
  return addon ? addon.isVisible() : false;
}

export function setWin32Visible(visible: boolean): void {
  if (addon) addon.setVisible(visible);
}

export function setWin32Position(x: number, y: number): void {
  if (addon) addon.setPosition(x, y);
}

export function getWin32Position(): { x: number; y: number } {
  return addon ? addon.getPosition() : { x: 0, y: 0 };
}

export function setWin32Size(size: number): void {
  if (addon) addon.setSize(size);
}

export function setWin32Animation(
  sheetPath: string,
  frameCount: number,
  frameWidth: number,
  intervalMs: number
): void {
  if (addon) {
    addon.setAnimation({ sheetPath, frameCount, frameWidth, intervalMs });
  }
}

export function saveWin32Position(): void {
  if (addon) {
    const pos = addon.getPosition();
    if (pos.x !== 0 || pos.y !== 0) {
      savePosition(pos);
    }
  }
}

export function hasWin32Addon(): boolean {
  return addon !== null;
}
