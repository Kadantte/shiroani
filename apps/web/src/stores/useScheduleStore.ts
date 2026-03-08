import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import {
  type SocketStoreSlice,
  initialSocketState,
  createSocketActions,
  createSocketListeners,
} from '@/stores/utils/createSocketStore';
import { type AiringAnime, ScheduleEvents } from '@shiroani/shared';
import { emitWithErrorHandling } from '@/lib/socket';
import { createLogger } from '@shiroani/shared';

const logger = createLogger('ScheduleStore');

/**
 * Schedule store state
 */
interface ScheduleState extends SocketStoreSlice {
  /** Airing schedule grouped by ISO date string */
  schedule: Record<string, AiringAnime[]>;
  /** Currently selected day (ISO date string YYYY-MM-DD) */
  selectedDay: string;
  /** View mode: daily or weekly */
  viewMode: 'daily' | 'weekly';
  /** Filter to show only anime in user's library */
  onlyInLibrary: boolean;
}

/**
 * Schedule store actions
 */
interface ScheduleActions {
  selectDay: (day: string) => void;
  setViewMode: (mode: 'daily' | 'weekly') => void;
  toggleLibraryFilter: () => void;
  fetchDaily: (date: string) => void;
  fetchWeekly: (startDate: string) => void;
  getEntriesForDay: (day: string) => AiringAnime[];
  getWeekDays: () => string[];
  initListeners: () => void;
  cleanupListeners: () => void;
}

type ScheduleStore = ScheduleState & ScheduleActions;

/** Get ISO date string (YYYY-MM-DD) from a Date */
function toISODate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/** Get the Monday of the current week */
function getWeekStart(dateStr: string): string {
  const date = new Date(dateStr);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday = 1
  const monday = new Date(date);
  monday.setDate(date.getDate() + diff);
  return toISODate(monday);
}

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
            {
              event: ScheduleEvents.DAILY_RESULT,
              handler: data => {
                const result = data as { date: string; entries: AiringAnime[] };
                set(
                  state => ({
                    schedule: {
                      ...state.schedule,
                      [result.date]: result.entries,
                    },
                    isLoading: false,
                  }),
                  undefined,
                  'schedule/dailyResult'
                );
              },
            },
            {
              event: ScheduleEvents.WEEKLY_RESULT,
              handler: data => {
                const result = data as { schedule: Record<string, AiringAnime[]> };
                set(
                  state => ({
                    schedule: {
                      ...state.schedule,
                      ...result.schedule,
                    },
                    isLoading: false,
                  }),
                  undefined,
                  'schedule/weeklyResult'
                );
              },
            },
          ],
          onConnect: () => {
            const { selectedDay, viewMode } = get();
            if (viewMode === 'daily') {
              get().fetchDaily(selectedDay);
            } else {
              get().fetchWeekly(getWeekStart(selectedDay));
            }
          },
        }
      );

      return {
        // State
        ...initialSocketState,
        schedule: {},
        selectedDay: toISODate(new Date()),
        viewMode: 'daily',
        onlyInLibrary: false,

        // Socket actions
        ...socketActions,

        // Actions
        selectDay: (day: string) => {
          set({ selectedDay: day }, undefined, 'schedule/selectDay');
          const { viewMode } = get();
          if (viewMode === 'daily') {
            get().fetchDaily(day);
          }
        },

        setViewMode: (mode: 'daily' | 'weekly') => {
          set({ viewMode: mode }, undefined, 'schedule/setViewMode');
          const { selectedDay } = get();
          if (mode === 'daily') {
            get().fetchDaily(selectedDay);
          } else {
            get().fetchWeekly(getWeekStart(selectedDay));
          }
        },

        toggleLibraryFilter: () => {
          set({ onlyInLibrary: !get().onlyInLibrary }, undefined, 'schedule/toggleLibraryFilter');
        },

        fetchDaily: (date: string) => {
          set({ isLoading: true }, undefined, 'schedule/fetchingDaily');
          emitWithErrorHandling(ScheduleEvents.GET_DAILY, { date }).catch((err: Error) => {
            logger.error('Failed to fetch daily schedule:', err.message);
            set({ isLoading: false, error: err.message }, undefined, 'schedule/fetchDailyError');
          });
        },

        fetchWeekly: (startDate: string) => {
          set({ isLoading: true }, undefined, 'schedule/fetchingWeekly');
          emitWithErrorHandling(ScheduleEvents.GET_WEEKLY, { startDate }).catch((err: Error) => {
            logger.error('Failed to fetch weekly schedule:', err.message);
            set({ isLoading: false, error: err.message }, undefined, 'schedule/fetchWeeklyError');
          });
        },

        getEntriesForDay: (day: string) => {
          const { schedule } = get();
          return schedule[day] ?? [];
        },

        getWeekDays: () => {
          const { selectedDay } = get();
          const start = getWeekStart(selectedDay);
          const days: string[] = [];
          const startDate = new Date(start);
          for (let i = 0; i < 7; i++) {
            const d = new Date(startDate);
            d.setDate(startDate.getDate() + i);
            days.push(toISODate(d));
          }
          return days;
        },

        initListeners,
        cleanupListeners,
      };
    },
    { name: 'schedule' }
  )
);
