import { toLocalDate } from '@/stores/useScheduleStore';
import type { AiringAnime } from '@shiroani/shared';

export function formatTime(timestamp: number): string {
  const d = new Date(timestamp * 1000);
  return d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
}

export function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' });
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

export function getAnimeTitle(media: AiringAnime['media']): string {
  return media.title.romaji || media.title.english || media.title.native || '?';
}

export function getCoverUrl(media: AiringAnime['media']): string | undefined {
  return media.coverImage.medium || media.coverImage.large;
}

/** Parse the day-of-month number from a YYYY-MM-DD string */
export function getDayNumber(dateStr: string): number {
  return parseInt(dateStr.split('-')[2], 10);
}
