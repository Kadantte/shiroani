import { Client } from '@xhayper/discord-rpc';
import { createLogger } from '@shiroani/shared';
import type { DiscordRpcSettings, DiscordPresenceActivity } from '@shiroani/shared';
import { store } from './store';

const logger = createLogger('DiscordRpcService');

const DISCORD_CLIENT_ID = '1481042476402872361';
const STORE_KEY = 'discord-rpc-settings';
const MIN_UPDATE_INTERVAL_MS = 15_000; // Discord rate limit: 1 update per 15s
const RECONNECT_BASE_MS = 5_000;
const RECONNECT_MAX_MS = 60_000;

const DEFAULT_SETTINGS: DiscordRpcSettings = {
  enabled: false,
  showAnimeDetails: true,
  showElapsedTime: true,
};

let client: Client | null = null;
let isConnected = false;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectDelay = RECONNECT_BASE_MS;
let lastUpdateTime = 0;
let pendingActivity: DiscordPresenceActivity | null = null;
let throttleTimer: ReturnType<typeof setTimeout> | null = null;
let currentActivity: DiscordPresenceActivity | null = null;
let activityStartTime: Date | null = null;

function getSettings(): DiscordRpcSettings {
  const stored = store.get(STORE_KEY) as Partial<DiscordRpcSettings> | undefined;
  if (!stored) return { ...DEFAULT_SETTINGS };
  return {
    enabled: typeof stored.enabled === 'boolean' ? stored.enabled : DEFAULT_SETTINGS.enabled,
    showAnimeDetails:
      typeof stored.showAnimeDetails === 'boolean'
        ? stored.showAnimeDetails
        : DEFAULT_SETTINGS.showAnimeDetails,
    showElapsedTime:
      typeof stored.showElapsedTime === 'boolean'
        ? stored.showElapsedTime
        : DEFAULT_SETTINGS.showElapsedTime,
  };
}

function saveSettings(settings: DiscordRpcSettings): void {
  store.set(STORE_KEY, settings);
}

function clearReconnectTimer(): void {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
}

function clearThrottleTimer(): void {
  if (throttleTimer) {
    clearTimeout(throttleTimer);
    throttleTimer = null;
  }
}

function scheduleReconnect(): void {
  clearReconnectTimer();
  const settings = getSettings();
  if (!settings.enabled) return;

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connectClient();
  }, reconnectDelay);

  reconnectDelay = Math.min(reconnectDelay * 2, RECONNECT_MAX_MS);
}

function buildPresence(activity: DiscordPresenceActivity, settings: DiscordRpcSettings) {
  let details: string;
  let state: string | undefined;
  let largeImageKey = 'shiroani';
  let largeImageText = 'ShiroAni';
  const buttons: Array<{ label: string; url: string }> = [];

  switch (activity.view) {
    case 'library':
      details = 'Przeglądanie biblioteki';
      if (activity.libraryCount !== undefined) {
        state = `${activity.libraryCount} anime`;
      }
      break;

    case 'diary':
      details = 'Pisanie w dzienniku';
      if (settings.showAnimeDetails && activity.animeTitle) {
        state = activity.animeTitle;
      }
      break;

    case 'schedule':
      details = 'Sprawdzanie harmonogramu';
      break;

    case 'settings':
      details = 'Konfiguracja ustawień';
      break;

    case 'browser':
      if (settings.showAnimeDetails && activity.animeTitle) {
        details = 'Ogląda anime';
        state = activity.animeTitle;
        if (activity.animeCoverUrl) {
          largeImageKey = activity.animeCoverUrl;
          largeImageText = activity.animeTitle;
        }
        if (activity.anilistId) {
          buttons.push({
            label: 'Pokaż na AniList',
            url: `https://anilist.co/anime/${activity.anilistId}`,
          });
        }
      } else {
        details = 'Przeglądanie';
      }
      break;

    default:
      details = 'Korzysta z ShiroAni';
      break;
  }

  const presence: Record<string, unknown> = {
    details,
    largeImageKey,
    largeImageText,
  };

  if (state) presence.state = state;
  if (settings.showElapsedTime && activityStartTime) {
    presence.startTimestamp = activityStartTime;
  }
  if (buttons.length > 0) presence.buttons = buttons;

  return presence;
}

