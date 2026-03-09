import { Notification, BrowserWindow, nativeImage } from 'electron';
import { createLogger } from '@shiroani/shared';
import type { INestApplication } from '@nestjs/common';
import type { AiringAnime, NotificationSettings } from '@shiroani/shared';
import { ScheduleService } from '../modules/schedule/schedule.service';
import { LibraryService } from '../modules/library/library.service';
import { store } from './store';
import https from 'https';
import http from 'http';

const logger = createLogger('NotificationService');

const STORE_KEY = 'notification-settings';
const CHECK_INTERVAL_MS = 5 * 60 * 1000; // Check every 5 minutes
const SCHEDULE_CACHE_TTL_MS = 30 * 60 * 1000; // Re-fetch schedule every 30 minutes

const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: false,
  leadTimeMinutes: 15,
};

let checkInterval: ReturnType<typeof setInterval> | null = null;
let scheduleService: ScheduleService | null = null;
let libraryService: LibraryService | null = null;
let targetWindow: BrowserWindow | null = null;

// Deduplication: track which notifications we've already sent this session
const sentNotifications = new Set<string>();

// Schedule cache
let cachedSchedule: AiringAnime[] | null = null;
let cacheTimestamp = 0;

function getSettings(): NotificationSettings {
  const stored = store.get(STORE_KEY) as Partial<NotificationSettings> | undefined;
  if (!stored) return { ...DEFAULT_SETTINGS };
  return {
    enabled: typeof stored.enabled === 'boolean' ? stored.enabled : DEFAULT_SETTINGS.enabled,
    leadTimeMinutes:
      typeof stored.leadTimeMinutes === 'number'
        ? stored.leadTimeMinutes
        : DEFAULT_SETTINGS.leadTimeMinutes,
  };
}

function saveSettings(settings: NotificationSettings): void {
  store.set(STORE_KEY, settings);
}

