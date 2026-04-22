import { ipcMain } from 'electron';
import type { NotificationSettings } from '@shiroani/shared';
import {
  getNotificationSettings,
  updateNotificationSettings,
  getSubscriptions,
  addSubscription,
  removeSubscription,
  toggleSubscription,
  isSubscribed,
} from '../notification-service';
import { handle, handleWithFallback } from './with-ipc-handler';
import {
  notificationsGetSettingsSchema,
  notificationsUpdateSettingsSchema,
  notificationsGetSubscriptionsSchema,
  notificationsAddSubscriptionSchema,
  notificationsRemoveSubscriptionSchema,
  notificationsToggleSubscriptionSchema,
  notificationsIsSubscribedSchema,
} from './schemas';

/**
 * Register notification IPC handlers
 */
export function registerNotificationHandlers(): void {
  handleWithFallback(
    'notifications:get-settings',
    () => {
      return getNotificationSettings();
    },
    () => undefined as unknown as NotificationSettings,
    { schema: notificationsGetSettingsSchema }
  );

  handle(
    'notifications:update-settings',
    (_event, updates) => {
      return updateNotificationSettings(updates);
    },
    { schema: notificationsUpdateSettingsSchema }
  );

  handleWithFallback(
    'notifications:get-subscriptions',
    () => {
      return getSubscriptions();
    },
    () => [],
    { schema: notificationsGetSubscriptionsSchema }
  );

  handle(
    'notifications:add-subscription',
    (_event, subscription) => {
      return addSubscription(subscription);
    },
    { schema: notificationsAddSubscriptionSchema }
  );

  handle(
    'notifications:remove-subscription',
    (_event, anilistId) => {
      return removeSubscription(anilistId);
    },
    { schema: notificationsRemoveSubscriptionSchema }
  );

  handle(
    'notifications:toggle-subscription',
    (_event, anilistId) => {
      return toggleSubscription(anilistId);
    },
    { schema: notificationsToggleSubscriptionSchema }
  );

  handleWithFallback(
    'notifications:is-subscribed',
    (_event, anilistId) => {
      return isSubscribed(anilistId);
    },
    () => false,
    { schema: notificationsIsSubscribedSchema }
  );
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
