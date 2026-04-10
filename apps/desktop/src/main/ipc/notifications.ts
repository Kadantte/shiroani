import { ipcMain } from 'electron';
import type { NotificationSettings, NotificationSubscription } from '@shiroani/shared';
import { createMainLogger } from '../logger';
import {
  getNotificationSettings,
  updateNotificationSettings,
  getSubscriptions,
  addSubscription,
  removeSubscription,
  toggleSubscription,
  isSubscribed,
} from '../notification-service';

const logger = createMainLogger('IPC:Notifications');

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

  ipcMain.handle('notifications:get-subscriptions', () => {
    return getSubscriptions();
  });

  ipcMain.handle(
    'notifications:add-subscription',
    (_event, subscription: NotificationSubscription) => {
      try {
        return addSubscription(subscription);
      } catch (error) {
        logger.error('Failed to add notification subscription:', error);
        throw error;
      }
    }
  );

  ipcMain.handle('notifications:remove-subscription', (_event, anilistId: number) => {
    try {
      return removeSubscription(anilistId);
    } catch (error) {
      logger.error('Failed to remove notification subscription:', error);
      throw error;
    }
  });

  ipcMain.handle('notifications:toggle-subscription', (_event, anilistId: number) => {
    try {
      return toggleSubscription(anilistId);
    } catch (error) {
      logger.error('Failed to toggle notification subscription:', error);
      throw error;
    }
  });

  ipcMain.handle('notifications:is-subscribed', (_event, anilistId: number) => {
    return isSubscribed(anilistId);
  });
}

/**
 * Clean up notification IPC handlers
 */
export function cleanupNotificationHandlers(): void {
  ipcMain.removeHandler('notifications:get-settings');
  ipcMain.removeHandler('notifications:update-settings');
  ipcMain.removeHandler('notifications:get-subscriptions');
  ipcMain.removeHandler('notifications:add-subscription');
  ipcMain.removeHandler('notifications:remove-subscription');
  ipcMain.removeHandler('notifications:toggle-subscription');
  ipcMain.removeHandler('notifications:is-subscribed');
}
