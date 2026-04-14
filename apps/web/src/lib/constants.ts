import type { AnimeStatus } from '@shiroani/shared';

/** Path to the app mascot logo (chibi SVG) */
export const APP_LOGO_URL = `${import.meta.env.BASE_URL}shiro-chibi.svg`;

/** Path to the thinking mascot pose (used on splash screen) */
export const MASCOT_THINK_URL = `${import.meta.env.BASE_URL}chibi_think.png`;

export const STATUS_CONFIG: Record<
  AnimeStatus,
  { label: string; color: string; cssColor: string; cssBgColor: string }
> = {
  watching: {
    label: 'Oglądam',
    color: 'bg-status-info',
    cssColor: 'var(--status-info)',
    cssBgColor: 'var(--status-info-bg)',
  },
  completed: {
    label: 'Ukończone',
    color: 'bg-status-success',
    cssColor: 'var(--status-success)',
    cssBgColor: 'var(--status-success-bg)',
  },
  plan_to_watch: {
    label: 'Planowane',
    color: 'bg-status-warning',
    cssColor: 'var(--status-warning)',
    cssBgColor: 'var(--status-warning-bg)',
  },
  on_hold: {
    label: 'Wstrzymane',
    color: 'bg-status-pending',
    cssColor: 'var(--status-pending)',
    cssBgColor: 'var(--status-pending-bg)',
  },
  dropped: {
    label: 'Porzucone',
    color: 'bg-status-error',
    cssColor: 'var(--status-error)',
    cssBgColor: 'var(--status-error-bg)',
  },
};

export const STATUS_ORDER: AnimeStatus[] = Object.keys(STATUS_CONFIG) as AnimeStatus[];

// All statuses as selectable options
export const STATUS_OPTIONS = Object.entries(STATUS_CONFIG).map(([value, { label }]) => ({
  value: value as AnimeStatus,
  label,
}));

// For filter dropdowns that need an "all" option
export const STATUS_FILTER_OPTIONS = [
  { value: 'all' as const, label: 'Wszystkie' },
  ...STATUS_OPTIONS,
];

// ============================================
// AniList Label Maps (Polish translations)
// ============================================

export const ANILIST_FORMAT_LABELS: Record<string, string> = {
  TV: 'TV',
  TV_SHORT: 'TV Short',
  MOVIE: 'Film',
  SPECIAL: 'Special',
  OVA: 'OVA',
  ONA: 'ONA',
  MUSIC: 'Teledysk',
};

export const ANILIST_STATUS_LABELS: Record<string, string> = {
  FINISHED: 'Zakończone',
  RELEASING: 'Emitowane',
  NOT_YET_RELEASED: 'Nadchodzące',
  CANCELLED: 'Anulowane',
  HIATUS: 'W przerwie',
};

export const ANILIST_SOURCE_LABELS: Record<string, string> = {
  ORIGINAL: 'Oryginał',
  MANGA: 'Manga',
  LIGHT_NOVEL: 'Light Novel',
  VISUAL_NOVEL: 'Visual Novel',
  VIDEO_GAME: 'Gra wideo',
  NOVEL: 'Powieść',
  OTHER: 'Inne',
  ANIME: 'Anime',
  WEB_NOVEL: 'Web Novel',
  COMIC: 'Komiks',
};

export const ANILIST_SEASON_LABELS: Record<string, string> = {
  WINTER: 'Zima',
  SPRING: 'Wiosna',
  SUMMER: 'Lato',
  FALL: 'Jesień',
};

export const ANILIST_RELATION_LABELS: Record<string, string> = {
  ADAPTATION: 'Adaptacja',
  PREQUEL: 'Prequel',
  SEQUEL: 'Sequel',
  PARENT: 'Seria główna',
  SIDE_STORY: 'Historia poboczna',
  CHARACTER: 'Postacie',
  SUMMARY: 'Streszczenie',
  ALTERNATIVE: 'Alternatywne',
  SPIN_OFF: 'Spin-off',
  OTHER: 'Inne',
  SOURCE: 'Źródło',
  COMPILATION: 'Kompilacja',
  CONTAINS: 'Zawiera',
};

export const DAY_NAMES_SHORT = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Ndz'];
export const DAY_NAMES_FULL = [
  'Poniedziałek',
  'Wtorek',
  'Środa',
  'Czwartek',
  'Piątek',
  'Sobota',
  'Niedziela',
];
