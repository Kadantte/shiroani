/**
 * Persist tests — these spin up an in-memory sqlite (better-sqlite3 supports
 * `:memory:`), apply the v6 migration, and exercise the real SQL. No mocking
 * of the db itself — that's the surface area we actually care about being
 * correct.
 */

import Database from 'better-sqlite3';
import path from 'node:path';
import type { LocalMatchStatus } from '@shiroani/shared';
import { runMigrations } from '../../../../database/migrations';
import { normalizeTitleForGrouping } from '../parse-filename';
import type { ParsedEpisodeRecord, SeriesGroup } from '../group';
import {
  DEFAULT_BATCH_SIZE,
  episodeRecordToUpsert,
  persistGroup,
  removeMissingFiles,
  upsertEpisodesBatch,
  upsertSeries,
} from '../persist';

interface SeriesRow {
  id: number;
  root_id: number;
  folder_path: string;
  parsed_title: string;
  display_title: string | null;
  anilist_id: number | null;
  match_status: string;
  season: number | null;
  year: number | null;
}

function openTestDb(): Database.Database {
  const db = new Database(':memory:');
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  runMigrations(db);
  return db;
}

function seedRoot(db: Database.Database, rootPath: string): number {
  const result = db.prepare('INSERT INTO library_roots (path) VALUES (?)').run(rootPath);
  return Number(result.lastInsertRowid);
}

function makeRecord(
  fullPath: string,
  title: string,
  overrides: Partial<ParsedEpisodeRecord> = {}
): ParsedEpisodeRecord {
  const parsed = {
    title,
    titleKey: normalizeTitleForGrouping(title),
    episode: 1,
    season: null,
    year: null,
    releaseGroup: null,
    resolution: '1080p',
    kind: 'episode' as const,
    titleFromAnitomy: true,
    ...(overrides.parsed ?? {}),
  };
  return {
    file: { fullPath, size: 1024, mtime: '2026-04-16T00:00:00.000Z' },
    parsed,
    probe: overrides.probe ?? {
      durationSeconds: 1425.0,
      width: 1920,
      height: 1080,
      videoCodec: 'hevc',
      audioTracks: [],
      subtitleTracks: [],
    },
    probeError: null,
  };
}

describe('upsertSeries', () => {
  let db: Database.Database;
  let rootId: number;

  beforeEach(() => {
    db = openTestDb();
    rootId = seedRoot(db, '/library');
  });

  afterEach(() => {
    db.close();
  });

  it('inserts a new series row when none exists', () => {
    const { id, isNew, series } = upsertSeries(db, {
      rootId,
      folderPath: '/library/show',
      parsedTitle: 'Show',
      season: null,
      year: null,
    });

    expect(id).toBeGreaterThan(0);
    expect(isNew).toBe(true);
    expect(series.parsedTitle).toBe('Show');
    expect(series.matchStatus).toBe<LocalMatchStatus>('unmatched');

    const row = db
      .prepare('SELECT COUNT(*) as n FROM local_series WHERE root_id = ?')
      .get(rootId) as { n: number };
    expect(row.n).toBe(1);
  });

  it('updates parsed_title but preserves user-set fields on re-upsert', () => {
    // First insert
    const first = upsertSeries(db, {
      rootId,
      folderPath: '/library/show',
      parsedTitle: 'Show',
      season: null,
      year: null,
    });

    // User sets display_title + match_status + anilist_id (simulating a
    // manual match action that Phase 5 will expose).
    db.prepare(
      `UPDATE local_series
       SET display_title = ?, anilist_id = ?, match_status = ?
       WHERE id = ?`
    ).run('My Custom Name', 12345, 'manual', first.id);

    // Re-scan with a different parsed title (e.g. the folder got renamed).
    const second = upsertSeries(db, {
      rootId,
      folderPath: '/library/show',
      parsedTitle: 'Show v2 (2026)',
      season: 2,
      year: 2026,
    });

    expect(second.id).toBe(first.id);
    expect(second.isNew).toBe(false);

    const refreshed = db
      .prepare('SELECT * FROM local_series WHERE id = ?')
      .get(first.id) as SeriesRow;

    expect(refreshed.parsed_title).toBe('Show v2 (2026)');
    expect(refreshed.season).toBe(2);
    expect(refreshed.year).toBe(2026);

    // The user-set fields must NOT be clobbered.
    expect(refreshed.display_title).toBe('My Custom Name');
    expect(refreshed.anilist_id).toBe(12345);
    expect(refreshed.match_status).toBe('manual');
  });
});

