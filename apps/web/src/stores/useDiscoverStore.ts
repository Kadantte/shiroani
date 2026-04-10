import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { AnimeEvents } from '@shiroani/shared';
import { createLogger } from '@shiroani/shared';
import { emitWithErrorHandling } from '@/lib/socket';

const logger = createLogger('DiscoverStore');

// ── Types ────────────────────────────────────────────────────────

export type DiscoverTab = 'trending' | 'popular' | 'seasonal';

export interface DiscoverMedia {
  id: number;
  title: { romaji?: string; english?: string; native?: string };
  coverImage: { large?: string; medium?: string; extraLarge?: string; color?: string };
  bannerImage?: string;
  episodes?: number;
  status?: string;
  format?: string;
  genres?: string[];
  averageScore?: number;
  popularity?: number;
  season?: string;
  seasonYear?: number;
  nextAiringEpisode?: { airingAt: number; episode: number };
  description?: string;
}

interface PageInfo {
  current: number;
  hasNext: boolean;
}

interface PaginatedResponse {
  results: DiscoverMedia[];
  pageInfo: { total: number; currentPage: number; lastPage: number; hasNextPage: boolean };
}

// ── Season helpers ───────────────────────────────────────────────

type AniListSeason = 'WINTER' | 'SPRING' | 'SUMMER' | 'FALL';

function getCurrentSeason(): { year: number; season: AniListSeason } {
  const now = new Date();
  const month = now.getMonth(); // 0-indexed
  const year = now.getFullYear();

  let season: AniListSeason;
  if (month <= 2) season = 'WINTER';
  else if (month <= 5) season = 'SPRING';
  else if (month <= 8) season = 'SUMMER';
  else season = 'FALL';

  return { year, season };
}

// ── State ────────────────────────────────────────────────────────

interface DiscoverState {
  activeTab: DiscoverTab;
  // Browse results per tab
  trending: DiscoverMedia[];
  popular: DiscoverMedia[];
  seasonal: DiscoverMedia[];
  // Pagination per tab
  trendingPage: PageInfo;
  popularPage: PageInfo;
  seasonalPage: PageInfo;
  // Search
  searchQuery: string;
  searchResults: DiscoverMedia[];
  searchPage: PageInfo;
  isSearching: boolean;
  // General
  isLoading: boolean;
  error: string | null;
}

interface DiscoverActions {
  setTab: (tab: DiscoverTab) => void;
  setSearchQuery: (query: string) => void;
  search: (query: string) => void;
  fetchTrending: () => void;
  fetchPopular: () => void;
  fetchSeasonal: () => void;
  loadMore: () => void;
  clearSearch: () => void;
}

type DiscoverStore = DiscoverState & DiscoverActions;

const initialPage: PageInfo = { current: 1, hasNext: false };

