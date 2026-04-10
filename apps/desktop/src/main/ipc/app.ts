import { ipcMain, app, shell, clipboard, nativeImage } from 'electron';
import { existsSync } from 'fs';
import { readdir, stat, readFile, writeFile } from 'fs/promises';
import { join, resolve, sep } from 'path';
import { LOG_FILE_PREFIX, LOG_MAX_FILE_SIZE } from '@shiroani/shared';
import { getLogsDir, createMainLogger } from '../logger';
import { getBackendPort } from '../backend-port';

const logger = createMainLogger('IPC:App');

/**
 * Register app-related IPC handlers
 */
export function registerAppHandlers(): void {
  const ALLOWED_PATH_NAMES = new Set([
    'userData',
    'home',
    'documents',
    'downloads',
    'desktop',
    'logs',
    'temp',
  ]);

  ipcMain.handle('app:get-path', (_event, name: Parameters<typeof app.getPath>[0]) => {
    if (!ALLOWED_PATH_NAMES.has(name)) {
      logger.warn(`[security] Blocked app:get-path for non-whitelisted name: "${name}"`);
      return undefined;
    }
    logger.debug(`app:get-path invoked for "${name}"`);
    return app.getPath(name);
  });

  ipcMain.handle('app:get-version', () => {
    logger.debug('app:get-version invoked');
    return app.getVersion();
  });

  ipcMain.handle('app:open-logs-folder', async () => {
    logger.debug('app:open-logs-folder invoked');
    const logsPath = getLogsDir();
    await shell.openPath(logsPath);
  });

  ipcMain.handle('app:clipboard-write', (_event, text: string) => {
    if (typeof text !== 'string') {
      throw new Error('clipboard-write expects a string');
    }
    clipboard.writeText(text);
  });

  ipcMain.handle('app:fetch-image-base64', async (_event, url: string): Promise<string | null> => {
    if (typeof url !== 'string') return null;
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return null;
    }
    if (parsed.protocol !== 'https:') return null;

    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) return null;
      const buffer = Buffer.from(await res.arrayBuffer());
      const contentType = res.headers.get('content-type') ?? 'image/jpeg';
      return `data:${contentType};base64,${buffer.toString('base64')}`;
    } catch (error) {
      logger.warn(`Failed to fetch image: ${url}`, error);
      return null;
    }
  });

  ipcMain.handle('app:clipboard-write-image', (_event, pngBase64: string) => {
    if (typeof pngBase64 !== 'string') {
      throw new Error('clipboard-write-image expects a base64 PNG string');
    }
    const image = nativeImage.createFromBuffer(Buffer.from(pngBase64, 'base64'));
    if (image.isEmpty()) {
      throw new Error('Failed to create image from provided data');
    }
    clipboard.writeImage(image);
  });

  ipcMain.handle('app:save-file-binary', async (_event, filePath: string, base64Data: string) => {
    if (typeof filePath !== 'string' || filePath.trim().length === 0) {
      throw new Error('save-file-binary expects a non-empty file path');
    }
    if (typeof base64Data !== 'string') {
      throw new Error('save-file-binary expects base64 data string');
    }
    const resolved = resolve(filePath);
    const allowedDirs = [
      app.getPath('documents'),
      app.getPath('downloads'),
      app.getPath('desktop'),
      app.getPath('pictures'),
    ];
    const isAllowed = allowedDirs.some(dir => resolved.startsWith(dir + sep) || resolved === dir);
    if (!isAllowed) {
      logger.warn(`[security] Blocked save-file-binary outside allowed directories: ${resolved}`);
      throw new Error('File path outside allowed directories');
    }
    await writeFile(resolved, Buffer.from(base64Data, 'base64'));
    return { success: true };
  });

  ipcMain.handle('app:get-auto-launch', () => {
    logger.debug('app:get-auto-launch invoked');
    return app.getLoginItemSettings().openAtLogin;
  });

  ipcMain.handle('app:set-auto-launch', (_event, enabled: boolean) => {
    logger.debug(`app:set-auto-launch invoked: ${enabled}`);
    if (typeof enabled !== 'boolean') {
      throw new Error('set-auto-launch expects a boolean');
    }
    app.setLoginItemSettings({ openAtLogin: enabled });
    return app.getLoginItemSettings().openAtLogin;
  });

  ipcMain.handle('app:get-backend-port', () => {
    logger.debug('app:get-backend-port invoked');
    return getBackendPort();
  });

  ipcMain.handle('app:list-log-files', async () => {
    logger.debug('app:list-log-files invoked');
    const logsDir = getLogsDir();
    if (!existsSync(logsDir)) return [];

    const entries = await readdir(logsDir);
    const logFiles: { name: string; size: number; lastModified: number }[] = [];

    for (const entry of entries) {
      if (!entry.startsWith(LOG_FILE_PREFIX) || !entry.endsWith('.log')) continue;
      const fileStat = await stat(join(logsDir, entry));
      if (!fileStat.isFile()) continue;
      logFiles.push({
        name: entry,
        size: fileStat.size,
        lastModified: fileStat.mtimeMs,
      });
    }

    return logFiles.sort((a, b) => b.lastModified - a.lastModified);
  });

  ipcMain.handle('app:read-log-file', async (_event, fileName: string) => {
    logger.debug(`app:read-log-file invoked for "${fileName}"`);

    // Security: reject path traversal, null bytes, and invalid filenames
    if (
      typeof fileName !== 'string' ||
      fileName.includes('\0') ||
      fileName.includes('/') ||
      fileName.includes('\\') ||
      fileName.includes('..') ||
      !fileName.startsWith(LOG_FILE_PREFIX) ||
      !fileName.endsWith('.log')
    ) {
      throw new Error('Invalid log file name');
    }

    const filePath = join(getLogsDir(), fileName);

    // Check file size before reading to avoid loading very large files
    try {
      const fileStat = await stat(filePath);
      if (fileStat.size > LOG_MAX_FILE_SIZE) {
        throw new Error(`Log file exceeds ${LOG_MAX_FILE_SIZE / (1024 * 1024)}MB limit`);
      }
    } catch (err: unknown) {
      if (
        err instanceof Error &&
        'code' in err &&
        (err as NodeJS.ErrnoException).code === 'ENOENT'
      ) {
        throw new Error('Log file not found', { cause: err });
      }
      throw err;
    }

    return readFile(filePath, 'utf-8');
  });
}

/**
 * Clean up app-related IPC handlers
 */
export function cleanupAppHandlers(): void {
  ipcMain.removeHandler('app:get-path');
  ipcMain.removeHandler('app:get-version');
  ipcMain.removeHandler('app:open-logs-folder');
  ipcMain.removeHandler('app:clipboard-write');
  ipcMain.removeHandler('app:clipboard-write-image');
  ipcMain.removeHandler('app:save-file-binary');
  ipcMain.removeHandler('app:get-auto-launch');
  ipcMain.removeHandler('app:set-auto-launch');
  ipcMain.removeHandler('app:get-backend-port');
  ipcMain.removeHandler('app:list-log-files');
  ipcMain.removeHandler('app:read-log-file');
}
