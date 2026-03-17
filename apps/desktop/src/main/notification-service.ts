import { Notification, BrowserWindow, nativeImage } from 'electron';
import { createLogger, getWeekStart, toLocalDate } from '@shiroani/shared';
import type { INestApplication } from '@nestjs/common';
import type { AiringAnime, NotificationSettings, NotificationSubscription } from '@shiroani/shared';
import { ScheduleService } from '../modules/schedule/schedule.service';
import { LibraryService } from '../modules/library/library.service';
import { store } from './store';
import https from 'https';

const logger = createLogger('NotificationService');

const STORE_KEY = 'notification-settings';
const SENT_STORE_KEY = 'notification-sent';
const CHECK_INTERVAL_MS = 5 * 60 * 1000; // Check every 5 minutes
const SCHEDULE_CACHE_TTL_MS = 30 * 60 * 1000; // Re-fetch schedule every 30 minutes
const MISSED_WINDOW_MS = 30 * 60 * 1000; // Catch episodes missed within last 30 minutes

const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: false,
  leadTimeMinutes: 15,
  quietHours: {
    enabled: false,
    start: '23:00',
    end: '07:00',
  },
  useSystemSound: true,
  subscriptions: [],
};

let checkInterval: ReturnType<typeof setInterval> | null = null;
let initialTimeout: ReturnType<typeof setTimeout> | null = null;
let scheduleService: ScheduleService | null = null;
let libraryService: LibraryService | null = null;
let targetWindow: BrowserWindow | null = null;

// Deduplication: track which notifications we've already sent (persisted across restarts)
let sentNotifications = new Set<string>();

function loadSentNotifications(): void {
  const stored = store.get(SENT_STORE_KEY) as string[] | undefined;
  sentNotifications = new Set(stored ?? []);
}

function saveSentNotifications(): void {
  store.set(SENT_STORE_KEY, [...sentNotifications]);
}

/** Prune sent notification keys older than 24h based on naming convention */
function pruneSentNotifications(): void {
  // Keys are mediaId:episode — we can't age them without timestamps,
  // so just cap the set size. 500 entries covers weeks of usage.
  if (sentNotifications.size > 500) {
    const entries = [...sentNotifications];
    sentNotifications = new Set(entries.slice(entries.length - 200));
    saveSentNotifications();
  }
}

// Schedule cache
let cachedSchedule: AiringAnime[] | null = null;
let cacheTimestamp = 0;

function getSettings(): NotificationSettings {
  const stored = store.get(STORE_KEY) as Partial<NotificationSettings> | undefined;
  if (!stored) return { ...DEFAULT_SETTINGS };

  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    quietHours: {
      ...DEFAULT_SETTINGS.quietHours,
      ...(stored.quietHours ?? {}),
    },
    subscriptions: stored.subscriptions ?? DEFAULT_SETTINGS.subscriptions,
  };
}

function saveSettings(settings: NotificationSettings): void {
  store.set(STORE_KEY, settings);
}

/** Check if current time falls within quiet hours */
function isInQuietHours(settings: NotificationSettings): boolean {
  if (!settings.quietHours.enabled) return false;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [startH, startM] = settings.quietHours.start.split(':').map(Number);
  const [endH, endM] = settings.quietHours.end.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  if (startMinutes <= endMinutes) {
    // Same-day range (e.g. 09:00 - 17:00)
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  } else {
    // Overnight wrap (e.g. 23:00 - 07:00)
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }
}

