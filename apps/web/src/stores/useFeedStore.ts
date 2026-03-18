import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import {
  type SocketStoreSlice,
  initialSocketState,
  createSocketActions,
  createSocketListeners,
} from '@/stores/utils/createSocketStore';
import { createMemoizedSelector } from '@/stores/utils/createMemoizedSelector';
import {
  type FeedItem,
  type FeedSource,
  type FeedCategory,
  type FeedLanguage,
  type FeedGetItemsPayload,
  type FeedGetItemsResult,
  type FeedGetSourcesResult,
  FeedEvents,
} from '@shiroani/shared';
import { emitWithErrorHandling } from '@/lib/socket';
import { createLogger } from '@shiroani/shared';

const logger = createLogger('FeedStore');

const PAGE_SIZE = 30;

/**
 * Feed store state
 */
interface FeedState extends SocketStoreSlice {
  items: FeedItem[];
  sources: FeedSource[];
  total: number;
  hasMore: boolean;
  categoryFilter: FeedCategory | 'all';
  languageFilter: FeedLanguage | 'all';
  sourceFilter: number | null;
  isRefreshing: boolean;
  lastRefreshNewCount: number | null;
}

/**
 * Feed store actions
 */
interface FeedActions {
  fetchItems: (loadMore?: boolean) => void;
  fetchSources: () => void;
  refreshFeeds: () => void;
  setCategoryFilter: (category: FeedCategory | 'all') => void;
  setLanguageFilter: (language: FeedLanguage | 'all') => void;
  setSourceFilter: (sourceId: number | null) => void;
  toggleSource: (id: number, enabled: boolean) => void;
  initListeners: () => void;
  cleanupListeners: () => void;
}

type FeedStore = FeedState & FeedActions;

