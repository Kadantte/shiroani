jest.mock('electron');
jest.mock('../../logging/logger', () => ({
  createMainLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}));

const mockStore = {
  get: jest.fn(),
  set: jest.fn(),
  delete: jest.fn(),
};
jest.mock('../../store', () => ({ store: mockStore }));

import type { BrowserWindow } from 'electron';
import { powerMonitor } from 'electron';
import { appStatsTracker } from '../app-stats-tracker';

interface FakeWin {
  isDestroyed: jest.Mock<boolean, []>;
  isMinimized: jest.Mock<boolean, []>;
  isVisible: jest.Mock<boolean, []>;
  isFocused: jest.Mock<boolean, []>;
}

function createFakeWindow(): FakeWin {
  return {
    isDestroyed: jest.fn(() => false),
    isMinimized: jest.fn(() => false),
    isVisible: jest.fn(() => true),
    isFocused: jest.fn(() => true),
  };
}

/**
 * Drive `process.hrtime.bigint()` from a JS number we control. Each call
 * returns the cursor; tests advance by writing to the controller.
 */
function installFakeHrtime() {
  const controller = { ns: 1_000_000_000n }; // start at 1s — non-zero
  const original = process.hrtime.bigint.bind(process.hrtime);
  process.hrtime.bigint = jest.fn(() => controller.ns) as typeof process.hrtime.bigint;
  return {
    advanceMs(ms: number) {
      controller.ns += BigInt(ms) * 1_000_000n;
    },
    advanceSec(sec: number) {
      controller.ns += BigInt(sec) * 1_000_000_000n;
    },
    restore() {
      process.hrtime.bigint = original;
    },
  };
}

/** Force a tick by reaching into the private interval — call directly. */
function pulse(tracker: typeof appStatsTracker) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (tracker as any).tick();
}

