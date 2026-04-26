import { BrowserWindow, powerMonitor } from 'electron';
import type {
  AppStatsDayBucket,
  AppStatsSnapshot,
  AppStatsStreak,
  AppStatsTotals,
} from '@shiroani/shared';
import { store } from '../store';
import { createMainLogger } from '../logging/logger';

const logger = createMainLogger('AppStatsTracker');

const STORE_KEY = 'app-stats';

const TICK_INTERVAL_MS = 10_000;
const FLUSH_INTERVAL_MS = 60_000;

/**
 * Reject ticks whose monotonic delta exceeds this. Catches the case where the
 * machine slept without firing a `suspend` event (Linux laptops, Windows fast
 * startup) — the wall-clock jumps but the tracker's intent was paused.
 */
const MAX_TICK_DELTA_MS = 30_000;

/**
 * Keep the daily bucket history capped — the JSON file size scales linearly
 * with this. ~1 year is enough for a "Wrapped"-style year-end recap; older
 * days live on as part of `totals`.
 *
 * FUTURE: yearly recap reads byDay (defer until v2 once the year of data exists).
 */
const MAX_DAY_BUCKETS = 365;

/**
 * Drop the first 60s of a brand-new install. Onboarding bookkeeping (splash,
 * wizard, picking themes) shouldn't inflate the day-1 bucket.
 */
const FIRST_INSTALL_GRACE_MS = 60_000;

const EMPTY_DAY: AppStatsDayBucket = {
  appOpenSeconds: 0,
  appActiveSeconds: 0,
  animeWatchSeconds: 0,
  longestSessionSeconds: 0,
};

const EMPTY_TOTALS: AppStatsTotals = {
  appOpenSeconds: 0,
  appActiveSeconds: 0,
  animeWatchSeconds: 0,
  sessionCount: 0,
};

const EMPTY_STREAK: AppStatsStreak = { days: 0, lastDay: null };

function defaultSnapshot(): AppStatsSnapshot {
  return {
    version: 1,
    createdAt: null,
    totals: { ...EMPTY_TOTALS },
    byDay: {},
    currentStreak: { ...EMPTY_STREAK },
    longestStreak: { ...EMPTY_STREAK },
  };
}

/**
 * Local-date `YYYY-MM-DD` for the user's current timezone.
 *
 * `toLocaleDateString('sv-SE')` returns the ISO-8601 calendar shape (a Swedish
 * locale quirk we lean on intentionally) without the UTC offset Date#toISOString
 * would apply. DST days will produce a 23h or 25h bucket — fine, we never sum
 * `byDay` to derive `totals`.
 */
function localDayKey(now: Date = new Date()): string {
  return now.toLocaleDateString('sv-SE');
}

function clampTotals(totals: Partial<AppStatsTotals> | undefined): AppStatsTotals {
  const safe = (n: unknown): number =>
    typeof n === 'number' && Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
  return {
    appOpenSeconds: safe(totals?.appOpenSeconds),
    appActiveSeconds: safe(totals?.appActiveSeconds),
    animeWatchSeconds: safe(totals?.animeWatchSeconds),
    sessionCount: safe(totals?.sessionCount),
  };
}

function clampDay(day: Partial<AppStatsDayBucket> | undefined): AppStatsDayBucket {
  const safe = (n: unknown): number =>
    typeof n === 'number' && Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
  return {
    appOpenSeconds: safe(day?.appOpenSeconds),
    appActiveSeconds: safe(day?.appActiveSeconds),
    animeWatchSeconds: safe(day?.animeWatchSeconds),
    longestSessionSeconds: safe(day?.longestSessionSeconds),
  };
}

function clampStreak(streak: unknown): AppStatsStreak {
  if (!streak || typeof streak !== 'object') return { ...EMPTY_STREAK };
  const s = streak as Partial<AppStatsStreak>;
  const days = typeof s.days === 'number' && Number.isFinite(s.days) && s.days >= 0 ? s.days : 0;
  const lastDay = typeof s.lastDay === 'string' && s.lastDay.length > 0 ? s.lastDay : null;
  return { days, lastDay };
}

/**
 * Narrow whatever electron-store returns into a clean snapshot. Mirrors the
 * defensive shape of `discord-rpc-service.ts:37-58` — never throw, reset on a
 * malformed payload. Stays out of Zod to avoid pulling the validator into the
 * tracker hot path.
 */
