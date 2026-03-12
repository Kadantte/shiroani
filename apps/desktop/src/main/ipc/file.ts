import fs from 'node:fs';
import path from 'node:path';
import { ipcMain, app } from 'electron';
import { createLogger } from '@shiroani/shared';

const logger = createLogger('IPC:File');

/**
 * Allowed base directories for JSON file read/write operations.
 * Restricts filesystem access to prevent path traversal attacks.
 */
function getAllowedDirectories(): string[] {
  return [
    app.getPath('userData'),
    app.getPath('documents'),
    app.getPath('downloads'),
    app.getPath('desktop'),
  ];
}

/**
 * Security: Validate that the file path ends with .json and resides
 * within one of the allowed directories.
 */
function validateJsonPath(filePath: unknown): asserts filePath is string {
  if (typeof filePath !== 'string' || filePath.trim().length === 0) {
    throw new Error('Invalid file path: must be a non-empty string');
  }

  if (path.extname(filePath).toLowerCase() !== '.json') {
    throw new Error('Invalid file path: must end in .json');
  }

  const resolved = path.resolve(filePath);
  const allowed = getAllowedDirectories();

  const isAllowed = allowed.some(dir => resolved.startsWith(dir + path.sep) || resolved === dir);
  if (!isAllowed) {
    logger.warn(`[security] Blocked file access outside allowed directories: ${resolved}`);
    throw new Error('Invalid file path: outside allowed directories');
  }
}

/**
 * Register file IPC handlers
 */
export function registerFileHandlers(): void {
  ipcMain.handle('file:write-json', async (_event, filePath: string, jsonString: string) => {
    try {
      validateJsonPath(filePath);

      if (typeof jsonString !== 'string') {
        throw new Error('Invalid data: jsonString must be a string');
      }

      fs.writeFileSync(filePath, jsonString, 'utf-8');
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error writing file';
      throw new Error(message, { cause: error });
    }
  });

  ipcMain.handle('file:read-json', async (_event, filePath: string) => {
    try {
      validateJsonPath(filePath);

      return fs.readFileSync(filePath, 'utf-8');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error reading file';
      throw new Error(message, { cause: error });
    }
  });
}

/**
 * Clean up file IPC handlers
 */
export function cleanupFileHandlers(): void {
  ipcMain.removeHandler('file:write-json');
  ipcMain.removeHandler('file:read-json');
}
