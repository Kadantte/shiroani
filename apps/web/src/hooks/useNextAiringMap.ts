import { useEffect, useMemo } from 'react';
import { getWeekStart, toLocalDate } from '@shiroani/shared';
import { useScheduleStore } from '@/stores/useScheduleStore';

/**
 * Builds a map from AniList media ID to the nearest future airing info
 * (episode number + unix timestamp) based on the current week's schedule.
 *
 * Automatically fetches the weekly schedule if it hasn't been loaded yet.
 */
export function useNextAiringMap(): Map<number, { episode: number; airingAt: number }> {
  const schedule = useScheduleStore(s => s.schedule);
  const fetchWeekly = useScheduleStore(s => s.fetchWeekly);
  const isLoading = useScheduleStore(s => s.isLoading);

  // Ensure schedule data is loaded for the current week
  useEffect(() => {
    if (Object.keys(schedule).length === 0 && !isLoading) {
      fetchWeekly(toLocalDate(getWeekStart()));
    }
  }, [schedule, fetchWeekly, isLoading]);

  // Build a map of mediaId -> nearest future airing info
  const nextAiringMap = useMemo(() => {
    const map = new Map<number, { airingAt: number; episode: number }>();
    const nowUnix = Math.floor(Date.now() / 1000);

    for (const dayEntries of Object.values(schedule)) {
      for (const airing of dayEntries) {
        if (airing.airingAt <= nowUnix) continue;
        const mediaId = airing.media.id;
        const existing = map.get(mediaId);
        if (!existing || airing.airingAt < existing.airingAt) {
          map.set(mediaId, { airingAt: airing.airingAt, episode: airing.episode });
        }
      }
    }

    return map;
  }, [schedule]);

  return nextAiringMap;
}
