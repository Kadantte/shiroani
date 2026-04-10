import { Notification, BrowserWindow, nativeImage } from 'electron';
import { getWeekStart, toLocalDate } from '@shiroani/shared';
import type { INestApplication } from '@nestjs/common';
import type { AiringAnime, NotificationSettings, NotificationSubscription } from '@shiroani/shared';
import { ScheduleService } from '../modules/schedule/schedule.service';
import { LibraryService } from '../modules/library/library.service';
import { store } from './store';
import https from 'https';
import {
  CHECK_INTERVAL_MS,
  SCHEDULE_CACHE_TTL_MS,
  isInQuietHours,
  getTitle,
  shouldNotifyForAiring,
  pruneSentSet,
  buildNotificationBody,
  mergeSettings,
  sanitizeSettingsUpdate,
  updateLastSeenTimestamps,
  pruneStaleSubscriptions,
} from './notification-logic';
import { scheduleToastsOnQuit, clearScheduledToasts } from './win-scheduled-notifications';
import { createMainLogger } from './logger';

const logger = createMainLogger('NotificationService');

const STORE_KEY = 'notification-settings';
const SENT_STORE_KEY = 'notification-sent';
const SCHEDULE_CACHE_STORE_KEY = 'notification-cached-schedule';

let checkInterval: ReturnType<typeof setInterval> | null = null;
let initialTimeout: ReturnType<typeof setTimeout> | null = null;
let scheduleService: ScheduleService | null = null;
let libraryService: LibraryService | null = null;
let targetWindow: BrowserWindow | null = null;

// Deduplication: track which notifications we've already sent (persisted across restarts)
let sentNotifications = new Set<string>();

function loadSentNotifications(): void {
  const stored = store.get(SENT_STORE_KEY);
  const valid = Array.isArray(stored)
    ? stored.filter((v): v is string => typeof v === 'string')
    : [];
  sentNotifications = new Set(valid);
}

function saveSentNotifications(): void {
  store.set(SENT_STORE_KEY, [...sentNotifications]);
}

function pruneSentNotifications(): void {
  sentNotifications = pruneSentSet(sentNotifications);
  saveSentNotifications();
}

// Schedule cache
let cachedSchedule: AiringAnime[] | null = null;
let cacheTimestamp = 0;

function getSettings(): NotificationSettings {
  const stored = store.get(STORE_KEY) as Partial<NotificationSettings> | undefined;
  return mergeSettings(stored);
}

function saveSettings(settings: NotificationSettings): void {
  store.set(STORE_KEY, settings);
}

