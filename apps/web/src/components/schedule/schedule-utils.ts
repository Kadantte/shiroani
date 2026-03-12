import { toLocalDate, formatDate } from '@shiroani/shared';

export { formatDate };
export { getAnimeTitle, getCoverUrl } from '@/lib/anime-utils';

export function formatTime(timestamp: number): string {
  const d = new Date(timestamp * 1000);
  return d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
}

export function addDays(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  d.setDate(d.getDate() + days);
  return toLocalDate(d);
}

export function isToday(dateStr: string): boolean {
  return dateStr === toLocalDate(new Date());
}

/** Parse the day-of-month number from a YYYY-MM-DD string */
export function getDayNumber(dateStr: string): number {
  return parseInt(dateStr.split('-')[2], 10);
}
