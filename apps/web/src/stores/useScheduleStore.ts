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

/** Get local ISO date string (YYYY-MM-DD) from a Date, using local timezone */
export function toLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Get the Monday of the current week */
function getWeekStart(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const dow = date.getDay();
  const diff = dow === 0 ? -6 : 1 - dow; // Monday = 1
  const monday = new Date(date);
  monday.setDate(date.getDate() + diff);
  return toLocalDate(monday);
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
        selectedDay: toLocalDate(new Date()),
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
          } else {
            get().fetchWeekly(getWeekStart(day));
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
          const [y, m, d] = start.split('-').map(Number);
          const startDate = new Date(y, m - 1, d);
          const days: string[] = [];
          for (let i = 0; i < 7; i++) {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + i);
            days.push(toLocalDate(date));
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
