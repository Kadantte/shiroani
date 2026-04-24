import { ipcRenderer } from 'electron';
import type { ElectronAPI, NotificationSettings, NotificationSubscription } from '@shiroani/shared';
import { createIpcListener } from './_shared';

export const notificationsApi: ElectronAPI['notifications'] = {
  getSettings: () =>
    ipcRenderer.invoke('notifications:get-settings') as Promise<NotificationSettings>,
  updateSettings: (updates: Partial<NotificationSettings>) =>
    ipcRenderer.invoke('notifications:update-settings', updates) as Promise<NotificationSettings>,
  getSubscriptions: () =>
    ipcRenderer.invoke('notifications:get-subscriptions') as Promise<NotificationSubscription[]>,
  addSubscription: (subscription: NotificationSubscription) =>
    ipcRenderer.invoke('notifications:add-subscription', subscription) as Promise<
      NotificationSubscription[]
    >,
  removeSubscription: (anilistId: number) =>
    ipcRenderer.invoke('notifications:remove-subscription', anilistId) as Promise<
      NotificationSubscription[]
    >,
  toggleSubscription: (anilistId: number) =>
    ipcRenderer.invoke('notifications:toggle-subscription', anilistId) as Promise<
      NotificationSubscription[]
    >,
  isSubscribed: (anilistId: number) =>
    ipcRenderer.invoke('notifications:is-subscribed', anilistId) as Promise<boolean>,
  onClicked: createIpcListener<{ mediaId: number; episode: number }>('notifications:clicked'),
};
