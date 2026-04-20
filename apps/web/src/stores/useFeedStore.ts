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
  FEED_STARTUP_REFRESH_SETTING_KEY,
} from '@shiroani/shared';
import { emitWithErrorHandling } from '@/lib/socket';
import { createLogger } from '@shiroani/shared';

const logger = createLogger('FeedStore');

const PAGE_SIZE = 30;
const REFRESH_FALLBACK_MS = 35_000;

async function isStartupRefreshEnabled(): Promise<boolean> {
  try {
    const value = await window.electronAPI?.store?.get<boolean>(FEED_STARTUP_REFRESH_SETTING_KEY);
    return value === true;
  } catch (error) {
    logger.warn('Failed to read feed startup refresh setting:', error);
    return false;
  }
}

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
  isBootstrapping: boolean;
  lastRefreshNewCount: number | null;
  /** Epoch ms of the last time the user opened the Feed view. Items published after this are "unread" from the newtab greeting's perspective. */
  lastVisitedAt: number;
}

/**
 * Feed store actions
 */
interface FeedActions {
  fetchItems: (loadMore?: boolean, options?: { bootstrapIfEmpty?: boolean }) => void;
  fetchSources: () => void;
  refreshFeeds: (options?: { isBootstrap?: boolean }) => void;
  setCategoryFilter: (category: FeedCategory | 'all') => void;
  setLanguageFilter: (language: FeedLanguage | 'all') => void;
  setSourceFilter: (sourceId: number | null) => void;
  toggleSource: (id: number, enabled: boolean) => void;
  /** Stamp `lastVisitedAt` to now — resets the newtab unread count. */
  markAllSeen: () => void;
  initListeners: () => void;
  cleanupListeners: () => void;
}

const LAST_VISITED_STORAGE_KEY = 'shiroani:feedLastVisitedAt';

function getPersistedLastVisitedAt(): number {
  try {
    const raw = localStorage.getItem(LAST_VISITED_STORAGE_KEY);
    if (!raw) return 0;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : 0;
  } catch {
    return 0;
  }
}

function persistLastVisitedAt(ts: number) {
  try {
    localStorage.setItem(LAST_VISITED_STORAGE_KEY, String(ts));
  } catch {
    // storage unavailable — in-memory is authoritative
  }
}

type FeedStore = FeedState & FeedActions;

export const useFeedStore = create<FeedStore>()(
  devtools(
    (set, get) => {
      const socketActions = createSocketActions<FeedStore>(set, 'feed');
      let refreshFallbackTimer: ReturnType<typeof setTimeout> | null = null;

      const clearRefreshFallback = () => {
        if (refreshFallbackTimer) {
          clearTimeout(refreshFallbackTimer);
          refreshFallbackTimer = null;
        }
      };

      const scheduleRefreshFallback = () => {
        clearRefreshFallback();
        refreshFallbackTimer = setTimeout(() => {
          if (!get().isRefreshing) return;

          logger.warn('Feed refresh completion event missing, falling back to a direct fetch');
          set({ isRefreshing: false, isBootstrapping: false }, undefined, 'feed/refreshFallback');
          get().fetchItems();
        }, REFRESH_FALLBACK_MS);
      };

      const { initListeners, cleanupListeners: cleanupSocketListeners } =
        createSocketListeners<FeedStore>(get, set, 'feed', {
          listeners: [
            {
              event: FeedEvents.NEW_ITEMS,
              handler: data => {
                const { newItemsCount } = data as { newItemsCount: number };
                clearRefreshFallback();
                logger.info(`${newItemsCount} new feed items available`);
                set(
                  {
                    isRefreshing: false,
                    isBootstrapping: false,
                    lastRefreshNewCount: newItemsCount,
                  },
                  undefined,
                  'feed/refreshComplete'
                );
                // Re-fetch items to include the new ones
                get().fetchItems();
              },
            },
          ],
          onConnect: () => {
            get().fetchSources();
            void isStartupRefreshEnabled().then(enabled => {
              get().fetchItems(false, { bootstrapIfEmpty: enabled });
            });
          },
        });

      const cleanupListeners = () => {
        clearRefreshFallback();
        cleanupSocketListeners();
      };

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
        isBootstrapping: false,
        lastRefreshNewCount: null,
        lastVisitedAt: getPersistedLastVisitedAt(),

        // Socket actions
        ...socketActions,

        // Actions
        fetchItems: (loadMore?: boolean, options?: { bootstrapIfEmpty?: boolean }) => {
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
                const shouldBootstrap =
                  options?.bootstrapIfEmpty === true &&
                  data.items.length === 0 &&
                  categoryFilter === 'all' &&
                  languageFilter === 'all' &&
                  sourceFilter === null;

                set(
                  {
                    items: data.items,
                    total: data.total,
                    hasMore: data.hasMore,
                    isLoading: false,
                    isBootstrapping: shouldBootstrap,
                    error: null,
                  },
                  undefined,
                  'feed/result'
                );

                if (shouldBootstrap) {
                  get().refreshFeeds({ isBootstrap: true });
                }
              }
            })
            .catch((err: Error) => {
              logger.error('Failed to fetch feed items:', err.message);
              set(
                { isLoading: false, isBootstrapping: false, error: err.message },
                undefined,
                'feed/fetchError'
              );
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

        refreshFeeds: (options?: { isBootstrap?: boolean }) => {
          clearRefreshFallback();
          set(
            {
              isRefreshing: true,
              isBootstrapping: options?.isBootstrap ?? false,
              lastRefreshNewCount: null,
              error: null,
            },
            undefined,
            'feed/refreshing'
          );
          // The backend returns immediately (fire-and-forget) and broadcasts
          // FeedEvents.NEW_ITEMS when done, which the listener above handles.
          emitWithErrorHandling<Record<string, never>, { started: boolean }>(FeedEvents.REFRESH, {})
            .then(() => {
              scheduleRefreshFallback();
            })
            .catch((err: Error) => {
              clearRefreshFallback();
              logger.error('Failed to start feed refresh:', err.message);
              set(
                {
                  isRefreshing: false,
                  isBootstrapping: false,
                  error: err.message,
                },
                undefined,
                'feed/refreshError'
              );
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

        markAllSeen: () => {
          const now = Date.now();
          if (get().lastVisitedAt === now) return;
          set({ lastVisitedAt: now }, undefined, 'feed/markAllSeen');
          persistLastVisitedAt(now);
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
