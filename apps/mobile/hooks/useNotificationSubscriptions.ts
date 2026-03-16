import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import type { AiringAnime, NotificationSubscription } from '@shiroani/shared';
import {
  getNotificationSubscriptions,
  addNotificationSubscription,
  removeNotificationSubscription,
} from '@/lib/db-queries';
import { getAnimeTitle, getCoverUrl } from '@/lib/schedule-utils';

export function useNotificationSubscriptions() {
  const db = useSQLiteContext();
  const [subscriptions, setSubscriptions] = useState<NotificationSubscription[]>([]);

  const refresh = useCallback(async () => {
    const data = await getNotificationSubscriptions(db);
    setSubscriptions(data);
  }, [db]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const subscribedIds = useMemo(
    () => new Set(subscriptions.map(s => s.anilistId)),
    [subscriptions]
  );

  const isSubscribed = useCallback(
    (anilistId: number) => subscribedIds.has(anilistId),
    [subscribedIds]
  );

  const toggle = useCallback(
    async (anime: AiringAnime) => {
      const mediaId = anime.media.id;
      if (subscribedIds.has(mediaId)) {
        await removeNotificationSubscription(db, mediaId);
        setSubscriptions(prev => prev.filter(s => s.anilistId !== mediaId));
      } else {
        await addNotificationSubscription(db, {
          anilistId: mediaId,
          title: getAnimeTitle(anime.media),
          titleRomaji: anime.media.title.romaji,
          coverImage: getCoverUrl(anime.media),
        });
        await refresh();
      }
    },
    [db, subscribedIds, refresh]
  );

  return { subscriptions, subscribedIds, isSubscribed, toggle };
}
