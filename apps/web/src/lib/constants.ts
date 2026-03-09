import type { AnimeStatus } from '@shiroani/shared';

export const STATUS_CONFIG: Record<AnimeStatus, { label: string; color: string }> = {
  watching: { label: 'Ogladam', color: 'bg-blue-500' },
  completed: { label: 'Ukonczone', color: 'bg-green-500' },
  plan_to_watch: { label: 'Planowane', color: 'bg-yellow-500' },
  on_hold: { label: 'Wstrzymane', color: 'bg-orange-500' },
  dropped: { label: 'Porzucone', color: 'bg-red-500' },
};

// For filter dropdowns that need an "all" option
export const STATUS_FILTER_OPTIONS = [
  { value: 'all' as const, label: 'Wszystkie' },
  ...Object.entries(STATUS_CONFIG).map(([value, { label }]) => ({
    value: value as AnimeStatus,
    label,
  })),
];