/** Fetch and cache the weekly schedule */
async function getScheduleData(): Promise<AiringAnime[]> {
  const now = Date.now();
  if (cachedSchedule && now - cacheTimestamp < SCHEDULE_CACHE_TTL_MS) {
    return cachedSchedule;
  }

  if (!scheduleService) return [];

  try {
    const monday = toLocalDate(getWeekStart());
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

/** Get a display title for an anime */
function getTitle(media: AiringAnime['media']): string {
  return media.title.english || media.title.romaji || media.title.native || 'Nieznane anime';
}

/** Main check: cross-reference library + subscriptions with schedule and fire notifications */
async function checkAndNotify(): Promise<void> {
  const settings = getSettings();
  if (!settings.enabled || !libraryService || !scheduleService) return;

  // Check quiet hours
  if (isInQuietHours(settings)) return;

  // Build a set of AniList IDs to notify: library watching + enabled subscriptions
  const notifyIds = new Set<number>();

  const watchingEntries = libraryService.getAllEntries('watching');
  for (const entry of watchingEntries) {
    if (entry.anilistId) notifyIds.add(entry.anilistId);
  }

  for (const sub of settings.subscriptions) {
    if (sub.enabled) notifyIds.add(sub.anilistId);
  }

  if (notifyIds.size === 0) return;

  const airingData = await getScheduleData();
  const nowUnix = Math.floor(Date.now() / 1000);
  const leadTimeSeconds = settings.leadTimeMinutes * 60;
  const checkWindowSeconds = CHECK_INTERVAL_MS / 1000; // 5 minutes

  for (const airing of airingData) {
    if (!notifyIds.has(airing.media.id)) continue;

    const timeUntilAiring = airing.airingAt - nowUnix;

    // missedWindowSeconds: catch episodes that aired while app was closed (up to 30 min ago)
    const missedWindowSeconds = MISSED_WINDOW_MS / 1000;

    if (leadTimeSeconds === 0) {
      // Lead time 0: notify for anime airing within the check window OR recently missed
      if (timeUntilAiring < -missedWindowSeconds || timeUntilAiring > checkWindowSeconds) continue;
    } else {
      // Notify if within lead time OR recently aired (missed)
      if (timeUntilAiring < -missedWindowSeconds || timeUntilAiring > leadTimeSeconds) continue;
    }

    const dedupeKey = `${airing.media.id}:${airing.episode}`;
    if (sentNotifications.has(dedupeKey)) continue;

    sentNotifications.add(dedupeKey);
    saveSentNotifications();
    await showNotification(airing, settings);
  }
}

/** Show a native notification for an airing anime */
async function showNotification(
  airing: AiringAnime,
  settings: NotificationSettings
): Promise<void> {
  const title = getTitle(airing.media);
  const minutesLeft = Math.round((airing.airingAt - Date.now() / 1000) / 60);
  let body: string;
  if (minutesLeft < -1) {
    body = `Odcinek ${airing.episode} — nadawany ${Math.abs(minutesLeft)} min temu`;
  } else if (minutesLeft <= 1) {
    body = `Odcinek ${airing.episode} nadawany teraz!`;
  } else {
    body = `Odcinek ${airing.episode} za ${minutesLeft} min`;
  }

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
    silent: !settings.useSystemSound,
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
    return settings.subscriptions;
  }
  settings.subscriptions.push(subscription);
  saveSettings(settings);
  return settings.subscriptions;
}

export function removeSubscription(anilistId: number): NotificationSubscription[] {
  const settings = getSettings();
  settings.subscriptions = settings.subscriptions.filter(s => s.anilistId !== anilistId);
  saveSettings(settings);
  return settings.subscriptions;
}

export function toggleSubscription(anilistId: number): NotificationSubscription[] {
  const settings = getSettings();
  const sub = settings.subscriptions.find(s => s.anilistId === anilistId);
  if (sub) {
    sub.enabled = !sub.enabled;
    saveSettings(settings);
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
  pruneSentNotifications();

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
  const timeFormatRegex = /^\d{2}:\d{2}$/;

  // Validate and sanitize inputs before applying
  const sanitized: Partial<NotificationSettings> = {};

  if (updates.enabled !== undefined) {
    if (typeof updates.enabled === 'boolean') sanitized.enabled = updates.enabled;
  }
  if (updates.leadTimeMinutes !== undefined) {
    if (
      typeof updates.leadTimeMinutes === 'number' &&
      Number.isFinite(updates.leadTimeMinutes) &&
      updates.leadTimeMinutes >= 0 &&
      updates.leadTimeMinutes <= 1440
    ) {
      sanitized.leadTimeMinutes = updates.leadTimeMinutes;
    }
  }
  if (updates.useSystemSound !== undefined) {
    if (typeof updates.useSystemSound === 'boolean')
      sanitized.useSystemSound = updates.useSystemSound;
  }
  if (updates.subscriptions !== undefined) {
    sanitized.subscriptions = updates.subscriptions;
  }

  // Validate quiet hours
  let quietHoursUpdate: Partial<NotificationSettings['quietHours']> | undefined;
  if (updates.quietHours) {
    quietHoursUpdate = {};
    if (typeof updates.quietHours.enabled === 'boolean') {
      quietHoursUpdate.enabled = updates.quietHours.enabled;
    }
    if (
      typeof updates.quietHours.start === 'string' &&
      timeFormatRegex.test(updates.quietHours.start)
    ) {
      quietHoursUpdate.start = updates.quietHours.start;
    }
    if (
      typeof updates.quietHours.end === 'string' &&
      timeFormatRegex.test(updates.quietHours.end)
    ) {
      quietHoursUpdate.end = updates.quietHours.end;
    }
  }

  const next: NotificationSettings = {
    ...current,
    ...sanitized,
    quietHours: {
      ...current.quietHours,
      ...(quietHoursUpdate ?? {}),
    },
    subscriptions: sanitized.subscriptions ?? current.subscriptions,
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

// ========================================
// Debug API (for testing notifications locally)
// ========================================

export interface NotificationDebugStatus {
  settings: NotificationSettings;
  isCheckerRunning: boolean;
  hasScheduleService: boolean;
  hasLibraryService: boolean;
  cachedScheduleCount: number;
  cacheAgeSeconds: number | null;
  sentNotificationsCount: number;
  sentNotificationKeys: string[];
  watchingIds: number[];
  subscribedIds: number[];
}

export function getDebugStatus(): NotificationDebugStatus {
  const settings = getSettings();
  const watchingEntries = libraryService?.getAllEntries('watching') ?? [];
  const watchingIds = watchingEntries.filter(e => e.anilistId).map(e => e.anilistId!);

  return {
    settings,
    isCheckerRunning: checkInterval !== null || initialTimeout !== null,
    hasScheduleService: scheduleService !== null,
    hasLibraryService: libraryService !== null,
    cachedScheduleCount: cachedSchedule?.length ?? 0,
    cacheAgeSeconds: cacheTimestamp > 0 ? Math.round((Date.now() - cacheTimestamp) / 1000) : null,
    sentNotificationsCount: sentNotifications.size,
    sentNotificationKeys: [...sentNotifications],
    watchingIds,
    subscribedIds: settings.subscriptions.filter(s => s.enabled).map(s => s.anilistId),
  };
}

export interface NotificationDebugCheckResult {
  success: boolean;
  error?: string;
  checkedAt: string;
  notifyIdsCount: number;
  notifyIds: number[];
  scheduleCount: number;
  matchingAirings: Array<{
    mediaId: number;
    title: string;
    episode: number;
    airingAt: number;
    airingAtDate: string;
    timeUntilAiringSeconds: number;
    timeUntilAiringMinutes: number;
    wouldNotify: boolean;
    skipReason: string | null;
  }>;
}

export async function debugCheckNotifications(): Promise<NotificationDebugCheckResult> {
  const settings = getSettings();
  const result: NotificationDebugCheckResult = {
    success: true,
    checkedAt: new Date().toISOString(),
    notifyIdsCount: 0,
    notifyIds: [],
    scheduleCount: 0,
    matchingAirings: [],
  };

  if (!settings.enabled) {
    result.success = false;
    result.error = 'Notifications are disabled in settings';
    return result;
  }

  if (!libraryService || !scheduleService) {
    result.success = false;
    result.error = `Missing services: libraryService=${!!libraryService}, scheduleService=${!!scheduleService}`;
    return result;
  }

  if (isInQuietHours(settings)) {
    result.success = false;
    result.error = 'Currently in quiet hours';
    return result;
  }

  // Build notify IDs
  const notifyIds = new Set<number>();
  const watchingEntries = libraryService.getAllEntries('watching');
  for (const entry of watchingEntries) {
    if (entry.anilistId) notifyIds.add(entry.anilistId);
  }
  for (const sub of settings.subscriptions) {
    if (sub.enabled) notifyIds.add(sub.anilistId);
  }

  result.notifyIdsCount = notifyIds.size;
  result.notifyIds = [...notifyIds];

  if (notifyIds.size === 0) {
    result.success = false;
    result.error = 'No anime IDs to notify for (no watching entries + no enabled subscriptions)';
    return result;
  }

  // Fetch schedule
  const airingData = await getScheduleData();
  result.scheduleCount = airingData.length;

  const nowUnix = Math.floor(Date.now() / 1000);
  const leadTimeSeconds = settings.leadTimeMinutes * 60;
  const checkWindowSeconds = CHECK_INTERVAL_MS / 1000;

  // Check ALL matching airings (not just ones within window)
  for (const airing of airingData) {
    if (!notifyIds.has(airing.media.id)) continue;

    const timeUntilAiring = airing.airingAt - nowUnix;
    let wouldNotify = true;
    let skipReason: string | null = null;

    if (leadTimeSeconds === 0) {
      if (timeUntilAiring < -checkWindowSeconds || timeUntilAiring > checkWindowSeconds) {
        wouldNotify = false;
        skipReason = `Outside check window: timeUntilAiring=${timeUntilAiring}s, window=+/-${checkWindowSeconds}s`;
      }
    } else {
      if (timeUntilAiring <= 0) {
        wouldNotify = false;
        skipReason = `Already aired: timeUntilAiring=${timeUntilAiring}s`;
      } else if (timeUntilAiring > leadTimeSeconds) {
        wouldNotify = false;
        skipReason = `Too far away: timeUntilAiring=${timeUntilAiring}s (${Math.round(timeUntilAiring / 60)}min), leadTime=${leadTimeSeconds}s (${settings.leadTimeMinutes}min)`;
      }
    }

    const dedupeKey = `${airing.media.id}:${airing.episode}`;
    if (wouldNotify && sentNotifications.has(dedupeKey)) {
      wouldNotify = false;
      skipReason = `Already sent (deduped): ${dedupeKey}`;
    }

    result.matchingAirings.push({
      mediaId: airing.media.id,
      title: getTitle(airing.media),
      episode: airing.episode,
      airingAt: airing.airingAt,
      airingAtDate: new Date(airing.airingAt * 1000).toISOString(),
      timeUntilAiringSeconds: timeUntilAiring,
      timeUntilAiringMinutes: Math.round(timeUntilAiring / 60),
      wouldNotify,
      skipReason,
    });
  }

  return result;
}

export async function debugTriggerTestNotification(): Promise<{
  success: boolean;
  error?: string;
}> {
  const settings = getSettings();

  const testAiring: AiringAnime = {
    id: -1,
    airingAt: Math.floor(Date.now() / 1000) + 60,
    episode: 99,
    media: {
      id: -1,
      title: { romaji: 'Test Notification', english: 'Test Notification', native: 'テスト通知' },
      coverImage: {},
      format: 'TV',
      status: 'RELEASING',
      genres: [],
    },
  };

  try {
    await showNotification(testAiring, settings);
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export function cleanupNotificationService(): void {
  stopChecking();
  saveSentNotifications();
  targetWindow = null;
  scheduleService = null;
  libraryService = null;
  cachedSchedule = null;
  logger.info('NotificationService cleaned up');
}
