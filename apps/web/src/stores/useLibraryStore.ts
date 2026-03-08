import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import {
  type SocketStoreSlice,
  initialSocketState,
  createSocketActions,
  createSocketListeners,
} from '@/stores/utils/createSocketStore';

// TODO: Import library-related event names and types from @shiroani/shared
// import { LibraryEvents, type LibraryEntry, type WatchStatus } from '@shiroani/shared';

/**
 * Watch status categories for library organization
 */
type WatchStatus = 'watching' | 'completed' | 'on_hold' | 'dropped' | 'plan_to_watch';

/**
 * Library store state
 *
 * TODO: Define the following state fields:
 * - entries: LibraryEntry[] — All anime in user's library
 * - filteredEntries: LibraryEntry[] — Entries filtered by current status filter
 * - activeFilter: WatchStatus | 'all' — Current status filter
 * - sortBy: 'title' | 'score' | 'progress' | 'updatedAt' — Sort field
 * - sortOrder: 'asc' | 'desc' — Sort direction
 * - stats: { watching: number, completed: number, ... } — Count per status
 */
interface LibraryState extends SocketStoreSlice {
  // Placeholder state — replace with actual types from shared package
  entries: unknown[];
  activeFilter: WatchStatus | 'all';
  sortBy: 'title' | 'score' | 'progress' | 'updatedAt';
  sortOrder: 'asc' | 'desc';
}

/**
 * Library store actions
 *
 * TODO: Define the following actions:
 * - fetchLibrary(): void — Fetch user's full library
 * - addToLibrary(animeId: string, status: WatchStatus): void — Add anime to library
 * - removeFromLibrary(animeId: string): void — Remove anime from library
 * - updateStatus(animeId: string, status: WatchStatus): void — Change watch status
 * - updateProgress(animeId: string, episode: number): void — Update episode progress
 * - updateScore(animeId: string, score: number): void — Set user score
 * - setFilter(filter: WatchStatus | 'all'): void — Filter entries by status
 * - setSort(field: string, order: string): void — Sort entries
 */
interface LibraryActions {
  setFilter: (filter: WatchStatus | 'all') => void;
  setSort: (
    sortBy: 'title' | 'score' | 'progress' | 'updatedAt',
    sortOrder: 'asc' | 'desc'
  ) => void;
  initListeners: () => void;
  cleanupListeners: () => void;
}

type LibraryStore = LibraryState & LibraryActions;

export const useLibraryStore = create<LibraryStore>()(
  devtools(
    (set, get) => {
      const socketActions = createSocketActions<LibraryStore>(set, 'library');

      const { initListeners, cleanupListeners } = createSocketListeners<LibraryStore>(
        get,
        set,
        'library',
        {
          listeners: [
            // TODO: Add socket event listeners for library updates
            // {
            //   event: LibraryEvents.LIBRARY_UPDATED,
            //   handler: (data, get) => {
            //     set({ entries: data as LibraryEntry[] }, undefined, 'library/updated');
            //   },
            // },
            // {
            //   event: LibraryEvents.ENTRY_CHANGED,
            //   handler: (data, get) => {
            //     // Update single entry in entries array
            //   },
            // },
          ],
          onConnect: () => {
            // TODO: Re-fetch library on reconnect
            // emitWithErrorHandling('library:fetch', {});
          },
        }
      );

      return {
        // State
        ...initialSocketState,
        entries: [],
        activeFilter: 'all',
        sortBy: 'updatedAt',
        sortOrder: 'desc',

        // Socket actions
        ...socketActions,

        // Actions
        setFilter: (filter: WatchStatus | 'all') => {
          set({ activeFilter: filter }, undefined, 'library/setFilter');
        },

        setSort: (
          sortBy: 'title' | 'score' | 'progress' | 'updatedAt',
          sortOrder: 'asc' | 'desc'
        ) => {
          set({ sortBy, sortOrder }, undefined, 'library/setSort');
        },

        initListeners,
        cleanupListeners,
      };
    },
    { name: 'library' }
  )
);