function parseStoredSnapshot(stored: unknown): AppStatsSnapshot {
  if (!stored || typeof stored !== 'object') return defaultSnapshot();
  const raw = stored as Partial<AppStatsSnapshot>;
  if (raw.version !== 1) {
    logger.warn(`Resetting app-stats: unknown version ${String(raw.version)}`);
    return defaultSnapshot();
  }

  const byDayRaw = raw.byDay && typeof raw.byDay === 'object' ? raw.byDay : {};
  const byDay: Record<string, AppStatsDayBucket> = {};
  for (const [day, bucket] of Object.entries(byDayRaw)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) continue;
    byDay[day] = clampDay(bucket);
  }

  return {
    version: 1,
    createdAt: typeof raw.createdAt === 'string' && raw.createdAt.length > 0 ? raw.createdAt : null,
    totals: clampTotals(raw.totals),
    byDay,
    currentStreak: clampStreak(raw.currentStreak),
    longestStreak: clampStreak(raw.longestStreak),
  };
}

/**
 * Are two `YYYY-MM-DD` keys consecutive calendar days?
 *
 * We compare via `Date.parse` on midnight-UTC strings — the keys are already
 * local-date encoded so any TZ here is fine, we only care about the diff.
 */
function isNextDay(prev: string, curr: string): boolean {
  const prevMs = Date.parse(`${prev}T00:00:00Z`);
  const currMs = Date.parse(`${curr}T00:00:00Z`);
  if (!Number.isFinite(prevMs) || !Number.isFinite(currMs)) return false;
  const diff = currMs - prevMs;
  // Allow 23h–25h to absorb DST flips.
  return diff >= 23 * 3600 * 1000 && diff <= 25 * 3600 * 1000;
}

function trimByDay(byDay: Record<string, AppStatsDayBucket>): Record<string, AppStatsDayBucket> {
  const keys = Object.keys(byDay);
  if (keys.length <= MAX_DAY_BUCKETS) return byDay;
  keys.sort();
  const drop = keys.length - MAX_DAY_BUCKETS;
  const next: Record<string, AppStatsDayBucket> = {};
  for (let i = drop; i < keys.length; i++) {
    next[keys[i]] = byDay[keys[i]];
  }
  return next;
}

class AppStatsTracker {
  private snapshot: AppStatsSnapshot = defaultSnapshot();
  private mainWindow: BrowserWindow | null = null;

  private tickTimer: ReturnType<typeof setInterval> | null = null;
  private flushTimer: ReturnType<typeof setInterval> | null = null;

  private lastTickAtNs: bigint | null = null;
  private isPaused = false;
  private isWatchingAnime = false;

  /** True only on the first run of a fresh install — used by the grace window. */
  private installEpochAtNs: bigint | null = null;

  /**
   * Length of the *current* contiguous active stretch in seconds. When the
   * window blurs / idles / power-cuts, this resets to 0 and its peak is
   * captured into `longestSessionSeconds` for the day.
   */
  private currentSessionSeconds = 0;

  /**
   * Re-bind the tracker to a (possibly new) main window. Called on macOS
   * `activate` when the user reopens after closing the last window.
   */
  setMainWindow(mainWindow: BrowserWindow): void {
    this.mainWindow = mainWindow;
  }

  start(mainWindow: BrowserWindow): void {
    this.mainWindow = mainWindow;
    this.snapshot = parseStoredSnapshot(store.get(STORE_KEY));

    // Bookkeeping: this is a fresh install if we've never seen a session.
    if (this.snapshot.createdAt === null) {
      this.snapshot.createdAt = new Date().toISOString();
      this.installEpochAtNs = process.hrtime.bigint();
    }
    this.snapshot.totals.sessionCount += 1;

    this.lastTickAtNs = process.hrtime.bigint();
    this.persist();

    this.tickTimer = setInterval(() => this.tick(), TICK_INTERVAL_MS);
    if (typeof this.tickTimer === 'object' && 'unref' in this.tickTimer) {
      this.tickTimer.unref();
    }
    this.flushTimer = setInterval(() => this.persist(), FLUSH_INTERVAL_MS);
    if (typeof this.flushTimer === 'object' && 'unref' in this.flushTimer) {
      this.flushTimer.unref();
    }

    logger.info(
      `AppStatsTracker started (sessionCount=${this.snapshot.totals.sessionCount}, days=${
        Object.keys(this.snapshot.byDay).length
      })`
    );
  }

  stop(): void {
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    this.persist();
    this.mainWindow = null;
    this.lastTickAtNs = null;
    logger.info('AppStatsTracker stopped');
  }

  /** Power events — hard-cut the session, do not retroactively count the gap. */
  pause(reason: string): void {
    if (this.isPaused) return;
    this.isPaused = true;
    this.lastTickAtNs = null;
    this.currentSessionSeconds = 0;
    this.persist();
    logger.debug(`AppStatsTracker paused (${reason})`);
  }

  resume(reason: string): void {
    if (!this.isPaused) return;
    this.isPaused = false;
    this.lastTickAtNs = process.hrtime.bigint();
    logger.debug(`AppStatsTracker resumed (${reason})`);
  }

  /** Renderer signal: active browser tab is on a recognized anime site. */
  setWatchingAnime(watching: boolean): void {
    if (this.isWatchingAnime === watching) return;
    this.isWatchingAnime = watching;
    logger.debug(`isWatchingAnime → ${watching}`);
  }