/** Fetch and cache the weekly schedule */
async function getScheduleData(): Promise<AiringAnime[]> {
  const now = Date.now();
  if (cachedSchedule && now - cacheTimestamp < SCHEDULE_CACHE_TTL_MS) {
    return cachedSchedule;
  }

  if (!scheduleService) {
    logger.warn('Schedule service not available, skipping fetch');
    return [];
  }

  try {
    const monday = toLocalDate(getWeekStart());
    const result = await scheduleService.getWeekly(monday);
    const allAiring: AiringAnime[] = [];
    for (const entries of Object.values(result.schedule)) {
      allAiring.push(...entries);
    }
    cachedSchedule = allAiring;
    cacheTimestamp = now;
    store.set(SCHEDULE_CACHE_STORE_KEY, allAiring);
    logger.info(`Schedule cache refreshed: ${allAiring.length} airing entries`);
    return allAiring;
  } catch (error) {
    logger.error('Failed to fetch schedule for notifications:', error);
    return cachedSchedule ?? [];
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

/** Main check: cross-reference library + subscriptions with schedule and fire notifications */
async function checkAndNotify(): Promise<void> {
  const settings = getSettings();
  if (!settings.enabled || !libraryService || !scheduleService) return;

  // Check quiet hours
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  if (isInQuietHours(settings, currentMinutes)) {
    logger.info('Skipping notification check: quiet hours active');
    return;
  }

  // Build a set of AniList IDs to notify: library watching + enabled subscriptions
  const notifyIds = new Set<number>();

  const watchingEntries = libraryService.getAllEntries('watching');
  for (const entry of watchingEntries) {
    if (entry.anilistId) notifyIds.add(entry.anilistId);
  }

  for (const sub of settings.subscriptions) {
    if (sub.enabled) notifyIds.add(sub.anilistId);
  }

  if (notifyIds.size === 0) {
    logger.info('Skipping notification check: no anime to monitor');
    return;
  }

  const airingData = await getScheduleData();

  // Update lastSeenAt for subscriptions that appear in this week's schedule
  const scheduleMediaIds = new Set(airingData.map(a => a.media.id));
  const updatedSubs = updateLastSeenTimestamps(settings.subscriptions, scheduleMediaIds);
  if (updatedSubs !== settings.subscriptions) {
    settings.subscriptions = updatedSubs;
    saveSettings(settings);
  }

  const nowUnix = Math.floor(Date.now() / 1000);
  const leadTimeSeconds = settings.leadTimeMinutes * 60;

  let notifiedCount = 0;
  for (const airing of airingData) {
    if (!notifyIds.has(airing.media.id)) continue;

    const timeUntilAiring = airing.airingAt - nowUnix;

    if (!shouldNotifyForAiring(timeUntilAiring, leadTimeSeconds)) continue;

    const dedupeKey = `${airing.media.id}:${airing.episode}`;
    if (sentNotifications.has(dedupeKey)) continue;

    sentNotifications.add(dedupeKey);
    await showNotification(airing, settings);
    notifiedCount++;
  }

  if (notifiedCount > 0) {
    logger.info(`Notification check complete: ${notifiedCount} notification(s) sent`);
  }

  // Prune and batch-save after all notifications in this cycle
  sentNotifications = pruneSentSet(sentNotifications);
  saveSentNotifications();
}

/** Show a native notification for an airing anime */
async function showNotification(
  airing: AiringAnime,
  settings: NotificationSettings
): Promise<void> {
  const title = getTitle(airing.media);
  const minutesLeft = Math.round((airing.airingAt - Date.now() / 1000) / 60);
  const body = buildNotificationBody(airing.episode, minutesLeft);

  // Try to download cover image for the notification icon
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
    if (targetWindow && !targetWindow.isDestroyed()) {
      if (targetWindow.isMinimized()) targetWindow.restore();
      targetWindow.show();
      targetWindow.focus();
      targetWindow.webContents.send('notifications:clicked', {
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

/** Start the periodic check interval */
function startChecking(): void {
  stopChecking();
  const settings = getSettings();
  if (!settings.enabled) return;

  logger.info(
    `Starting notification checks (every ${CHECK_INTERVAL_MS / 1000}s, lead time: ${settings.leadTimeMinutes}min)`
  );

  // Run an initial check shortly after starting
  initialTimeout = setTimeout(() => {
    initialTimeout = null;
    checkAndNotify();
  }, 10_000);

  checkInterval = setInterval(() => {
    checkAndNotify();
  }, CHECK_INTERVAL_MS);
}

/** Stop the periodic check interval */
function stopChecking(): void {
  if (initialTimeout) {
    clearTimeout(initialTimeout);
    initialTimeout = null;
  }
  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
    logger.info('Notification checks stopped');
  }
}

// ========================================
// Windows scheduled notifications helpers
// ========================================

/** Get schedule data for quit-time toast scheduling (memory cache or persisted fallback). */
function getScheduleForQuit(): AiringAnime[] {
  if (cachedSchedule) return cachedSchedule;
  const stored = store.get(SCHEDULE_CACHE_STORE_KEY);
  return Array.isArray(stored) ? (stored as AiringAnime[]) : [];
}

/** Build the set of AniList IDs to monitor (library watching + enabled subscriptions). */
function getNotifyIds(): Set<number> {
  const ids = new Set<number>();
  if (libraryService) {
    for (const entry of libraryService.getAllEntries('watching')) {
      if (entry.anilistId) ids.add(entry.anilistId);
    }
  }
  const settings = getSettings();
  for (const sub of settings.subscriptions) {
    if (sub.enabled) ids.add(sub.anilistId);
  }
  return ids;
}

// ========================================
// Subscription CRUD
// ========================================

export function getSubscriptions(): NotificationSubscription[] {
  return getSettings().subscriptions;
}

export function addSubscription(
  subscription: NotificationSubscription
): NotificationSubscription[] {
  const settings = getSettings();
  // Avoid duplicates
  if (settings.subscriptions.some(s => s.anilistId === subscription.anilistId)) {
    logger.info(`Subscription already exists for anilistId=${subscription.anilistId}, skipping`);
    return settings.subscriptions;
  }
  settings.subscriptions.push(subscription);
  saveSettings(settings);
  logger.info(`Subscription added: "${subscription.title}" (anilistId=${subscription.anilistId})`);
  return settings.subscriptions;
}

export function removeSubscription(anilistId: number): NotificationSubscription[] {
  const settings = getSettings();
  const before = settings.subscriptions.length;
  settings.subscriptions = settings.subscriptions.filter(s => s.anilistId !== anilistId);
  saveSettings(settings);
  if (settings.subscriptions.length < before) {
    logger.info(`Subscription removed: anilistId=${anilistId}`);
  } else {
    logger.warn(`Subscription not found for removal: anilistId=${anilistId}`);
  }
  return settings.subscriptions;
}

export function toggleSubscription(anilistId: number): NotificationSubscription[] {
  const settings = getSettings();
  const sub = settings.subscriptions.find(s => s.anilistId === anilistId);
  if (sub) {
    sub.enabled = !sub.enabled;
    saveSettings(settings);
    logger.info(`Subscription toggled: anilistId=${anilistId}, enabled=${sub.enabled}`);
  } else {
    logger.warn(`Subscription not found for toggle: anilistId=${anilistId}`);
  }
  return settings.subscriptions;
}

export function isSubscribed(anilistId: number): boolean {
  const settings = getSettings();
  return settings.subscriptions.some(s => s.anilistId === anilistId);
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

  // Load persisted sent notifications and prune stale entries
  loadSentNotifications();
  const loadedCount = sentNotifications.size;
  pruneSentNotifications();
  logger.info(
    `Loaded ${loadedCount} sent notification(s), ${sentNotifications.size} after pruning`
  );

  const settings = getSettings();

  // Prune stale subscriptions (anime not seen in schedule for 14+ days)
  const { kept, pruned } = pruneStaleSubscriptions(settings.subscriptions);
  if (pruned.length > 0) {
    settings.subscriptions = kept;
    saveSettings(settings);
    logger.info(
      `Pruned ${pruned.length} stale subscription(s): ${pruned.map(s => s.title).join(', ')}`
    );
  }

  // Clear any Windows scheduled toasts — the in-app system takes over
  if (process.platform === 'win32') {
    clearScheduledToasts().catch(error => {
      logger.warn('Failed to clear scheduled Windows toasts on init:', error);
    });
  }

  logger.info(
    `NotificationService initialized (enabled: ${settings.enabled}, leadTime: ${settings.leadTimeMinutes}min, subscriptions: ${settings.subscriptions.length})`
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
  const next = sanitizeSettingsUpdate(current, updates);
  saveSettings(next);

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

export async function cleanupNotificationService(): Promise<void> {
  // Schedule Windows toast notifications before stopping (best-effort)
  if (process.platform === 'win32') {
    const settings = getSettings();
    if (settings.enabled) {
      try {
        const schedule = getScheduleForQuit();
        const notifyIds = getNotifyIds();
        await scheduleToastsOnQuit(schedule, settings, notifyIds, sentNotifications);
      } catch (error) {
        logger.warn('Failed to schedule Windows toasts on quit:', error);
      }
    }
  }

  stopChecking();
  saveSentNotifications();
  targetWindow = null;
  scheduleService = null;
  libraryService = null;
  cachedSchedule = null;
  logger.info('NotificationService cleaned up');
}