describe('AppStatsTracker', () => {
  let win: FakeWin;
  let clock: ReturnType<typeof installFakeHrtime>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const idleStateMock = powerMonitor.getSystemIdleState as jest.Mock<any, any>;

  beforeEach(() => {
    jest.useFakeTimers();
    Object.values(mockStore).forEach(fn => (fn as jest.Mock).mockReset());
    mockStore.get.mockReturnValue(undefined);
    idleStateMock.mockReset();
    idleStateMock.mockReturnValue('active');
    clock = installFakeHrtime();
    win = createFakeWindow();
    appStatsTracker.start(win as unknown as BrowserWindow);
    // The grace period drops the first 60s after a fresh install. Skip past it.
    clock.advanceMs(61_000);
    pulse(appStatsTracker);
    // Reset any per-counter side-effects from the grace tick (none expected,
    // but the mock store may have been touched — tests assert from a clean
    // snapshot).
    appStatsTracker.reset();
    mockStore.set.mockClear();
  });

  afterEach(() => {
    appStatsTracker.stop();
    clock.restore();
    jest.useRealTimers();
  });

  it('counts a focused + visible + active window into all three counters when watching anime', () => {
    appStatsTracker.setWatchingAnime(true);
    clock.advanceSec(10);
    pulse(appStatsTracker);
    const snap = appStatsTracker.getSnapshot();
    expect(snap.totals.appOpenSeconds).toBe(10);
    expect(snap.totals.appActiveSeconds).toBe(10);
    expect(snap.totals.animeWatchSeconds).toBe(10);
  });

  it('counts open but not active when blurred', () => {
    win.isFocused.mockReturnValue(false);
    appStatsTracker.setWatchingAnime(true);
    clock.advanceSec(10);
    pulse(appStatsTracker);
    const snap = appStatsTracker.getSnapshot();
    expect(snap.totals.appOpenSeconds).toBe(10);
    expect(snap.totals.appActiveSeconds).toBe(0);
    expect(snap.totals.animeWatchSeconds).toBe(0);
  });

  it('skips all counters when system reports idle', () => {
    idleStateMock.mockReturnValue('idle');
    appStatsTracker.setWatchingAnime(true);
    clock.advanceSec(10);
    pulse(appStatsTracker);
    const snap = appStatsTracker.getSnapshot();
    expect(snap.totals.appOpenSeconds).toBe(10); // window is open
    expect(snap.totals.appActiveSeconds).toBe(0); // but not active
    expect(snap.totals.animeWatchSeconds).toBe(0);
  });

  it('skips counters entirely while minimized', () => {
    win.isMinimized.mockReturnValue(true);
    appStatsTracker.setWatchingAnime(true);
    clock.advanceSec(10);
    pulse(appStatsTracker);
    const snap = appStatsTracker.getSnapshot();
    expect(snap.totals.appOpenSeconds).toBe(0);
    expect(snap.totals.appActiveSeconds).toBe(0);
    expect(snap.totals.animeWatchSeconds).toBe(0);
  });

  it('does not count animeWatchSeconds without setWatchingAnime', () => {
    clock.advanceSec(10);
    pulse(appStatsTracker);
    const snap = appStatsTracker.getSnapshot();
    expect(snap.totals.animeWatchSeconds).toBe(0);
    expect(snap.totals.appActiveSeconds).toBe(10);
  });

  it('hard-cuts the gap on pause/resume — never retroactively counts', () => {
    clock.advanceSec(10);
    pulse(appStatsTracker);

    appStatsTracker.pause('test');
    clock.advanceSec(120); // simulate a 2-minute lock-screen gap
    appStatsTracker.resume('test');
    clock.advanceSec(10);
    pulse(appStatsTracker);

    const snap = appStatsTracker.getSnapshot();
    expect(snap.totals.appOpenSeconds).toBe(20);
    expect(snap.totals.appActiveSeconds).toBe(20);
  });

  it('rejects ticks with a delta over the 30s ceiling (suspend backstop)', () => {
    clock.advanceSec(120); // simulate a no-event suspend
    pulse(appStatsTracker);
    const snap = appStatsTracker.getSnapshot();
    expect(snap.totals.appOpenSeconds).toBe(0);
    expect(snap.totals.appActiveSeconds).toBe(0);
  });

  it('reset() zeroes totals and byDay', () => {
    appStatsTracker.setWatchingAnime(true);
    clock.advanceSec(10);
    pulse(appStatsTracker);
    expect(appStatsTracker.getSnapshot().totals.appOpenSeconds).toBe(10);

    const fresh = appStatsTracker.reset();
    expect(fresh.totals.appOpenSeconds).toBe(0);
    expect(fresh.totals.appActiveSeconds).toBe(0);
    expect(fresh.totals.animeWatchSeconds).toBe(0);
    expect(Object.keys(fresh.byDay)).toHaveLength(0);
    expect(fresh.createdAt).not.toBeNull();
  });

  it('persists the snapshot to electron-store via store.set on flush', () => {
    clock.advanceSec(10);
    pulse(appStatsTracker);
    mockStore.set.mockClear();

    appStatsTracker.flush();
    expect(mockStore.set).toHaveBeenCalledWith(
      'app-stats',
      expect.objectContaining({ version: 1 })
    );
  });

  it('tracks longestSessionSeconds across consecutive active ticks', () => {
    clock.advanceSec(10);
    pulse(appStatsTracker);
    clock.advanceSec(10);
    pulse(appStatsTracker);
    clock.advanceSec(10);
    pulse(appStatsTracker);

    const dayKey = new Date().toLocaleDateString('sv-SE');
    const snap = appStatsTracker.getSnapshot();
    expect(snap.byDay[dayKey].longestSessionSeconds).toBe(30);
  });

  it('resets the active session on blur, then starts a new one on refocus', () => {
    clock.advanceSec(10);
    pulse(appStatsTracker);
    clock.advanceSec(10);
    pulse(appStatsTracker);

    win.isFocused.mockReturnValue(false);
    clock.advanceSec(10);
    pulse(appStatsTracker);

    win.isFocused.mockReturnValue(true);
    clock.advanceSec(10);
    pulse(appStatsTracker);

    const dayKey = new Date().toLocaleDateString('sv-SE');
    const snap = appStatsTracker.getSnapshot();
    // Two 10s active stretches before/after blur, plus 10s second-stretch =
    // longest session should be 20s, not 30s.
    expect(snap.byDay[dayKey].longestSessionSeconds).toBe(20);
    expect(snap.totals.appActiveSeconds).toBe(30);
  });

  it('parses a malformed stored snapshot back to defaults without throwing', () => {
    appStatsTracker.stop();
    mockStore.get.mockReturnValue({ version: 99, garbage: true });
    appStatsTracker.start(win as unknown as BrowserWindow);
    const snap = appStatsTracker.getSnapshot();
    expect(snap.version).toBe(1);
    expect(snap.totals.appOpenSeconds).toBe(0);
  });

  it('preserves and increments persisted totals across restarts', () => {
    appStatsTracker.stop();
    mockStore.get.mockReturnValue({
      version: 1,
      createdAt: '2026-01-01T00:00:00.000Z',
      totals: {
        appOpenSeconds: 100,
        appActiveSeconds: 80,
        animeWatchSeconds: 40,
        sessionCount: 5,
      },
      byDay: {},
      currentStreak: { days: 0, lastDay: null },
      longestStreak: { days: 0, lastDay: null },
    });
    clock = installFakeHrtime();
    appStatsTracker.start(win as unknown as BrowserWindow);
    clock.advanceMs(61_000);
    pulse(appStatsTracker);
    appStatsTracker.setWatchingAnime(true);

    clock.advanceSec(10);
    pulse(appStatsTracker);

    const snap = appStatsTracker.getSnapshot();
    expect(snap.totals.appOpenSeconds).toBe(110);
    expect(snap.totals.appActiveSeconds).toBe(90);
    expect(snap.totals.animeWatchSeconds).toBe(50);
    // sessionCount bumped on start.
    expect(snap.totals.sessionCount).toBe(6);
  });
});
