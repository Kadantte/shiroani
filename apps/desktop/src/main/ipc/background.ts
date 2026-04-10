import { ipcMain, dialog, app, protocol, net } from 'electron';
import type { BrowserWindow } from 'electron';
import { existsSync, mkdirSync } from 'fs';
import { copyFile, unlink, stat } from 'fs/promises';
import { join, extname } from 'path';
import { randomUUID } from 'crypto';
import { createMainLogger } from '../logger';

const logger = createMainLogger('IPC:Background');

/** Directory inside userData where background images are stored */
const BACKGROUNDS_DIR_NAME = 'backgrounds';

/** Allowed image extensions (lowercase, without dot) */
const ALLOWED_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp']);

/** Maximum file size: 20 MB */
const MAX_FILE_SIZE = 20 * 1024 * 1024;

/**
 * Check if a filename contains path-traversal or otherwise unsafe characters.
 */
function isUnsafeFileName(name: string): boolean {
  return name.includes('..') || name.includes('/') || name.includes('\\') || name.includes('\0');
}

/**
 * Get (and ensure existence of) the backgrounds directory
 */
function getBackgroundsDir(): string {
  const dir = join(app.getPath('userData'), BACKGROUNDS_DIR_NAME);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/**
 * Validate that a file extension is an allowed image type
 */
function isAllowedExtension(filePath: string): boolean {
  const ext = extname(filePath).toLowerCase().replace('.', '');
  return ALLOWED_EXTENSIONS.has(ext);
}

/**
 * Register the shiroani-bg:// custom protocol for serving background images.
 * Must be called before app.ready (protocol.registerSchemesAsPrivileged)
 * or after app.ready (protocol.handle).
 *
 * Usage: shiroani-bg://backgrounds/<filename>
 */
export function registerBackgroundProtocol(): void {
  protocol.handle('shiroani-bg', request => {
    const url = new URL(request.url);
    // URL looks like shiroani-bg://backgrounds/filename.png
    const fileName = url.pathname.replace(/^\/+/, '');

    // Security: reject path traversal
    if (!fileName || isUnsafeFileName(fileName)) {
      logger.warn(`Blocked background request with suspicious path: ${fileName}`);
      return new Response('Forbidden', { status: 403 });
    }

    // Validate extension
    if (!isAllowedExtension(fileName)) {
      logger.warn(`Blocked background request for non-image file: ${fileName}`);
      return new Response('Forbidden', { status: 403 });
    }

    const filePath = join(getBackgroundsDir(), fileName);

    if (!existsSync(filePath)) {
      return new Response('Not Found', { status: 404 });
    }

    // Use net.fetch with file:// URL to serve the file
    return net.fetch(`file://${filePath}`);
  });

  logger.info('Background protocol (shiroani-bg://) registered');
}

/**
 * Register IPC handlers for background image management
 */
export function registerBackgroundHandlers(mainWindow: BrowserWindow): void {
  ipcMain.handle('background:pick', async (): Promise<{ fileName: string; url: string } | null> => {
    logger.debug('background:pick invoked');

    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Wybierz obraz tla',
      filters: [
        {
          name: 'Obrazy',
          extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'],
        },
      ],
      properties: ['openFile'],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    const sourcePath = result.filePaths[0];

    // Validate extension
    if (!isAllowedExtension(sourcePath)) {
      logger.warn(`Rejected file with invalid extension: ${sourcePath}`);
      throw new Error('Nieobslugiwany format pliku');
    }

    // Check file size
    const fileStats = await stat(sourcePath);
    if (fileStats.size > MAX_FILE_SIZE) {
      throw new Error('Plik jest za duzy (maksymalnie 20 MB)');
    }

    // Generate unique filename to avoid collisions
    const ext = extname(sourcePath).toLowerCase();
    const uniqueName = `bg-${randomUUID()}${ext}`;
    const destPath = join(getBackgroundsDir(), uniqueName);

    // Copy file to backgrounds directory
    await copyFile(sourcePath, destPath);
    logger.info(`Background image copied: ${uniqueName}`);

    const url = `shiroani-bg://backgrounds/${uniqueName}`;
    return { fileName: uniqueName, url };
  });

  ipcMain.handle('background:remove', async (_event, fileName: string): Promise<void> => {
    logger.debug(`background:remove invoked for: ${fileName}`);

    // Security: validate filename
    if (typeof fileName !== 'string' || !fileName || isUnsafeFileName(fileName)) {
      throw new Error('Invalid filename');
    }

    if (!isAllowedExtension(fileName)) {
      throw new Error('Invalid file type');
    }

    const filePath = join(getBackgroundsDir(), fileName);

    if (existsSync(filePath)) {
      await unlink(filePath);
      logger.info(`Background image removed: ${fileName}`);
    }
  });

  ipcMain.handle('background:get-url', (_event, fileName: string): string | null => {
    if (typeof fileName !== 'string' || !fileName || isUnsafeFileName(fileName)) {
      return null;
    }

    const filePath = join(getBackgroundsDir(), fileName);
    if (!existsSync(filePath)) {
      return null;
    }

    return `shiroani-bg://backgrounds/${fileName}`;
  });
}

/**
 * Clean up background IPC handlers
 */
export function cleanupBackgroundHandlers(): void {
  ipcMain.removeHandler('background:pick');
  ipcMain.removeHandler('background:remove');
  ipcMain.removeHandler('background:get-url');
}
