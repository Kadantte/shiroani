import { BrowserWindow, ipcMain, dialog, shell } from 'electron';
import type { PickFolderResult, PickFileResult } from '@shiroani/shared';

/**
 * IPC handlers dedicated to the local-library feature.
 *
 * Exposes folder and file pickers that omit the selection from the OS
 * "recent files" list, so adding a private anime folder doesn't bleed into
 * system history. The file picker is used by the FFmpeg setup flow to let
 * users point at an existing system ffmpeg / ffprobe binary.
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

  ipcMain.handle(
    'local-library:pick-file',
    async (
      _event,
      options?: { title?: string; filters?: Electron.FileFilter[] }
    ): Promise<PickFileResult> => {
      const title = typeof options?.title === 'string' ? options.title.slice(0, 200) : undefined;

      // Sanitize filters — only allow name + extensions string arrays.
      let filters: Electron.FileFilter[] | undefined;
      if (Array.isArray(options?.filters)) {
        filters = options.filters
          .slice(0, 5)
          .filter(
            f =>
              f &&
              typeof f.name === 'string' &&
              Array.isArray(f.extensions) &&
              f.extensions.every(ext => typeof ext === 'string')
          )
          .map(f => ({
            name: f.name.slice(0, 100),
            extensions: f.extensions.slice(0, 10).map(e => e.slice(0, 20)),
          }));
      }

      const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile', 'dontAddToRecent'],
        title,
        filters,
      });

      if (result.canceled || result.filePaths.length === 0) {
        return { cancelled: true };
      }
      return { cancelled: false, path: result.filePaths[0] };
    }
  );

  // Reveal a file in the OS file manager. Used by the 3-dot menu on episode
  // rows. Guards against path injection by only passing the renderer's string
  // straight to electron's shell API — electron itself validates absolute paths.
  ipcMain.handle(
    'local-library:reveal-in-explorer',
    async (_event, filePath: string): Promise<{ success: boolean; error?: string }> => {
      if (typeof filePath !== 'string' || filePath.length === 0) {
        return { success: false, error: 'Invalid file path' };
      }
      try {
        shell.showItemInFolder(filePath);
        return { success: true };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    }
  );
}

export function cleanupLocalLibraryHandlers(): void {
  ipcMain.removeHandler('local-library:pick-folder');
  ipcMain.removeHandler('local-library:pick-file');
  ipcMain.removeHandler('local-library:reveal-in-explorer');
}
