import { useCallback } from 'react';
import { useNotificationStore } from '@/stores/useNotificationStore';
import type { AiringAnime } from '@shiroani/shared';

/**
 * Shared hook that encapsulates notification subscribe/unsubscribe logic
 * used across all schedule view components.
 */
export function useNotificationToggle(mediaId: number, anime: AiringAnime) {
  const isSubscribed = useNotificationStore(state => state.subscribedIds.has(mediaId));
  const subscribe = useNotificationStore(state => state.subscribe);
  const unsubscribe = useNotificationStore(state => state.unsubscribe);

  const toggle = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (isSubscribed) {
        unsubscribe(mediaId);
      } else {
        subscribe(anime);
      }
    },
    [isSubscribed, mediaId, anime, subscribe, unsubscribe]
  );

  return { isSubscribed, toggle };
}
