import { ipcMain } from 'electron';
import { createLogger } from '@shiroani/shared';
import type { AuthState } from '@shiroani/shared';
import { getAuthState, startDiscordLogin, logout, refreshAccessToken } from '../auth-service';

const logger = createLogger('IPC:Auth');

/**
 * Register Discord Auth IPC handlers
 */
export function registerAuthHandlers(): void {
  ipcMain.handle('auth:get-state', (): AuthState => {
    return getAuthState();
  });

  ipcMain.handle('auth:login-discord', async () => {
    try {
      await startDiscordLogin();
    } catch (error) {
      logger.error('Discord login failed:', error);
      throw error;
    }
  });

  ipcMain.handle('auth:logout', () => {
    logout();
  });

  ipcMain.handle('auth:refresh-token', async (): Promise<AuthState> => {
    try {
      return await refreshAccessToken();
    } catch (error) {
      logger.error('Token refresh failed:', error);
      throw error;
    }
  });
}

/**
 * Clean up Discord Auth IPC handlers
 */
export function cleanupAuthHandlers(): void {
  ipcMain.removeHandler('auth:get-state');
  ipcMain.removeHandler('auth:login-discord');
  ipcMain.removeHandler('auth:logout');
  ipcMain.removeHandler('auth:refresh-token');
}