  /** Snapshot for IPC. Returns a defensive deep copy of byDay buckets. */
  getSnapshot(): AppStatsSnapshot {
    const byDay: Record<string, AppStatsDayBucket> = {};
    for (const [key, bucket] of Object.entries(this.snapshot.byDay)) {
      byDay[key] = { ...bucket };
    }
    return {
      ...this.snapshot,
      totals: { ...this.snapshot.totals },
      byDay,
      currentStreak: { ...this.snapshot.currentStreak },
      longestStreak: { ...this.snapshot.longestStreak },
    };
  }

  reset(): AppStatsSnapshot {
    this.snapshot = defaultSnapshot();
    this.snapshot.createdAt = new Date().toISOString();
    // Reset is a user-driven wipe, not a fresh install — skip the onboarding
    // grace window so the next tick counts immediately.
    this.installEpochAtNs = null;
    this.currentSessionSeconds = 0;
    this.isWatchingAnime = false;
    this.lastTickAtNs = process.hrtime.bigint();
    this.persist();
    logger.info('AppStatsTracker reset');
    return this.getSnapshot();
  }

  /** Force a write to electron-store. Called on suspend / before-quit. */
  flush(): void {
    this.persist();
  }

  private tick(): void {
    if (this.isPaused) {
      this.lastTickAtNs = null;
      return;
    }

    const now = process.hrtime.bigint();
    const last = this.lastTickAtNs;
    this.lastTickAtNs = now;

    if (last === null) return;

    const deltaMs = Number((now - last) / 1_000_000n);
    if (deltaMs <= 0) return;
    if (deltaMs > MAX_TICK_DELTA_MS) {
      // Suspend that fired no event — backstop, see MAX_TICK_DELTA_MS comment.
      logger.warn(`Discarding oversized tick delta: ${deltaMs}ms`);
      this.currentSessionSeconds = 0;
      return;
    }

    // Onboarding grace: drop the first 60s of a fresh install.
    if (
      this.installEpochAtNs !== null &&
      Number((now - this.installEpochAtNs) / 1_000_000n) < FIRST_INSTALL_GRACE_MS
    ) {
      return;
    }
    this.installEpochAtNs = null;

    const win = this.mainWindow;
    if (!win || win.isDestroyed()) return;

    const isOpen = !win.isMinimized() && win.isVisible();
    if (!isOpen) {
      // Window hidden / minimized to tray. Reset session, no counters tick.
      this.currentSessionSeconds = 0;
      return;
    }

    const seconds = Math.round(deltaMs / 1000);
    if (seconds <= 0) return;

    const dayKey = localDayKey();
    const day = this.snapshot.byDay[dayKey] ?? { ...EMPTY_DAY };

    // 1. appOpenSeconds — window is on screen; counts even if blurred.
    day.appOpenSeconds += seconds;
    this.snapshot.totals.appOpenSeconds += seconds;

    // 2. appActiveSeconds — focused AND OS reports the user as active.
    const focused = win.isFocused();
    const idleState = powerMonitor.getSystemIdleState(60);
    const isActive = focused && idleState === 'active';

    if (isActive) {
      day.appActiveSeconds += seconds;
      this.snapshot.totals.appActiveSeconds += seconds;
      this.currentSessionSeconds += seconds;
      if (this.currentSessionSeconds > day.longestSessionSeconds) {
        day.longestSessionSeconds = this.currentSessionSeconds;
      }

      // 3. animeWatchSeconds — subset of active where anime detection hit.
      if (this.isWatchingAnime) {
        day.animeWatchSeconds += seconds;
        this.snapshot.totals.animeWatchSeconds += seconds;
      }
    } else {
      this.currentSessionSeconds = 0;
    }

    this.snapshot.byDay[dayKey] = day;
    this.snapshot.byDay = trimByDay(this.snapshot.byDay);
    this.bumpStreak(dayKey);
  }

  private bumpStreak(dayKey: string): void {
    const cur = this.snapshot.currentStreak;
    if (cur.lastDay === dayKey) return;
    if (cur.lastDay && isNextDay(cur.lastDay, dayKey)) {
      cur.days += 1;
    } else {
      cur.days = 1;
    }
    cur.lastDay = dayKey;
    if (cur.days > this.snapshot.longestStreak.days) {
      this.snapshot.longestStreak = { days: cur.days, lastDay: dayKey };
    }
  }

  private persist(): void {
    store.set(STORE_KEY, this.snapshot);
  }
}

export const appStatsTracker = new AppStatsTracker();

// FUTURE: multi-window — when ShiroAni grows past a single mainWindow, the
// tracker must aggregate `isFocused()` across all `BrowserWindow.getAllWindows()`
// (excluding the mascot overlay).
