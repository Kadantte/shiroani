import type { DiscordPresenceTemplates, DiscordActivityType } from '../types/anime';

export const DISCORD_ACTIVITY_TYPES: DiscordActivityType[] = [
  'watching',
  'browsing',
  'library',
  'diary',
  'schedule',
  'settings',
  'idle',
];

export const DISCORD_ACTIVITY_LABELS: Record<DiscordActivityType, string> = {
  watching: 'Oglądanie anime',
  browsing: 'Przeglądanie',
  library: 'Biblioteka',
  diary: 'Dziennik',
  schedule: 'Harmonogram',
  settings: 'Ustawienia',
  idle: 'Bez aktywności',
};

/** Variables available for template substitution */
export const DISCORD_TEMPLATE_VARIABLES = [
  { key: '{anime_title}', description: 'Tytuł anime' },
  { key: '{episode}', description: 'Numer odcinka' },
  { key: '{site_name}', description: 'Nazwa strony' },
  { key: '{library_count}', description: 'Liczba anime w bibliotece' },
] as const;

export const DEFAULT_DISCORD_TEMPLATES: DiscordPresenceTemplates = {
  watching: {
    details: 'Ogląda anime',
    state: '{anime_title}',
    showTimestamp: true,
    showLargeImage: true,
    showButton: true,
  },
  browsing: {
    details: 'Przeglądanie',
    state: '',
    showTimestamp: true,
    showLargeImage: true,
    showButton: false,
  },
  library: {
    details: 'Przeglądanie biblioteki',
    state: '{library_count} anime',
    showTimestamp: true,
    showLargeImage: true,
    showButton: false,
  },
  diary: {
    details: 'Pisanie w dzienniku',
    state: '{anime_title}',
    showTimestamp: true,
    showLargeImage: true,
    showButton: false,
  },
  schedule: {
    details: 'Sprawdzanie harmonogramu',
    state: '',
    showTimestamp: true,
    showLargeImage: true,
    showButton: false,
  },
  settings: {
    details: 'Przeglądanie ustawień',
    state: '',
    showTimestamp: true,
    showLargeImage: true,
    showButton: false,
  },
  idle: {
    details: 'Oczekiwanie',
    state: '',
    showTimestamp: true,
    showLargeImage: true,
    showButton: false,
  },
};
