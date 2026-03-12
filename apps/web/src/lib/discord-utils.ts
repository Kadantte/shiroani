import type { DiscordActivityType } from '@shiroani/shared';

/** Sample data for live preview of Discord Rich Presence templates */
export const PREVIEW_DATA: Record<
  DiscordActivityType,
  { anime_title: string; episode: string; site_name: string; library_count: string }
> = {
  watching: {
    anime_title: "Frieren: Beyond Journey's End",
    episode: 'Odcinek 12',
    site_name: 'ogladajanime.pl',
    library_count: '42',
  },
  browsing: { anime_title: '', episode: '', site_name: 'ogladajanime.pl', library_count: '42' },
  library: { anime_title: '', episode: '', site_name: '', library_count: '42' },
  diary: {
    anime_title: "Frieren: Beyond Journey's End",
    episode: '',
    site_name: '',
    library_count: '42',
  },
  schedule: { anime_title: '', episode: '', site_name: '', library_count: '42' },
  settings: { anime_title: '', episode: '', site_name: '', library_count: '42' },
  idle: { anime_title: '', episode: '', site_name: '', library_count: '42' },
};

/** Substitute template variables with preview data for a given activity type */
export function substitutePreview(template: string, activityType: DiscordActivityType): string {
  if (!template) return '';
  const data = PREVIEW_DATA[activityType];
  return template
    .replace(/\{anime_title\}/g, data.anime_title)
    .replace(/\{episode\}/g, data.episode)
    .replace(/\{site_name\}/g, data.site_name)
    .replace(/\{library_count\}/g, data.library_count)
    .replace(/\s{2,}/g, ' ')
    .trim();
}
