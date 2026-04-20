import { useMemo } from 'react';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { useScheduleStore } from '@/stores/useScheduleStore';

/**
 * Count of unwatched-but-aired episodes across every title the user is
 * currently watching. Cross-references `useLibraryStore` (status === 'watching')
 * with `useScheduleStore` (latest aired episode per anilistId).
 *
 * Returns the SUM of (latestAiredEpisode − currentEpisode) so a user behind by
 * three shows with 2 + 1 + 4 unwatched episodes sees "7 odcinków", not "3".
 *
 * Schedule coverage is best-effort: the store only holds days the app has
 * fetched, so count improves as the user navigates the schedule view.
 */
export function useEpisodesWaitingCount(): number {
  const entries = useLibraryStore(s => s.entries);
  const schedule = useScheduleStore(s => s.schedule);

  return useMemo(() => {
    const nowSeconds = Date.now() / 1000;
    const latestAiredByMediaId = new Map<number, number>();

    for (const day of Object.values(schedule)) {
      for (const airing of day) {
        if (airing.airingAt > nowSeconds) continue;
        const prev = latestAiredByMediaId.get(airing.media.id) ?? 0;
        if (airing.episode > prev) latestAiredByMediaId.set(airing.media.id, airing.episode);
      }
    }

    let total = 0;
    for (const entry of entries) {
      if (entry.status !== 'watching' || entry.anilistId == null) continue;
      const aired = latestAiredByMediaId.get(entry.anilistId);
      if (!aired) continue;
      const delta = aired - entry.currentEpisode;
      if (delta > 0) total += delta;
    }
    return total;
  }, [entries, schedule]);
}
