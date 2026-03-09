import type { AnimeStatus } from '@shiroani/shared';

/** Path to the app mascot logo (chibi SVG) */
export const APP_LOGO_URL = `${import.meta.env.BASE_URL}shiro-chibi.svg`;

export const STATUS_CONFIG: Record<AnimeStatus, { label: string; color: string }> = {
  watching: { label: 'Ogladam', color: 'bg-status-info' },
  completed: { label: 'Ukonczone', color: 'bg-status-success' },
  plan_to_watch: { label: 'Planowane', color: 'bg-status-warning' },
  on_hold: { label: 'Wstrzymane', color: 'bg-status-pending' },
  dropped: { label: 'Porzucone', color: 'bg-status-error' },
};

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

export const DAY_NAMES_SHORT = ['Pon', 'Wt', 'Sr', 'Czw', 'Pt', 'Sob', 'Ndz'];
export const DAY_NAMES_FULL = [
  'Poniedzialek',
  'Wtorek',
  'Sroda',
  'Czwartek',
  'Piatek',
  'Sobota',
  'Niedziela',
];
