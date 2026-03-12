import { useMemo } from 'react';
import type { AiringAnime } from '@shiroani/shared';

export function useWeekData(
  weekDays: string[],
  getEntriesForDay: (day: string) => AiringAnime[],
  schedule: Record<string, AiringAnime[]>
) {
  return useMemo(() => {
    const map = new Map<string, AiringAnime[]>();
    for (const day of weekDays) {
      const entries = [...getEntriesForDay(day)].sort((a, b) => a.airingAt - b.airingAt);
      map.set(day, entries);
    }
    return map;
  }, [weekDays, getEntriesForDay, schedule]);
}
