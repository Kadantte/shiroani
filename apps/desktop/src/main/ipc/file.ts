import fs from 'node:fs';
import path from 'node:path';
import { ipcMain } from 'electron';

/**
 * Security: Validate that the file path ends with .json
 */
function validateJsonPath(filePath: unknown): asserts filePath is string {
  if (typeof filePath !== 'string' || filePath.trim().length === 0) {
    throw new Error('Invalid file path: must be a non-empty string');
  }

  if (path.extname(filePath).toLowerCase() !== '.json') {
    throw new Error('Invalid file path: must end in .json');
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
