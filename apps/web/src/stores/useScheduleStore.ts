import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import {
  type SocketStoreSlice,
  initialSocketState,
  createSocketActions,
  createSocketListeners,
} from '@/stores/utils/createSocketStore';

// TODO: Import schedule-related event names and types from @shiroani/shared
// import { ScheduleEvents, type AiringScheduleEntry } from '@shiroani/shared';

/**
 * Schedule store state
 *
 * TODO: Define the following state fields:
 * - schedule: Map<string, AiringScheduleEntry[]> — Airing schedule grouped by day (ISO date key)
 * - selectedDay: string — Currently selected day (ISO date string)
 * - viewMode: 'daily' | 'weekly' — Calendar view mode
 * - onlyInLibrary: boolean — Filter to show only anime in user's library
 * - lastFetchedAt: number | null — Timestamp of last schedule fetch for cache invalidation
 */
interface ScheduleState extends SocketStoreSlice {
  // Placeholder state — replace with actual types from shared package
  schedule: Record<string, unknown[]>;
  selectedDay: string;
  viewMode: 'daily' | 'weekly';
  onlyInLibrary: boolean;
}

/**
 * Schedule store actions
 *
 * TODO: Define the following actions:
 * - fetchSchedule(startDate: string, endDate: string): void — Fetch airing schedule for date range
 * - selectDay(day: string): void — Select a day to view
 * - setViewMode(mode: 'daily' | 'weekly'): void — Switch between daily/weekly view
 * - toggleLibraryFilter(): void — Toggle showing only library anime
 * - refreshSchedule(): void — Force refresh the schedule data
 */
interface ScheduleActions {
  selectDay: (day: string) => void;
  setViewMode: (mode: 'daily' | 'weekly') => void;
  toggleLibraryFilter: () => void;
  initListeners: () => void;
  cleanupListeners: () => void;
}

type ScheduleStore = ScheduleState & ScheduleActions;

export const useScheduleStore = create<ScheduleStore>()(
  devtools(
    (set, get) => {
      const socketActions = createSocketActions<ScheduleStore>(set, 'schedule');

      const { initListeners, cleanupListeners } = createSocketListeners<ScheduleStore>(
        get,
        set,
        'schedule',
        {
          listeners: [
            // TODO: Add socket event listeners for schedule updates
            // {
            //   event: ScheduleEvents.SCHEDULE_UPDATED,
            //   handler: (data, get) => {
            //     // Merge new schedule data into state
            //   },
            // },
          ],
          onConnect: () => {
            // TODO: Re-fetch schedule on reconnect
          },
        }
      );

      return {
        // State
        ...initialSocketState,
        schedule: {},
        selectedDay: new Date().toISOString().split('T')[0],
        viewMode: 'daily',
        onlyInLibrary: false,

        // Socket actions
        ...socketActions,

        // Actions
        selectDay: (day: string) => {
          set({ selectedDay: day }, undefined, 'schedule/selectDay');
          // TODO: Fetch schedule for the selected day if not cached
        },

        setViewMode: (mode: 'daily' | 'weekly') => {
          set({ viewMode: mode }, undefined, 'schedule/setViewMode');
        },

        toggleLibraryFilter: () => {
          set({ onlyInLibrary: !get().onlyInLibrary }, undefined, 'schedule/toggleLibraryFilter');
        },

        initListeners,
        cleanupListeners,
      };
    },
    { name: 'schedule' }
  )
);