export const useDiscoverStore = create<DiscoverStore>()(
  devtools(
    (set, get) => ({
      // State
      activeTab: 'trending',
      trending: [],
      popular: [],
      seasonal: [],
      trendingPage: { ...initialPage },
      popularPage: { ...initialPage },
      seasonalPage: { ...initialPage },
      searchQuery: '',
      searchResults: [],
      searchPage: { ...initialPage },
      isSearching: false,
      isLoading: false,
      error: null,

      // Actions

      setTab: (tab: DiscoverTab) => {
        set({ activeTab: tab }, undefined, 'discover/setTab');

        // Fetch data if tab has no results yet
        const state = get();
        if (state[tab].length === 0) {
          switch (tab) {
            case 'trending':
              state.fetchTrending();
              break;
            case 'popular':
              state.fetchPopular();
              break;
            case 'seasonal':
              state.fetchSeasonal();
              break;
          }
        }
      },

      setSearchQuery: (query: string) => {
        set({ searchQuery: query }, undefined, 'discover/setSearchQuery');
      },

      search: (query: string) => {
        if (!query.trim()) return;

        set(
          { isSearching: true, isLoading: true, searchQuery: query, error: null },
          undefined,
          'discover/searching'
        );

        emitWithErrorHandling<{ query: string; page?: number }, PaginatedResponse>(
          AnimeEvents.SEARCH,
          { query: query.trim(), page: 1 }
        )
          .then(data => {
            set(
              {
                searchResults: data.results,
                searchPage: {
                  current: data.pageInfo.currentPage,
                  hasNext: data.pageInfo.hasNextPage,
                },
                isLoading: false,
                isSearching: true,
                error: null,
              },
              undefined,
              'discover/searchResult'
            );
          })
          .catch((err: Error) => {
            logger.error('Nie udalo sie wyszukac:', err.message);
            set({ isLoading: false, error: err.message }, undefined, 'discover/searchError');
          });
      },

      fetchTrending: () => {
        set({ isLoading: true, error: null }, undefined, 'discover/fetchingTrending');

        emitWithErrorHandling<{ page?: number }, PaginatedResponse>(AnimeEvents.GET_TRENDING, {
          page: 1,
        })
          .then(data => {
            set(
              {
                trending: data.results,
                trendingPage: {
                  current: data.pageInfo.currentPage,
                  hasNext: data.pageInfo.hasNextPage,
                },
                isLoading: false,
                error: null,
              },
              undefined,
              'discover/trendingResult'
            );
          })
          .catch((err: Error) => {
            logger.error('Nie udalo sie pobrac popularnych:', err.message);
            set({ isLoading: false, error: err.message }, undefined, 'discover/trendingError');
          });
      },

      fetchPopular: () => {
        set({ isLoading: true, error: null }, undefined, 'discover/fetchingPopular');

        emitWithErrorHandling<{ page?: number }, PaginatedResponse>(AnimeEvents.GET_POPULAR, {
          page: 1,
        })
          .then(data => {
            set(
              {
                popular: data.results,
                popularPage: {
                  current: data.pageInfo.currentPage,
                  hasNext: data.pageInfo.hasNextPage,
                },
                isLoading: false,
                error: null,
              },
              undefined,
              'discover/popularResult'
            );
          })
          .catch((err: Error) => {
            logger.error('Nie udalo sie pobrac najpopularniejszych:', err.message);
            set({ isLoading: false, error: err.message }, undefined, 'discover/popularError');
          });
      },

      fetchSeasonal: () => {
        set({ isLoading: true, error: null }, undefined, 'discover/fetchingSeasonal');

        const { year, season } = getCurrentSeason();

        emitWithErrorHandling<{ year: number; season: string; page?: number }, PaginatedResponse>(
          AnimeEvents.GET_SEASONAL,
          { year, season, page: 1 }
        )
          .then(data => {
            set(
              {
                seasonal: data.results,
                seasonalPage: {
                  current: data.pageInfo.currentPage,
                  hasNext: data.pageInfo.hasNextPage,
                },
                isLoading: false,
                error: null,
              },
              undefined,
              'discover/seasonalResult'
            );
          })
          .catch((err: Error) => {
            logger.error('Nie udalo sie pobrac sezonowych:', err.message);
            set({ isLoading: false, error: err.message }, undefined, 'discover/seasonalError');
          });
      },

      loadMore: () => {
        const state = get();
        if (state.isLoading) return;

        // If searching, load more search results
        if (state.isSearching && state.searchQuery.trim()) {
          if (!state.searchPage.hasNext) return;

          const nextPage = state.searchPage.current + 1;
          set({ isLoading: true, error: null }, undefined, 'discover/loadMoreSearch');

          emitWithErrorHandling<{ query: string; page?: number }, PaginatedResponse>(
            AnimeEvents.SEARCH,
            { query: state.searchQuery.trim(), page: nextPage }
          )
            .then(data => {
              set(
                s => ({
                  searchResults: [...s.searchResults, ...data.results],
                  searchPage: {
                    current: data.pageInfo.currentPage,
                    hasNext: data.pageInfo.hasNextPage,
                  },
                  isLoading: false,
                  error: null,
                }),
                undefined,
                'discover/loadMoreSearchResult'
              );
            })
            .catch((err: Error) => {
              logger.error('Nie udalo sie zaladowac wiecej wynikow:', err.message);
              set(
                { isLoading: false, error: err.message },
                undefined,
                'discover/loadMoreSearchError'
              );
            });
          return;
        }

        // Load more for current tab
        const { activeTab } = state;
        const pageKey = `${activeTab}Page` as const;
        const pageInfo = state[pageKey];

        if (!pageInfo.hasNext) return;

        const nextPage = pageInfo.current + 1;
        set({ isLoading: true, error: null }, undefined, `discover/loadMore-${activeTab}`);

        let event: string;
        let payload: Record<string, unknown>;

        switch (activeTab) {
          case 'trending':
            event = AnimeEvents.GET_TRENDING;
            payload = { page: nextPage };
            break;
          case 'popular':
            event = AnimeEvents.GET_POPULAR;
            payload = { page: nextPage };
            break;
          case 'seasonal': {
            const { year, season } = getCurrentSeason();
            event = AnimeEvents.GET_SEASONAL;
            payload = { year, season, page: nextPage };
            break;
          }
        }

        emitWithErrorHandling<Record<string, unknown>, PaginatedResponse>(event, payload)
          .then(data => {
            set(
              s => ({
                [activeTab]: [...s[activeTab], ...data.results],
                [pageKey]: {
                  current: data.pageInfo.currentPage,
                  hasNext: data.pageInfo.hasNextPage,
                },
                isLoading: false,
                error: null,
              }),
              undefined,
              `discover/loadMore-${activeTab}-result`
            );
          })
          .catch((err: Error) => {
            logger.error('Nie udalo sie zaladowac wiecej:', err.message);
            set(
              { isLoading: false, error: err.message },
              undefined,
              `discover/loadMore-${activeTab}-error`
            );
          });
      },

      clearSearch: () => {
        set(
          {
            searchQuery: '',
            searchResults: [],
            searchPage: { ...initialPage },
            isSearching: false,
            error: null,
          },
          undefined,
          'discover/clearSearch'
        );
      },
    }),
    { name: 'discover' }
  )
);
