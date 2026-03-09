import { ipcMain } from 'electron';
import { createLogger } from '@shiroani/shared';
import type { NotificationSettings } from '@shiroani/shared';
import { getNotificationSettings, updateNotificationSettings } from '../notification-service';

const logger = createLogger('IPC:Notifications');

/**
 * Register notification IPC handlers
 */
export function registerNotificationHandlers(): void {
  ipcMain.handle('notifications:get-settings', () => {
    return getNotificationSettings();
  });

  ipcMain.handle(
    'notifications:update-settings',
    (_event, updates: Partial<NotificationSettings>) => {
      try {
        return updateNotificationSettings(updates);
      } catch (error) {
        logger.error('Failed to update notification settings:', error);
        throw error;
      }
    }
  );
}

/**
 * Clean up notification IPC handlers
 */
export function cleanupNotificationHandlers(): void {
  ipcMain.removeHandler('notifications:get-settings');
  ipcMain.removeHandler('notifications:update-settings');
}
