import type { DiscordRpcSettings, DiscordPresenceActivity } from '@shiroani/shared';

export function buildPresence(
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
