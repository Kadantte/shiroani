/**
 * Tests for the playback-progress layer on LocalLibraryService.
 *
 * Uses a real in-memory sqlite via better-sqlite3, applying the full migration
 * suite. Mocks electron.app so the service can be instantiated outside of
 * Nest's DI container.
 */

jest.mock('electron', () => ({
  app: {
    getPath: () => '/tmp/shiroani-test-userdata',
  },
}));

import Database from 'better-sqlite3';
import { runMigrations } from '../../database/migrations';
import { LocalLibraryService } from '../local-library.service';

interface FakeDatabaseService {
  db: Database.Database;
}

function openTestDb(): Database.Database {
  const db = new Database(':memory:');
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  runMigrations(db);
  return db;
}

function seedLibrary(db: Database.Database): {
  rootId: number;
  seriesId: number;
  episodeIds: number[];
} {
  const rootResult = db.prepare('INSERT INTO library_roots (path) VALUES (?)').run('/library');
  const rootId = Number(rootResult.lastInsertRowid);

  const seriesResult = db
    .prepare('INSERT INTO local_series (root_id, folder_path, parsed_title) VALUES (?, ?, ?)')
    .run(rootId, '/library/frieren', 'Frieren');
  const seriesId = Number(seriesResult.lastInsertRowid);

  const episodeIds: number[] = [];
  for (let i = 1; i <= 3; i += 1) {
    const result = db
      .prepare(
        `INSERT INTO local_episodes (
           series_id, file_path, file_size, duration_seconds,
           parsed_episode_number, kind, mtime
         ) VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(seriesId, `/library/frieren/${i}.mkv`, 1024, 1400, i, 'episode', '2026-01-01');
    episodeIds.push(Number(result.lastInsertRowid));
  }
  return { rootId, seriesId, episodeIds };
}

function makeService(db: Database.Database): LocalLibraryService {
  const dbService = { db } as unknown as FakeDatabaseService;
  return new LocalLibraryService(dbService as unknown as never);
}

/**
 * Nudge a progress row's `updated_at` by a known offset. sqlite's
 * `datetime('now')` has second-level resolution, so rapid writes in tests would
 * land in the same timestamp and the "most recent" ordering becomes undefined.
 * We control time explicitly by overwriting the field post-hoc.
 */
function setProgressUpdatedAt(
  db: Database.Database,
  episodeId: number,
  isoTimestamp: string
): void {
  db.prepare('UPDATE playback_progress SET updated_at = ? WHERE episode_id = ?').run(
    isoTimestamp,
    episodeId
  );
}

describe('LocalLibraryService - playback progress', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = openTestDb();
  });

  afterEach(() => {
    db.close();
  });

  it('setEpisodeProgress flips completed when ratio crosses 90%', () => {
    const { episodeIds } = seedLibrary(db);
    const service = makeService(db);

    // 50% — not yet completed
    const halfway = service.setEpisodeProgress({
      episodeId: episodeIds[0],
      positionSeconds: 700,
      durationSeconds: 1400,
    });
    expect(halfway.completed).toBe(false);
    expect(halfway.watchCount).toBe(0);

    // 89% — still not completed
    const almost = service.setEpisodeProgress({
      episodeId: episodeIds[0],
      positionSeconds: 1245,
      durationSeconds: 1400,
    });
    expect(almost.completed).toBe(false);

    // 91% — crosses the threshold
    const done = service.setEpisodeProgress({
      episodeId: episodeIds[0],
      positionSeconds: 1274,
      durationSeconds: 1400,
    });
    expect(done.completed).toBe(true);
    expect(done.completedAt).not.toBeNull();
    // watchCount bumps on the transition only
    expect(done.watchCount).toBe(1);

    // Another update past the threshold — watchCount must NOT keep climbing.
    const again = service.setEpisodeProgress({
      episodeId: episodeIds[0],
      positionSeconds: 1399,
      durationSeconds: 1400,
    });
    expect(again.completed).toBe(true);
    expect(again.watchCount).toBe(1);
  });

  it('setEpisodeProgress throws for a missing episode', () => {
    seedLibrary(db);
    const service = makeService(db);
    expect(() =>
      service.setEpisodeProgress({
        episodeId: 999_999,
        positionSeconds: 10,
        durationSeconds: 100,
      })
    ).toThrow(/not found/);
  });

  it('markEpisodeWatched(true) creates a completed row, markEpisodeWatched(false) deletes it', () => {
    const { episodeIds } = seedLibrary(db);
    const service = makeService(db);

    const watched = service.markEpisodeWatched(episodeIds[0], true);
    expect(watched?.completed).toBe(true);
    expect(watched?.positionSeconds).toBe(1400);

    // Unwatched -> row gone.
    const unwatched = service.markEpisodeWatched(episodeIds[0], false);
    expect(unwatched).toBeNull();

    const row = service.getEpisodeProgress(episodeIds[0]);
    expect(row).toBeUndefined();
  });

  it('markSeriesWatched flips every episode in one shot', () => {
    const { seriesId, episodeIds } = seedLibrary(db);
    const service = makeService(db);

    const affected = service.markSeriesWatched(seriesId, true);
    expect(affected).toBe(episodeIds.length);

    for (const id of episodeIds) {
      const progress = service.getEpisodeProgress(id);
      expect(progress?.completed).toBe(true);
    }

    const wiped = service.markSeriesWatched(seriesId, false);
    expect(wiped).toBe(episodeIds.length);

    for (const id of episodeIds) {
      const progress = service.getEpisodeProgress(id);
      expect(progress).toBeUndefined();
    }
  });

  it('listContinueWatching filters completed + zero-position rows and orders by recency', () => {
    const { episodeIds } = seedLibrary(db);
    const service = makeService(db);

    // Ep1: 50% in progress
    service.setEpisodeProgress({
      episodeId: episodeIds[0],
      positionSeconds: 700,
      durationSeconds: 1400,
    });
    setProgressUpdatedAt(db, episodeIds[0], '2026-04-16 10:00:00');
    // Ep2: completed
    service.markEpisodeWatched(episodeIds[1], true);
    // Ep3: in-progress AFTER ep1 — should come first
    service.setEpisodeProgress({
      episodeId: episodeIds[2],
      positionSeconds: 100,
      durationSeconds: 1400,
    });
    setProgressUpdatedAt(db, episodeIds[2], '2026-04-16 10:05:00');

    const items = service.listContinueWatching();
    expect(items.map(i => i.episode.id)).toEqual([episodeIds[2], episodeIds[0]]);
    expect(items.find(i => i.progress.completed)).toBeUndefined();
  });

  it('getSeriesProgress aggregates counts and picks the freshest resume target', () => {
    const { seriesId, episodeIds } = seedLibrary(db);
    const service = makeService(db);

    // Ep0: completed
    service.markEpisodeWatched(episodeIds[0], true);
    // Ep1: in-progress, older
    service.setEpisodeProgress({
      episodeId: episodeIds[1],
      positionSeconds: 200,
      durationSeconds: 1400,
    });
    setProgressUpdatedAt(db, episodeIds[1], '2026-04-16 09:00:00');
    // Ep2: in-progress, newer
    service.setEpisodeProgress({
      episodeId: episodeIds[2],
      positionSeconds: 500,
      durationSeconds: 1400,
    });
    setProgressUpdatedAt(db, episodeIds[2], '2026-04-16 09:30:00');

    const summary = service.getSeriesProgress(seriesId);
    expect(summary.totalCount).toBe(3);
    expect(summary.watchedCount).toBe(1);
    // Resume should land on the most-recently-touched in-progress episode.
    expect(summary.resumeEpisodeId).toBe(episodeIds[2]);
    expect(summary.resumePositionSeconds).toBe(500);
  });

  it('getSeriesProgress returns a zero summary for a series with no episodes watched', () => {
    const { seriesId } = seedLibrary(db);
    const service = makeService(db);

    const summary = service.getSeriesProgress(seriesId);
    expect(summary.watchedCount).toBe(0);
    expect(summary.totalCount).toBe(3);
    expect(summary.resumeEpisodeId).toBeNull();
    expect(summary.lastWatchedAt).toBeNull();
  });
});