/** Get the current week's Monday as YYYY-MM-DD */
function getCurrentWeekMonday(): string {
  const now = new Date();
  const dow = now.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  const y = monday.getFullYear();
  const m = String(monday.getMonth() + 1).padStart(2, '0');
  const d = String(monday.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Fetch and cache the weekly schedule */
async function getScheduleData(): Promise<AiringAnime[]> {
  const now = Date.now();
  if (cachedSchedule && now - cacheTimestamp < SCHEDULE_CACHE_TTL_MS) {
    return cachedSchedule;
  }

  if (!scheduleService) return [];

  try {
    const monday = getCurrentWeekMonday();
    const result = await scheduleService.getWeekly(monday);
    const allAiring: AiringAnime[] = [];
    for (const entries of Object.values(result.schedule)) {
      allAiring.push(...entries);
    }
    cachedSchedule = allAiring;
    cacheTimestamp = now;
    return allAiring;
  } catch (error) {
    logger.error('Failed to fetch schedule for notifications:', error);
    return cachedSchedule ?? [];
  }
}

/** Download an image from a URL and return a nativeImage */
function downloadImage(url: string): Promise<Electron.NativeImage | null> {
  return new Promise(resolve => {
    const timeout = setTimeout(() => resolve(null), 5000);
    const client = url.startsWith('https') ? https : http;

    client
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

/** Get a display title for an anime */
function getTitle(media: AiringAnime['media']): string {
  return media.title.english || media.title.romaji || media.title.native || 'Nieznane anime';
}

/** Main check: cross-reference library with schedule and fire notifications */
async function checkAndNotify(): Promise<void> {
  const settings = getSettings();
  if (!settings.enabled || !libraryService || !scheduleService) return;

  const watchingEntries = libraryService.getAllEntries('watching');
  if (watchingEntries.length === 0) return;

  // Build a set of AniList IDs from watching entries
  const watchingIds = new Set<number>();
  for (const entry of watchingEntries) {
    if (entry.anilistId) watchingIds.add(entry.anilistId);
  }
  if (watchingIds.size === 0) return;

  const airingData = await getScheduleData();
  const nowUnix = Math.floor(Date.now() / 1000);
  const leadTimeSeconds = settings.leadTimeMinutes * 60;

  for (const airing of airingData) {
    if (!watchingIds.has(airing.media.id)) continue;

    const timeUntilAiring = airing.airingAt - nowUnix;

    // Only notify if within the lead time window and not already aired
    if (timeUntilAiring <= 0 || timeUntilAiring > leadTimeSeconds) continue;

    const dedupeKey = `${airing.media.id}:${airing.episode}`;
    if (sentNotifications.has(dedupeKey)) continue;

    sentNotifications.add(dedupeKey);
    await showNotification(airing);
  }
}

/** Show a native notification for an airing anime */
async function showNotification(airing: AiringAnime): Promise<void> {
  const title = getTitle(airing.media);
  const minutesLeft = Math.round((airing.airingAt - Date.now() / 1000) / 60);
  const body =
    minutesLeft <= 1
      ? `Odcinek ${airing.episode} nadawany teraz!`
      : `Odcinek ${airing.episode} za ${minutesLeft} min`;

  // Try to download cover image for the notification icon
  let icon: Electron.NativeImage | undefined;
  const coverUrl = airing.media.coverImage.large || airing.media.coverImage.medium;
  if (coverUrl) {
    const img = await downloadImage(coverUrl);
    if (img) icon = img;
  }

  const notification = new Notification({
    title,
    body,
    ...(icon ? { icon } : {}),
    silent: false,
  });

  notification.on('click', () => {
    if (targetWindow && !targetWindow.isDestroyed()) {
      if (targetWindow.isMinimized()) targetWindow.restore();
      targetWindow.show();
      targetWindow.focus();
      // Notify renderer that a notification was clicked
      targetWindow.webContents.send('notifications:clicked', {
        mediaId: airing.media.id,
        episode: airing.episode,
      });
    }
  });

  notification.show();
  logger.info(`Notification sent: "${title}" Ep ${airing.episode} (in ${minutesLeft}min)`);
}

/** Start the periodic check interval */
function startChecking(): void {
  stopChecking();
  const settings = getSettings();
  if (!settings.enabled) return;

  logger.info(
    `Starting notification checks (every ${CHECK_INTERVAL_MS / 1000}s, lead time: ${settings.leadTimeMinutes}min)`
  );

  // Run an initial check shortly after starting
  setTimeout(() => checkAndNotify(), 10_000);

  checkInterval = setInterval(() => {
    checkAndNotify();
  }, CHECK_INTERVAL_MS);
}

/** Stop the periodic check interval */
function stopChecking(): void {
  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
    logger.info('Notification checks stopped');
  }
}

// ========================================
// Public API
// ========================================

export function initializeNotificationService(
  mainWindow: BrowserWindow,
  nestApp: INestApplication
): void {
  targetWindow = mainWindow;

  try {
    scheduleService = nestApp.get(ScheduleService);
    libraryService = nestApp.get(LibraryService);
  } catch (error) {
    logger.error('Failed to get NestJS services for notifications:', error);
    return;
  }

  const settings = getSettings();
  logger.info(
    `NotificationService initialized (enabled: ${settings.enabled}, leadTime: ${settings.leadTimeMinutes}min)`
  );

  if (settings.enabled) {
    startChecking();
  }
}

export function getNotificationSettings(): NotificationSettings {
  return getSettings();
}

export function updateNotificationSettings(
  updates: Partial<NotificationSettings>
): NotificationSettings {
  const current = getSettings();
  const next: NotificationSettings = {
    enabled: updates.enabled ?? current.enabled,
    leadTimeMinutes: updates.leadTimeMinutes ?? current.leadTimeMinutes,
  };
  saveSettings(next);

  // Invalidate schedule cache when settings change so a fresh fetch happens
  cachedSchedule = null;
  cacheTimestamp = 0;

  if (next.enabled) {
    startChecking();
  } else {
    stopChecking();
  }

  logger.info(
    `Notification settings updated: enabled=${next.enabled}, leadTime=${next.leadTimeMinutes}min`
  );
  return next;
}

export function cleanupNotificationService(): void {
  stopChecking();
  targetWindow = null;
  scheduleService = null;
  libraryService = null;
  sentNotifications.clear();
  cachedSchedule = null;
  logger.info('NotificationService cleaned up');
}
