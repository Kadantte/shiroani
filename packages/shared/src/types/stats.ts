/**
 * Local "time spent in ShiroAni" stats.
 *
 * The desktop main process owns the source of truth in electron-store under the
 * key `app-stats`. The renderer reads snapshots over IPC; both sides type
 * against {@link AppStatsSnapshot}.
 *
 * Three correlated counters tell the Spotify-Wrapped-style story:
 *  - `appOpenSeconds`    — wall-clock seconds the main window has been open
 *  - `appActiveSeconds`  — focused + visible + system not idle
 *  - `animeWatchSeconds` — subset of active where the browser is on a
 *                          recognized anime site
 *
 * Values are seconds (integers). Day buckets use the user's *local* date as
 * `YYYY-MM-DD` so a "day" lines up with how the user perceives it.
 */

/** Per-day rollup. One entry per local calendar day. */
export interface AppStatsDayBucket {
  appOpenSeconds: number;
  appActiveSeconds: number;
  animeWatchSeconds: number;
  longestSessionSeconds: number;
}

/** Lifetime rollup — never derived from `byDay`, see DST notes in the tracker. */
export interface AppStatsTotals {
  appOpenSeconds: number;
  appActiveSeconds: number;
  animeWatchSeconds: number;
  sessionCount: number;
}

/** Rolling open/active streak counts. */
export interface AppStatsStreak {
  /** Current consecutive-day streak length (0 if today is a fresh break). */
  days: number;
  /** Last day (`YYYY-MM-DD`) that contributed to the streak. */
  lastDay: string | null;
}

/**
 * Persisted shape of the `app-stats` electron-store key.
 *
 * `version` is bumped on schema migrations; the tracker resets to defaults if
 * it cannot parse the stored value.
 */
export interface AppStatsSnapshot {
  version: 1;
  /** ISO timestamp of the very first session ever recorded. */
  createdAt: string | null;
  totals: AppStatsTotals;
  /**
   * Map of `YYYY-MM-DD` → bucket. Capped to ~365 entries by the tracker;
   * older days roll into `totals` and get dropped.
   */
  byDay: Record<string, AppStatsDayBucket>;
  currentStreak: AppStatsStreak;
  longestStreak: AppStatsStreak;
}
