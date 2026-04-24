import type { BrowserWindow } from 'electron';
import type { INestApplication } from '@nestjs/common';
import type { NotificationSettings, NotificationSubscription } from '@shiroani/shared';
import { NotificationsService, NotificationHostPort } from '../../modules/notifications';
import { ElectronNotificationHost } from './notification-host.adapter';
import { createMainLogger } from '../logging/logger';

const logger = createMainLogger('NotificationService');

/**
 * Thin host-side wrapper around the NestJS `NotificationsService`.
 *
 * All scheduling, persistence, and dispatch logic lives inside the NestJS
 * module; this file exists only to bind the Electron-owned main window to the
 * adapter and to provide a stable import surface for the IPC handlers.
 */
let notificationsService: NotificationsService | null = null;
let electronHost: ElectronNotificationHost | null = null;

function requireService(): NotificationsService {
  if (!notificationsService) {
    throw new Error('NotificationsService is not initialized');
  }
  return notificationsService;
}

export function initializeNotificationService(
  mainWindow: BrowserWindow,
  nestApp: INestApplication
): void {
  let service: NotificationsService;
  try {
    service = nestApp.get(NotificationsService);
  } catch (error) {
    logger.error('Failed to resolve NotificationsService from Nest container:', error);
    return;
  }

  try {
    const host = nestApp.get(NotificationHostPort);
    let resolvedHost: ElectronNotificationHost | null = null;
    if (host instanceof ElectronNotificationHost) {
      resolvedHost = host;
      resolvedHost.setTargetWindow(mainWindow);
    } else {
      logger.warn('NotificationHostPort is not the Electron adapter; window binding skipped');
    }

    service.initialize();

    notificationsService = service;
    electronHost = resolvedHost;
  } catch (error) {
    logger.error('Failed to initialize NotificationsService:', error);
    notificationsService = null;
    electronHost = null;
  }
}

export async function cleanupNotificationService(): Promise<void> {
  if (!notificationsService) return;
  try {
    await notificationsService.shutdown();
  } finally {
    electronHost?.setTargetWindow(null);
    electronHost = null;
    notificationsService = null;
  }
}

// ========================================
// IPC handler surface
// ========================================
//
// These re-exports preserve the call shape used by `ipc/notifications.ts` and
// its unit tests so nothing downstream has to change.

export function getNotificationSettings(): NotificationSettings {
  return requireService().getNotificationSettings();
}

export function updateNotificationSettings(
  updates: Partial<NotificationSettings>
): NotificationSettings {
  return requireService().updateNotificationSettings(updates);
}

export function getSubscriptions(): NotificationSubscription[] {
  return requireService().getSubscriptions();
}

export function addSubscription(
  subscription: NotificationSubscription
): NotificationSubscription[] {
  return requireService().addSubscription(subscription);
}

export function removeSubscription(anilistId: number): NotificationSubscription[] {
  return requireService().removeSubscription(anilistId);
}

export function toggleSubscription(anilistId: number): NotificationSubscription[] {
  return requireService().toggleSubscription(anilistId);
}

export function isSubscribed(anilistId: number): boolean {
  return requireService().isSubscribed(anilistId);
}
