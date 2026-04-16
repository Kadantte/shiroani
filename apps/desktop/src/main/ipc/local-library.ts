import { BrowserWindow, ipcMain, dialog } from 'electron';
import type { PickFolderResult } from '@shiroani/shared';

/**
 * IPC handlers dedicated to the local-library feature.
 *
 * Exposes a folder picker that omits the selection from the OS "recent files"
 * list, so adding a private anime folder doesn't bleed into system history.
 */
export function registerLocalLibraryHandlers(mainWindow: BrowserWindow): void {
  ipcMain.handle('local-library:pick-folder', async (): Promise<PickFolderResult> => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory', 'dontAddToRecent'],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { cancelled: true };
    }

    return { cancelled: false, path: result.filePaths[0] };
  });
}

export function cleanupLocalLibraryHandlers(): void {
  ipcMain.removeHandler('local-library:pick-folder');
}
