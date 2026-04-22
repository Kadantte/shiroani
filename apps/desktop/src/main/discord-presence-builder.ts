import type {
  DiscordRpcSettings,
  DiscordPresenceActivity,
  DiscordPresenceTemplate,
  DiscordActivityType,
} from '@shiroani/shared';
import { DEFAULT_DISCORD_TEMPLATES, LANDING_URL } from '@shiroani/shared';

const LANDING_BUTTON = { label: 'Pobierz ShiroAni', url: LANDING_URL } as const;

const MAX_FIELD_LENGTH = 128;

/** Determine the activity type from the activity object */
function resolveActivityType(activity: DiscordPresenceActivity): DiscordActivityType {
  if (activity.view === 'browser') {
    return activity.animeTitle ? 'watching' : 'browsing';
  }
  if (['library', 'diary', 'schedule', 'settings'].includes(activity.view)) {
    return activity.view as DiscordActivityType;
  }
  return 'idle';
}

/** Replace template variables with actual values, truncate to Discord limit */
function substituteVariables(template: string, activity: DiscordPresenceActivity): string {
  if (!template) return '';

  let result = template
    .replace(/\{anime_title\}/g, activity.animeTitle ?? '')
    .replace(/\{episode\}/g, activity.episodeNumber ?? '')
    .replace(/\{site_name\}/g, activity.siteName ?? '')
    .replace(/\{library_count\}/g, activity.libraryCount?.toString() ?? '');

  // Clean up double spaces from empty substitutions
  result = result.replace(/\s{2,}/g, ' ').trim();

  if (result.length > MAX_FIELD_LENGTH) {
    result = result.slice(0, MAX_FIELD_LENGTH - 1) + '…';
  }

  return result;
}

/** Build presence using custom templates */
function buildFromTemplate(
  activity: DiscordPresenceActivity,
  settings: DiscordRpcSettings,
  activityStartTime: Date | null
) {
  const activityType = resolveActivityType(activity);
  const template: DiscordPresenceTemplate =
    settings.templates?.[activityType] ?? DEFAULT_DISCORD_TEMPLATES[activityType];

  const details = substituteVariables(template.details, activity);
  const state = substituteVariables(template.state, activity);

  let largeImageKey = 'shiroani';
  let largeImageText = 'ShiroAni';
  const buttons: Array<{ label: string; url: string }> = [];

  // Use anime cover when available and template allows it
  if (template.showLargeImage && activity.animeCoverUrl) {
    largeImageKey = activity.animeCoverUrl;
    largeImageText = activity.animeTitle ?? 'ShiroAni';
  }

  // AniList button when template allows it
  if (template.showButton && activity.anilistId) {
    buttons.push({
      label: 'Pokaż na AniList',
      url: `https://anilist.co/anime/${activity.anilistId}`,
    });
  }

  buttons.push({ ...LANDING_BUTTON });

  const presence: Record<string, unknown> = {
    details: details || undefined,
    largeImageKey,
    largeImageText,
  };

  // Discord rejects empty strings
  if (state) presence.state = state;
  if (template.showTimestamp && activityStartTime) {
    presence.startTimestamp = activityStartTime;
  }
  if (buttons.length > 0) presence.buttons = buttons;

  return presence;
}

/** Build presence using the default hardcoded logic */
function buildLegacy(
  activity: DiscordPresenceActivity,
  settings: DiscordRpcSettings,
  activityStartTime: Date | null
) {
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

  buttons.push({ ...LANDING_BUTTON });

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

export function buildPresence(
  activity: DiscordPresenceActivity,
  settings: DiscordRpcSettings,
  activityStartTime: Date | null
) {
  if (settings.useCustomTemplates) {
    return buildFromTemplate(activity, settings, activityStartTime);
  }
  return buildLegacy(activity, settings, activityStartTime);
}
