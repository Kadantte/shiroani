import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { AppStatsSnapshot } from '@shiroani/shared';
import { IS_ELECTRON } from '@/lib/platform';

const POLL_INTERVAL_MS = 60_000;

const EMPTY_SNAPSHOT: AppStatsSnapshot = {
  version: 1,
  createdAt: null,
  totals: {
    appOpenSeconds: 0,
    appActiveSeconds: 0,
    animeWatchSeconds: 0,
    sessionCount: 0,
  },
  byDay: {},
  currentStreak: { days: 0, lastDay: null },
  longestStreak: { days: 0, lastDay: null },
};

interface AppStatsState {
  snapshot: AppStatsSnapshot;
  isLoading: boolean;
  lastFetchedAt: number | null;
}

interface AppStatsActions {
  refresh: () => Promise<void>;
  reset: () => Promise<void>;
}

type AppStatsStore = AppStatsState & AppStatsActions;

export const useAppStatsStore = create<AppStatsStore>()(
  devtools(
    (set, get) => ({
      snapshot: EMPTY_SNAPSHOT,
      isLoading: false,
      lastFetchedAt: null,

      refresh: async () => {
        if (!IS_ELECTRON || !window.electronAPI?.appStats) return;
        if (get().isLoading) return;
        set({ isLoading: true }, undefined, 'app-stats/fetching');
        const snapshot = await window.electronAPI.appStats.getSnapshot();
        set(
          { snapshot, isLoading: false, lastFetchedAt: Date.now() },
          undefined,
          'app-stats/loaded'
        );
      },

      reset: async () => {
        if (!IS_ELECTRON || !window.electronAPI?.appStats) return;
        const snapshot = await window.electronAPI.appStats.reset();
        set(
          { snapshot, isLoading: false, lastFetchedAt: Date.now() },
          undefined,
          'app-stats/reset'
        );
      },
    }),
    { name: 'app-stats' }
  )
);

let pollTimer: ReturnType<typeof setInterval> | null = null;

/** Start the 60s polling loop. Idempotent; safe to call from multiple mounts. */
export function startAppStatsPolling(): void {
  if (pollTimer) return;
  void useAppStatsStore.getState().refresh();
  pollTimer = setInterval(() => {
    void useAppStatsStore.getState().refresh();
  }, POLL_INTERVAL_MS);
}

export function stopAppStatsPolling(): void {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}
