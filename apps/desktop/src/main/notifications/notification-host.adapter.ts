import { Injectable } from '@nestjs/common';
import { Notification, BrowserWindow, nativeImage } from 'electron';
import https from 'https';
import type { AiringAnime, NotificationSettings } from '@shiroani/shared';
import { NotificationHostPort } from '../../modules/notifications/notification-host.port';
import { getTitle, buildNotificationBody } from '../../modules/notifications/notification-logic';
import {
  scheduleToastsOnQuit,
  clearScheduledToasts,
  logWindowsToastDiagnostics,
} from './win-scheduled-notifications';
import { createMainLogger } from '../logging/logger';

const logger = createMainLogger('NotificationHostAdapter');

/**
 * Electron implementation of `NotificationHostPort`. The main-window reference
 * is injected at bootstrap via `setTargetWindow` so the adapter can route
 * notification clicks back to the renderer.
 */
@Injectable()
export class ElectronNotificationHost extends NotificationHostPort {
  private targetWindow: BrowserWindow | null = null;

  setTargetWindow(window: BrowserWindow | null): void {
    this.targetWindow = window;
  }

  async showAiringNotification(airing: AiringAnime, settings: NotificationSettings): Promise<void> {
    const title = getTitle(airing.media);
    const minutesLeft = Math.round((airing.airingAt - Date.now() / 1000) / 60);
    const body = buildNotificationBody(airing.episode, minutesLeft);

    let icon: Electron.NativeImage | undefined;
    const coverUrl = airing.media.coverImage.large || airing.media.coverImage.medium;
    if (coverUrl) {
      const img = await downloadImage(coverUrl);
      if (img) {
        icon = img;
      } else {
        logger.warn(`Failed to download notification icon for "${title}"`);
      }
    }

    const notification = new Notification({
      title,
      body,
      ...(icon ? { icon } : {}),
      silent: !settings.useSystemSound,
    });

    notification.on('click', () => {
      logger.info(`Notification clicked: "${title}" Ep ${airing.episode}`);
      const win = this.targetWindow;
      if (win && !win.isDestroyed()) {
        if (win.isMinimized()) win.restore();
        win.show();
        win.focus();
        win.webContents.send('notifications:clicked', {
          mediaId: airing.media.id,
          episode: airing.episode,
        });
      } else {
        logger.warn('Notification clicked but main window is unavailable');
      }
    });

    notification.show();
    logger.info(`Notification sent: "${title}" Ep ${airing.episode} (in ${minutesLeft}min)`);
  }

  async scheduleToastsOnQuit(
    schedule: AiringAnime[],
    settings: NotificationSettings,
    notifyIds: Set<number>,
    sentKeys: Set<string>
  ): Promise<void> {
    if (process.platform !== 'win32') return;
    await scheduleToastsOnQuit(schedule, settings, notifyIds, sentKeys);
  }

  async clearScheduledToasts(): Promise<void> {
    if (process.platform !== 'win32') return;
    await clearScheduledToasts();
  }

  async logScheduledToastDiagnostics(): Promise<void> {
    if (process.platform !== 'win32') return;
    await logWindowsToastDiagnostics();
  }
}

/** Download an image from a URL and return a nativeImage. Only allows https: URLs. */
function downloadImage(url: string): Promise<Electron.NativeImage | null> {
  return new Promise(resolve => {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return resolve(null);
    }

    if (parsed.protocol !== 'https:') {
      return resolve(null);
    }

    const timeout = setTimeout(() => {
      req.destroy();
      resolve(null);
    }, 5000);

    const req = https
      .get(url, res => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => {
          clearTimeout(timeout);
          try {
            const buffer = Buffer.concat(chunks);
            const image = nativeImage.createFromBuffer(buffer);
            resolve(image.isEmpty() ? null : image);
          } catch {
            resolve(null);
          }
        });
        res.on('error', () => {
          clearTimeout(timeout);
          resolve(null);
        });
      })
      .on('error', () => {
        clearTimeout(timeout);
        resolve(null);
      });
  });
}
