import { app, Tray, Menu, nativeImage, BrowserWindow } from 'electron';
import * as path from 'path';
import { logger } from './logger';

let tray: Tray | null = null;

function getTrayIconPath(): string {
  const resourcesDir = app.isPackaged
    ? process.resourcesPath
    : path.join(__dirname, '../../resources');

  // On macOS, use a 16px icon for proper menu bar sizing.
  // On other platforms, use the 32px icon for better visibility.
  if (process.platform === 'darwin') {
    return path.join(resourcesDir, 'icon-16.png');
  }
  return path.join(resourcesDir, 'icon-32.png');
}

function showWindow(win: BrowserWindow): void {
  if (win.isDestroyed()) return;
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
}

export function createTray(mainWindow: BrowserWindow): void {
  const iconPath = getTrayIconPath();
  let icon = nativeImage.createFromPath(iconPath);

  // On macOS, mark as template image so the system renders it correctly
  // in both light and dark menu bar modes.
  if (process.platform === 'darwin') {
    icon = icon.resize({ width: 16, height: 16 });
    icon.setTemplateImage(true);
  }

  tray = new Tray(icon);
  tray.setToolTip('ShiroAni');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Pokaż ShiroAni',
      click: () => showWindow(mainWindow),
    },
    { type: 'separator' },
    {
      label: 'Zamknij',
      click: () => app.quit(),
    },
  ]);

  tray.setContextMenu(contextMenu);

  // Click on tray icon shows/focuses the main window
  tray.on('click', () => showWindow(mainWindow));

  logger.info('System tray created');
}

export function destroyTray(): void {
  if (tray) {
    tray.destroy();
    tray = null;
  }
}
