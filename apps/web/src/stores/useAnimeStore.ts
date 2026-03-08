import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import {
  type SocketStoreSlice,
  initialSocketState,
  createSocketActions,
  createSocketListeners,
} from '@/stores/utils/createSocketStore';

// TODO: Import anime-related event names and types from @shiroani/shared
// import { AnimeEvents, type Anime, type AnimeSearchResult, type AiringScheduleEntry } from '@shiroani/shared';

/**
 * Anime store state
 *
 * TODO: Define the following state fields:
 * - searchQuery: string — Current search query
 * - searchResults: Anime[] — Array of anime search results
 * - selectedAnime: AnimeDetail | null — Currently selected anime's full details
 * - trendingAnime: Anime[] — Trending anime list for the browse page
 * - popularAnime: Anime[] — Popular anime list for the browse page
 * - recentlyUpdated: Anime[] — Recently updated anime episodes
 * - genres: string[] — Available genre filters
 * - selectedGenres: string[] — Currently selected genre filters
 * - airingScheduleCache: Map<string, AiringScheduleEntry[]> — Cached airing schedule by date
 */
interface AnimeState extends SocketStoreSlice {
  // Placeholder state — replace with actual types from shared package
  searchQuery: string;
  searchResults: unknown[];
  selectedAnimeId: string | null;
}

/**
 * Anime store actions
 *
 * TODO: Define the following actions:
 * - searchAnime(query: string): void — Search anime by title
 * - selectAnime(id: string): void — Fetch and display anime details
 * - clearSearch(): void — Clear search results
 * - fetchTrending(): void — Fetch trending anime
 * - fetchPopular(): void — Fetch popular anime
 * - fetchRecentlyUpdated(): void — Fetch recently updated episodes
 * - setGenreFilter(genres: string[]): void — Filter by genres
 */
interface AnimeActions {
  setSearchQuery: (query: string) => void;
  clearSearch: () => void;
  selectAnime: (id: string | null) => void;
  initListeners: () => void;
  cleanupListeners: () => void;
}

type AnimeStore = AnimeState & AnimeActions;

export const useAnimeStore = create<AnimeStore>()(
  devtools(
    (set, get) => {
      const socketActions = createSocketActions<AnimeStore>(set, 'anime');

      const { initListeners, cleanupListeners } = createSocketListeners<AnimeStore>(
        get,
        set,
        'anime',
        {
          listeners: [
            // TODO: Add socket event listeners for anime data
            // {
            //   event: AnimeEvents.SEARCH_RESULTS,
            //   handler: (data, get) => {
            //     set({ searchResults: data as Anime[] }, undefined, 'anime/searchResults');
            //   },
            // },
            // {
            //   event: AnimeEvents.ANIME_DETAILS,
            //   handler: (data, get) => {
            //     set({ selectedAnime: data as AnimeDetail }, undefined, 'anime/animeDetails');
            //   },
            // },
          ],
          onConnect: () => {
            // TODO: Re-fetch data on reconnect if needed
          },
        }
      );

      return {
        // State
        ...initialSocketState,
        searchQuery: '',
        searchResults: [],
        selectedAnimeId: null,

        // Socket actions
        ...socketActions,

        // Actions
        setSearchQuery: (query: string) => {
          set({ searchQuery: query }, undefined, 'anime/setSearchQuery');
          // TODO: Emit search event to backend
          // emitWithErrorHandling('anime:search', { query });
        },

        clearSearch: () => {
          set({ searchQuery: '', searchResults: [] }, undefined, 'anime/clearSearch');
        },

        selectAnime: (id: string | null) => {
          set({ selectedAnimeId: id }, undefined, 'anime/selectAnime');
          // TODO: Fetch anime details from backend
          // if (id) emitWithErrorHandling('anime:details', { id });
        },

        initListeners,
        cleanupListeners,
      };
    },
    { name: 'anime' }
  )
);
