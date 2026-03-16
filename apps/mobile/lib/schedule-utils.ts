import type { AiringAnime } from '@shiroani/shared';

export const DAY_NAMES_SHORT = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Ndz'] as const;

/** Format a unix timestamp (seconds) to "HH:mm" in pl-PL locale. */
export function formatTime(unixSeconds: number): string {
  const date = new Date(unixSeconds * 1000);
  return date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
}

/** Add days to a YYYY-MM-DD date string, returns YYYY-MM-DD. */
export function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr + 'T00:00:00');
  date.setDate(date.getDate() + days);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Check if a YYYY-MM-DD string represents today in local time. */
export function isToday(dateStr: string): boolean {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return dateStr === `${y}-${m}-${d}`;
}

/** Get preferred anime title: romaji > english > native > "?" */
export function getAnimeTitle(media: AiringAnime['media']): string {
  return media.title.romaji ?? media.title.english ?? media.title.native ?? '?';
}

/** Get preferred cover image URL: medium > large. */
export function getCoverUrl(media: AiringAnime['media']): string | undefined {
  return media.coverImage.medium ?? media.coverImage.large;
}

/** Format a date range for display, e.g. "16 - 22 mar". */
export function formatDateRange(startDate: string, endDate: string): string {
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');
  const months = [
    'sty',
    'lut',
    'mar',
    'kwi',
    'maj',
    'cze',
    'lip',
    'sie',
    'wrz',
    'paź',
    'lis',
    'gru',
  ];
  const startDay = start.getDate();
  const endDay = end.getDate();
  const startMonth = months[start.getMonth()];
  const endMonth = months[end.getMonth()];

  if (startMonth === endMonth) {
    return `${startDay} - ${endDay} ${endMonth}`;
  }
  return `${startDay} ${startMonth} - ${endDay} ${endMonth}`;
}

/** Format episode progress, e.g. "Odc. 5/12" or "Odc. 5". */
export function formatEpisodeProgress(current: number, total?: number): string {
  return total ? `Odc. ${current}/${total}` : `Odc. ${current}`;
}