async function sendPresenceUpdate(activity: DiscordPresenceActivity): Promise<void> {
  if (!client || !isConnected) return;

  const settings = getSettings();
  const presence = buildPresence(activity, settings);

  try {
    await client.user?.setActivity(presence as never);
    lastUpdateTime = Date.now();
  } catch (error) {
    logger.error('Failed to set Discord presence:', error);
  }
}

function throttledUpdate(activity: DiscordPresenceActivity): void {
  const now = Date.now();
  const elapsed = now - lastUpdateTime;

  if (elapsed >= MIN_UPDATE_INTERVAL_MS) {
    sendPresenceUpdate(activity);
    pendingActivity = null;
  } else {
    pendingActivity = activity;
    if (!throttleTimer) {
      throttleTimer = setTimeout(() => {
        throttleTimer = null;
        if (pendingActivity) {
          sendPresenceUpdate(pendingActivity);
          pendingActivity = null;
        }
      }, MIN_UPDATE_INTERVAL_MS - elapsed);
    }
  }
}

async function connectClient(): Promise<void> {
  if (client) {
    try {
      client.destroy();
    } catch {
      // ignore cleanup errors
    }
    client = null;
    isConnected = false;
  }

  client = new Client({ clientId: DISCORD_CLIENT_ID });

  client.on('ready', () => {
    isConnected = true;
    reconnectDelay = RECONNECT_BASE_MS;
    logger.info('Discord RPC connected');

    activityStartTime = new Date();
    if (currentActivity) {
      sendPresenceUpdate(currentActivity);
    } else {
      sendPresenceUpdate({ view: 'browser' });
    }
  });

  client.on('disconnected', () => {
    isConnected = false;
    logger.info('Discord RPC disconnected');
    scheduleReconnect();
  });

  try {
    await client.login();
  } catch {
    logger.debug('Discord not available, scheduling reconnect');
    isConnected = false;
    scheduleReconnect();
  }
}

async function disconnectClient(): Promise<void> {
  clearReconnectTimer();
  clearThrottleTimer();

  if (client) {
    try {
      await client.user?.clearActivity();
    } catch {
      // ignore
    }
    try {
      client.destroy();
    } catch {
      // ignore
    }
    client = null;
    isConnected = false;
  }
}

// ========================================
// Public API
// ========================================

export function initializeDiscordRpc(): void {
  const settings = getSettings();
  logger.info(`DiscordRpcService initialized (enabled: ${settings.enabled})`);

  if (settings.enabled) {
    connectClient();
  }
}

export function getDiscordRpcSettings(): DiscordRpcSettings {
  return getSettings();
}

export function updateDiscordRpcSettings(updates: Partial<DiscordRpcSettings>): DiscordRpcSettings {
  const current = getSettings();
  const next: DiscordRpcSettings = {
    enabled: updates.enabled ?? current.enabled,
    showAnimeDetails: updates.showAnimeDetails ?? current.showAnimeDetails,
    showElapsedTime: updates.showElapsedTime ?? current.showElapsedTime,
  };
  saveSettings(next);

  if (next.enabled && !isConnected) {
    reconnectDelay = RECONNECT_BASE_MS;
    connectClient();
  } else if (!next.enabled) {
    disconnectClient();
  } else if (isConnected && currentActivity) {
    // Settings changed while connected — re-send presence with new settings
    sendPresenceUpdate(currentActivity);
  }

  logger.info(
    `Discord RPC settings updated: enabled=${next.enabled}, showAnimeDetails=${next.showAnimeDetails}, showElapsedTime=${next.showElapsedTime}`
  );
  return next;
}

export function updateDiscordPresence(activity: DiscordPresenceActivity): void {
  const settings = getSettings();
  if (!settings.enabled) return;

  // Track if view changed — reset start timestamp
  if (!currentActivity || currentActivity.view !== activity.view) {
    activityStartTime = new Date();
  }

  currentActivity = activity;
  throttledUpdate(activity);
}

export function clearDiscordPresence(): void {
  currentActivity = null;
  activityStartTime = null;

  if (client && isConnected) {
    try {
      client.user?.clearActivity();
    } catch (error) {
      logger.error('Failed to clear Discord presence:', error);
    }
  }
}

export function cleanupDiscordRpc(): void {
  disconnectClient();
  currentActivity = null;
  activityStartTime = null;
  logger.info('DiscordRpcService cleaned up');
}