export const useFeedStore = create<FeedStore>()(
  devtools(
    (set, get) => {
      const socketActions = createSocketActions<FeedStore>(set, 'feed');

      const { initListeners, cleanupListeners } = createSocketListeners<FeedStore>(
        get,
        set,
        'feed',
        {
          listeners: [
            {
              event: FeedEvents.NEW_ITEMS,
              handler: data => {
                const { newItemsCount } = data as { newItemsCount: number };
                logger.info(`${newItemsCount} new feed items available`);
                set(
                  { isRefreshing: false, lastRefreshNewCount: newItemsCount },
                  undefined,
                  'feed/refreshComplete'
                );
                // Re-fetch items to include the new ones
                get().fetchItems();
              },
            },
          ],
          onConnect: () => {
            get().fetchItems();
            get().fetchSources();
          },
        }
      );

      return {
        // State
        ...initialSocketState,
        items: [],
        sources: [],
        total: 0,
        hasMore: false,
        categoryFilter: 'all',
        languageFilter: 'all',
        sourceFilter: null,
        isRefreshing: false,
        lastRefreshNewCount: null,

        // Socket actions
        ...socketActions,

        // Actions
        fetchItems: (loadMore?: boolean) => {
          const { categoryFilter, languageFilter, sourceFilter, items, isLoading } = get();

          // Prevent duplicate requests
          if (isLoading) return;

          const offset = loadMore ? items.length : 0;

          set({ isLoading: true }, undefined, loadMore ? 'feed/loadingMore' : 'feed/fetching');

          const payload: FeedGetItemsPayload = {
            category: categoryFilter,
            language: languageFilter,
            sourceId: sourceFilter ?? undefined,
            limit: PAGE_SIZE,
            offset,
          };

          emitWithErrorHandling<FeedGetItemsPayload, FeedGetItemsResult>(
            FeedEvents.GET_ITEMS,
            payload
          )
            .then(data => {
              if (loadMore) {
                set(
                  state => {
                    // Deduplicate: only append items not already in the list
                    const existingIds = new Set(state.items.map(i => i.id));
                    const newItems = data.items.filter(i => !existingIds.has(i.id));
                    return {
                      items: [...state.items, ...newItems],
                      total: data.total,
                      hasMore: data.hasMore,
                      isLoading: false,
                      error: null,
                    };
                  },
                  undefined,
                  'feed/loadedMore'
                );
              } else {
                set(
                  {
                    items: data.items,
                    total: data.total,
                    hasMore: data.hasMore,
                    isLoading: false,
                    error: null,
                  },
                  undefined,
                  'feed/result'
                );
              }
            })
            .catch((err: Error) => {
              logger.error('Failed to fetch feed items:', err.message);
              set({ isLoading: false, error: err.message }, undefined, 'feed/fetchError');
            });
        },

        fetchSources: () => {
          emitWithErrorHandling<Record<string, never>, FeedGetSourcesResult>(
            FeedEvents.GET_SOURCES,
            {}
          )
            .then(data => {
              set({ sources: data.sources ?? [] }, undefined, 'feed/sourcesResult');
            })
            .catch((err: Error) => {
              logger.error('Failed to fetch feed sources:', err.message);
            });
        },

        refreshFeeds: () => {
          set({ isRefreshing: true, lastRefreshNewCount: null }, undefined, 'feed/refreshing');
          // The backend returns immediately (fire-and-forget) and broadcasts
          // FeedEvents.NEW_ITEMS when done, which the listener above handles.
          emitWithErrorHandling<Record<string, never>, { started: boolean }>(
            FeedEvents.REFRESH,
            {}
          ).catch((err: Error) => {
            logger.error('Failed to start feed refresh:', err.message);
            set({ isRefreshing: false }, undefined, 'feed/refreshError');
          });
        },

        setCategoryFilter: (category: FeedCategory | 'all') => {
          set(
            { categoryFilter: category, lastRefreshNewCount: null },
            undefined,
            'feed/setCategoryFilter'
          );
          // Re-fetch with new filter
          // Need to defer so the state update is applied first
          setTimeout(() => get().fetchItems(), 0);
        },

        setLanguageFilter: (language: FeedLanguage | 'all') => {
          set(
            { languageFilter: language, lastRefreshNewCount: null },
            undefined,
            'feed/setLanguageFilter'
          );
          setTimeout(() => get().fetchItems(), 0);
        },

        setSourceFilter: (sourceId: number | null) => {
          set(
            { sourceFilter: sourceId, lastRefreshNewCount: null },
            undefined,
            'feed/setSourceFilter'
          );
          setTimeout(() => get().fetchItems(), 0);
        },

        toggleSource: (id: number, enabled: boolean) => {
          // Optimistic update
          set(
            state => ({
              sources: state.sources.map(s => (s.id === id ? { ...s, enabled } : s)),
            }),
            undefined,
            'feed/toggleSourceOptimistic'
          );

          emitWithErrorHandling(FeedEvents.TOGGLE_SOURCE, { id, enabled }).catch((err: Error) => {
            logger.error('Failed to toggle source:', err.message);
            // Revert on error
            get().fetchSources();
          });
        },

        initListeners,
        cleanupListeners,
      };
    },
    { name: 'feed' }
  )
);

/**
 * Memoized selector that returns items filtered by category, language, and source.
 * Provides instant client-side filtering for cached items while the server
 * re-fetches with the new filters.
 */
export const getFilteredItems = createMemoizedSelector(
  (
    state: Pick<FeedState, 'items' | 'categoryFilter' | 'languageFilter' | 'sourceFilter'>
  ): FeedItem[] => {
    const { items, categoryFilter, languageFilter, sourceFilter } = state;

    let filtered = items;

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(item => item.sourceCategory === categoryFilter);
    }

    if (languageFilter !== 'all') {
      filtered = filtered.filter(item => item.sourceLanguage === languageFilter);
    }

    if (sourceFilter !== null) {
      filtered = filtered.filter(item => item.feedSourceId === sourceFilter);
    }

    return filtered;
  }
);
