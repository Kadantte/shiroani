import type { AiringAnime, NotificationSettings, NotificationSubscription } from '@shiroani/shared';

export const CHECK_INTERVAL_MS = 5 * 60 * 1000; // Check every 5 minutes
export const SCHEDULE_CACHE_TTL_MS = 30 * 60 * 1000; // Re-fetch schedule every 30 minutes
export const MISSED_WINDOW_MS = 30 * 60 * 1000; // Catch episodes missed within last 30 minutes
export const PRUNE_THRESHOLD = 500;
export const PRUNE_KEEP = 400;
const MISSED_WINDOW_SECONDS = MISSED_WINDOW_MS / 1000;
const CHECK_WINDOW_SECONDS = CHECK_INTERVAL_MS / 1000;

export const DEFAULT_SETTINGS: NotificationSettings = {
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

/** Check if a given time (in minutes since midnight) falls within quiet hours */
export function isInQuietHours(settings: NotificationSettings, currentMinutes: number): boolean {
  if (!settings.quietHours.enabled) return false;

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

/** Get a display title for an anime */
export function getTitle(media: AiringAnime['media']): string {
  return media.title.english || media.title.romaji || media.title.native || 'Nieznane anime';
}

/** Determine if an airing should trigger a notification based on timing */
export function shouldNotifyForAiring(timeUntilAiring: number, leadTimeSeconds: number): boolean {
  if (leadTimeSeconds === 0) {
    return timeUntilAiring >= -MISSED_WINDOW_SECONDS && timeUntilAiring <= CHECK_WINDOW_SECONDS;
  } else {
    return timeUntilAiring >= -MISSED_WINDOW_SECONDS && timeUntilAiring <= leadTimeSeconds;
  }
}

/** Prune a set of notification keys if it exceeds capacity. Returns a new Set if pruned. */
export function pruneSentSet(keys: Set<string>): Set<string> {
  if (keys.size > PRUNE_THRESHOLD) {
    const entries = [...keys];
    return new Set(entries.slice(entries.length - PRUNE_KEEP));
  }
  return keys;
}

/** Build a notification body string for an airing */
export function buildNotificationBody(episode: number, minutesLeft: number): string {
  if (minutesLeft < -1) {
    return `Odcinek ${episode} — nadawany ${Math.abs(minutesLeft)} min temu`;
  } else if (minutesLeft <= 1) {
    return `Odcinek ${episode} nadawany teraz!`;
  } else {
    return `Odcinek ${episode} za ${minutesLeft} min`;
  }
}

/** Merge stored settings with defaults */
export function mergeSettings(
  stored: Partial<NotificationSettings> | undefined
): NotificationSettings {
  if (!stored) {
    return {
      ...DEFAULT_SETTINGS,
      quietHours: { ...DEFAULT_SETTINGS.quietHours },
      subscriptions: [...DEFAULT_SETTINGS.subscriptions],
    };
  }

  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    quietHours: {
      ...DEFAULT_SETTINGS.quietHours,
      ...(stored.quietHours ?? {}),
    },
    subscriptions: stored.subscriptions
      ? [...stored.subscriptions]
      : [...DEFAULT_SETTINGS.subscriptions],
  };
}

export const STALE_SUBSCRIPTION_DAYS = 14;
export const SCHEDULE_AHEAD_SECONDS = 48 * 60 * 60; // 48 hours

/** Upcoming notification with computed delivery time */
export interface UpcomingNotification {
  airing: AiringAnime;
  deliveryTime: Date;
}

/**
 * Compute which airings should be scheduled as OS-level notifications.
 * Filters to the next 48 hours, excludes past, quiet hours, and already-sent.
 */
export function computeUpcomingNotifications(
  schedule: AiringAnime[],
  settings: NotificationSettings,
  notifyIds: Set<number>,
  sentKeys: Set<string>
): UpcomingNotification[] {
  const nowMs = Date.now();
  const nowUnix = Math.floor(nowMs / 1000);
  const leadTimeSeconds = settings.leadTimeMinutes * 60;
  const results: UpcomingNotification[] = [];

  for (const airing of schedule) {
    if (!notifyIds.has(airing.media.id)) continue;

    // Only within the next 48 hours
    const timeUntilAiring = airing.airingAt - nowUnix;
    if (timeUntilAiring < 0 || timeUntilAiring > SCHEDULE_AHEAD_SECONDS) continue;

    // Skip already-sent
    const dedupeKey = `${airing.media.id}:${airing.episode}`;
    if (sentKeys.has(dedupeKey)) continue;

    // Compute delivery time (airing time minus lead time)
    const deliveryUnix = airing.airingAt - leadTimeSeconds;
    const deliveryTime = new Date(deliveryUnix * 1000);

    // Skip if delivery time is already past
    if (deliveryTime.getTime() < nowMs) continue;

    // Skip if delivery falls in quiet hours
    const deliveryMinutes = deliveryTime.getHours() * 60 + deliveryTime.getMinutes();
    if (isInQuietHours(settings, deliveryMinutes)) continue;

    results.push({ airing, deliveryTime });
  }

  return results;
}

/**
 * Update `lastSeenAt` on subscriptions whose anime appeared in the current schedule.
 * Returns the same array reference if nothing changed (avoids unnecessary store writes).
 */
export function updateLastSeenTimestamps(
  subscriptions: NotificationSubscription[],
  scheduleMediaIds: Set<number>
): NotificationSubscription[] {
  if (subscriptions.length === 0 || scheduleMediaIds.size === 0) return subscriptions;
  if (!subscriptions.some(s => scheduleMediaIds.has(s.anilistId))) return subscriptions;

  const now = new Date().toISOString();
  return subscriptions.map(sub =>
    scheduleMediaIds.has(sub.anilistId) ? { ...sub, lastSeenAt: now } : sub
  );
}

/**
 * Remove subscriptions not seen in the schedule for `maxAgeDays` days.
 * Subscriptions without `lastSeenAt` (legacy) are kept — they get stamped on the next check cycle.
 */
export function pruneStaleSubscriptions(
  subscriptions: NotificationSubscription[],
  maxAgeDays: number = STALE_SUBSCRIPTION_DAYS
): { kept: NotificationSubscription[]; pruned: NotificationSubscription[] } {
  const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
  const kept: NotificationSubscription[] = [];
  const pruned: NotificationSubscription[] = [];

  for (const sub of subscriptions) {
    if (!sub.lastSeenAt || new Date(sub.lastSeenAt).getTime() >= cutoff) {
      kept.push(sub);
    } else {
      pruned.push(sub);
    }
  }

  return { kept, pruned };
}

/** Validate and sanitize notification settings updates */
export function sanitizeSettingsUpdate(
  current: NotificationSettings,
  updates: Partial<NotificationSettings>
): NotificationSettings {
  const timeFormatRegex = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
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

  return {
    ...current,
    ...sanitized,
    quietHours: {
      ...current.quietHours,
      ...(quietHoursUpdate ?? {}),
    },
    subscriptions: sanitized.subscriptions ?? current.subscriptions,
  };
}