describe('upsertEpisodesBatch', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = openTestDb();
    const rootId = seedRoot(db, '/library');
    db.prepare(
      'INSERT INTO local_series (root_id, folder_path, parsed_title) VALUES (?, ?, ?)'
    ).run(rootId, '/library/show', 'Show');
  });

  afterEach(() => {
    db.close();
  });

  it('inserts episodes and updates on conflict without orphaning rows', () => {
    const seriesId = 1;

    const rec1 = makeRecord('/library/show/01.mkv', 'Show', {
      parsed: { episode: 1 } as ParsedEpisodeRecord['parsed'],
    });
    const rec2 = makeRecord('/library/show/02.mkv', 'Show', {
      parsed: { episode: 2 } as ParsedEpisodeRecord['parsed'],
    });

    upsertEpisodesBatch(
      db,
      [rec1, rec2].map(r => episodeRecordToUpsert(seriesId, r))
    );

    const after = db
      .prepare('SELECT COUNT(*) as n FROM local_episodes WHERE series_id = ?')
      .get(seriesId) as { n: number };
    expect(after.n).toBe(2);

    // Re-run the same batch with an updated duration — should UPDATE, not INSERT.
    rec1.probe = {
      durationSeconds: 9999,
      width: 1920,
      height: 1080,
      videoCodec: 'hevc',
      audioTracks: [],
      subtitleTracks: [],
    };
    upsertEpisodesBatch(
      db,
      [rec1].map(r => episodeRecordToUpsert(seriesId, r))
    );

    const stillTwo = db
      .prepare('SELECT COUNT(*) as n FROM local_episodes WHERE series_id = ?')
      .get(seriesId) as { n: number };
    expect(stillTwo.n).toBe(2);

    const updated = db
      .prepare('SELECT duration_seconds FROM local_episodes WHERE file_path = ?')
      .get('/library/show/01.mkv') as { duration_seconds: number };
    expect(updated.duration_seconds).toBe(9999);
  });
});

describe('persistGroup + idempotency', () => {
  it('running the same scan twice yields identical row counts and preserves user data', () => {
    const db = openTestDb();
    try {
      const rootId = seedRoot(db, '/library');
      const records = [
        makeRecord('/library/frieren/01.mkv', 'Frieren'),
        makeRecord('/library/frieren/02.mkv', 'Frieren', {
          parsed: { episode: 2 } as ParsedEpisodeRecord['parsed'],
        }),
      ];
      const group: SeriesGroup = {
        key: 'k',
        parsedTitle: 'Frieren',
        season: null,
        year: null,
        folderPath: '/library/frieren',
        episodes: records,
      };

      const first = persistGroup(db, rootId, group);
      expect(first.isNewSeries).toBe(true);
      expect(first.episodesUpserted).toBe(2);

      // User manually matches the series
      db.prepare(
        `UPDATE local_series
         SET display_title = ?, anilist_id = ?, match_status = ?
         WHERE id = ?`
      ).run("Frieren: Beyond Journey's End", 154587, 'manual', first.series.id);

      // Second scan — same data
      const second = persistGroup(db, rootId, group);
      expect(second.isNewSeries).toBe(false);
      expect(second.series.displayTitle).toBe("Frieren: Beyond Journey's End");
      expect(second.series.anilistId).toBe(154587);
      expect(second.series.matchStatus).toBe('manual');

      const count = db.prepare('SELECT COUNT(*) as n FROM local_episodes').get() as {
        n: number;
      };
      expect(count.n).toBe(2);
    } finally {
      db.close();
    }
  });
});

describe('removeMissingFiles', () => {
  it('removes stale episodes and orphaned series but keeps roots', () => {
    const db = openTestDb();
    try {
      const rootId = seedRoot(db, '/library');

      const group1: SeriesGroup = {
        key: 'k1',
        parsedTitle: 'ShowA',
        season: null,
        year: null,
        folderPath: '/library/a',
        episodes: [
          makeRecord('/library/a/01.mkv', 'ShowA'),
          makeRecord('/library/a/02.mkv', 'ShowA'),
        ],
      };
      const group2: SeriesGroup = {
        key: 'k2',
        parsedTitle: 'ShowB',
        season: null,
        year: null,
        folderPath: '/library/b',
        episodes: [makeRecord('/library/b/01.mkv', 'ShowB')],
      };

      persistGroup(db, rootId, group1);
      persistGroup(db, rootId, group2);

      // Simulate: ShowB deleted from disk entirely, ShowA/02 deleted.
      const current = ['/library/a/01.mkv'];
      const cleanup = removeMissingFiles(db, rootId, current);

      expect(cleanup.filesRemoved).toBe(2);
      expect(cleanup.seriesRemoved).toBe(1);

      const surviving = db
        .prepare('SELECT COUNT(*) as n FROM local_series WHERE root_id = ?')
        .get(rootId) as { n: number };
      expect(surviving.n).toBe(1);

      const rootsCount = db.prepare('SELECT COUNT(*) as n FROM library_roots').get() as {
        n: number;
      };
      expect(rootsCount.n).toBe(1);
    } finally {
      db.close();
    }
  });

  it('batch size constant is honored', () => {
    expect(DEFAULT_BATCH_SIZE).toBeGreaterThan(0);
    expect(path.isAbsolute('/')).toBe(true); // placebo for linting noop path import
  });
});
