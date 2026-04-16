/**
 * Batched better-sqlite3 persistence for scan results.
 *
 * Key invariants:
 *   - `local_series` upserts on (root_id, folder_path). We never overwrite
 *     user-set fields (`display_title`, `anilist_id`, `match_status`,
 *     `match_confidence`, `poster_path`, `banner_path`, `synopsis`,
 *     `genres_json`) — the scanner only owns `parsed_title`, `season`, `year`
 *     and `updated_at`.
 *   - `local_episodes` upserts on `file_path`. The scanner owns every column
 *     because there is no user-editable field on episodes in Phase 2.
 *   - After the full walk, any row referring to this root's series whose
 *     `file_path` isn't in the current walk is deleted, and any series that
 *     ends up with zero episodes is removed.
 *
 * Everything inside a single exclusive transaction per batch, so a partial
 * failure rolls back and leaves the previous state intact. `better-sqlite3`
 * transactions are synchronous.
 */

import type Database from 'better-sqlite3';
import type { LocalMatchStatus, LocalSeries } from '@shiroani/shared';
import type { SeriesGroup, ParsedEpisodeRecord } from './group';
import { type LocalSeriesRow, seriesRowToSeries } from '../../local-library.rows';

/** Chunk size for episode batches — keeps transactions fast on big libraries. */
export const DEFAULT_BATCH_SIZE = 200;

interface SeriesUpsertInput {
  rootId: number;
  folderPath: string;
  parsedTitle: string;
  season: number | null;
  year: number | null;
}

interface EpisodeUpsertInput {
  seriesId: number;
  filePath: string;
  fileSize: number;
  durationSeconds: number | null;
  width: number | null;
  height: number | null;
  videoCodec: string | null;
  audioTracksJson: string | null;
  subtitleTracksJson: string | null;
  parsedEpisodeNumber: number | null;
  parsedSeason: number | null;
  parsedTitle: string | null;
  releaseGroup: string | null;
  kind: string;
  mtime: string;
}

/**
 * Upsert a single `local_series` row. Returns the row id and the full series
 * shape (for broadcasting back to the renderer).
 *
 * Running the SELECT after the INSERT/UPDATE is cheap (indexed on
 * (root_id, folder_path)) and guarantees we get whatever the user may have
 * set on an existing row.
 */
export function upsertSeries(
  db: Database.Database,
  input: SeriesUpsertInput
): { id: number; series: LocalSeries; isNew: boolean } {
  const existing = db
    .prepare('SELECT * FROM local_series WHERE root_id = ? AND folder_path = ?')
    .get(input.rootId, input.folderPath) as LocalSeriesRow | undefined;

  if (existing) {
    db.prepare(
      `UPDATE local_series
       SET parsed_title = ?,
           season = ?,
           year = ?,
           updated_at = datetime('now')
       WHERE id = ?`
    ).run(input.parsedTitle, input.season, input.year, existing.id);

    const refreshed = db
      .prepare('SELECT * FROM local_series WHERE id = ?')
      .get(existing.id) as LocalSeriesRow;
    return { id: refreshed.id, series: seriesRowToSeries(refreshed), isNew: false };
  }

  const result = db
    .prepare(
      `INSERT INTO local_series (root_id, folder_path, parsed_title, season, year, match_status)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.rootId,
      input.folderPath,
      input.parsedTitle,
      input.season,
      input.year,
      'unmatched' satisfies LocalMatchStatus
    );

  const id = Number(result.lastInsertRowid);
  const row = db.prepare('SELECT * FROM local_series WHERE id = ?').get(id) as LocalSeriesRow;
  return { id, series: seriesRowToSeries(row), isNew: true };
}

/**
 * Upsert a batch of episodes inside a single transaction.
 *
 * better-sqlite3's transaction-wrapped prepared statement is the idiomatic
 * way to do batched writes — it's dramatically faster than N individual
 * transactions because it only fsyncs once.
 */
export function upsertEpisodesBatch(db: Database.Database, inputs: EpisodeUpsertInput[]): void {
  if (inputs.length === 0) return;

  const stmt = db.prepare(
    `INSERT INTO local_episodes (
       series_id, file_path, file_size, duration_seconds, width, height,
       video_codec, audio_tracks_json, subtitle_tracks_json,
       parsed_episode_number, parsed_season, parsed_title, release_group,
       kind, mtime
     )
     VALUES (
       @seriesId, @filePath, @fileSize, @durationSeconds, @width, @height,
       @videoCodec, @audioTracksJson, @subtitleTracksJson,
       @parsedEpisodeNumber, @parsedSeason, @parsedTitle, @releaseGroup,
       @kind, @mtime
     )
     ON CONFLICT(file_path) DO UPDATE SET
       series_id = excluded.series_id,
       file_size = excluded.file_size,
       duration_seconds = excluded.duration_seconds,
       width = excluded.width,
       height = excluded.height,
       video_codec = excluded.video_codec,
       audio_tracks_json = excluded.audio_tracks_json,
       subtitle_tracks_json = excluded.subtitle_tracks_json,
       parsed_episode_number = excluded.parsed_episode_number,
       parsed_season = excluded.parsed_season,
       parsed_title = excluded.parsed_title,
       release_group = excluded.release_group,
       kind = excluded.kind,
       mtime = excluded.mtime`
  );

  const runMany = db.transaction((rows: EpisodeUpsertInput[]) => {
    for (const row of rows) stmt.run(row);
  });

  runMany(inputs);
}

/**
 * Build an episode upsert payload from a {@link ParsedEpisodeRecord}.
 */
export function episodeRecordToUpsert(
  seriesId: number,
  record: ParsedEpisodeRecord
): EpisodeUpsertInput {
  const { file, parsed, probe } = record;
  return {
    seriesId,
    filePath: file.fullPath,
    fileSize: file.size,
    durationSeconds: probe?.durationSeconds ?? null,
    width: probe?.width ?? null,
    height: probe?.height ?? null,
    videoCodec: probe?.videoCodec ?? null,
    audioTracksJson: probe ? JSON.stringify(probe.audioTracks) : null,
    subtitleTracksJson: probe ? JSON.stringify(probe.subtitleTracks) : null,
    parsedEpisodeNumber: parsed.episode ?? null,
    parsedSeason: parsed.season ?? null,
    parsedTitle: parsed.title || null,
    releaseGroup: parsed.releaseGroup,
    kind: parsed.kind,
    mtime: file.mtime,
  };
}

export interface PersistGroupResult {
  series: LocalSeries;
  isNewSeries: boolean;
  episodesUpserted: number;
}

/**
 * Persist a single series group: upsert the series row, then upsert all of
 * its episodes in (possibly multiple) batched transactions.
 */
export function persistGroup(
  db: Database.Database,
  rootId: number,
  group: SeriesGroup,
  batchSize = DEFAULT_BATCH_SIZE
): PersistGroupResult {
  const {
    id: seriesId,
    series,
    isNew,
  } = upsertSeries(db, {
    rootId,
    folderPath: group.folderPath,
    parsedTitle: group.parsedTitle,
    season: group.season,
    year: group.year,
  });

  const payloads = group.episodes.map(r => episodeRecordToUpsert(seriesId, r));
  for (let i = 0; i < payloads.length; i += batchSize) {
    upsertEpisodesBatch(db, payloads.slice(i, i + batchSize));
  }

  return { series, isNewSeries: isNew, episodesUpserted: payloads.length };
}

export interface CleanupResult {
  filesRemoved: number;
  seriesRemoved: number;
  /** IDs of the series that were deleted during cleanup. */
  removedSeriesIds: number[];
}

/**
 * Remove episodes under this root that weren't seen in the current walk, and
 * any series that end up with zero episodes after that cleanup.
 *
 * Matching is case-sensitive on the file_path string because sqlite's default
 * collation is binary. Windows paths are normalized to the same casing by the
 * upstream walker so that's fine in practice.
 */
export function removeMissingFiles(
  db: Database.Database,
  rootId: number,
  currentFilePaths: Iterable<string>
): CleanupResult {
  const seenSet = new Set<string>(currentFilePaths);

  // Pull all episode file paths that belong to this root's series.
  const existingEpisodes = db
    .prepare(
      `SELECT e.id as id, e.file_path as file_path
       FROM local_episodes e
       INNER JOIN local_series s ON s.id = e.series_id
       WHERE s.root_id = ?`
    )
    .all(rootId) as { id: number; file_path: string }[];

  const toDelete = existingEpisodes.filter(e => !seenSet.has(e.file_path));
  let filesRemoved = 0;
  if (toDelete.length > 0) {
    const deleteStmt = db.prepare('DELETE FROM local_episodes WHERE id = ?');
    const runDelete = db.transaction((rows: { id: number }[]) => {
      for (const row of rows) deleteStmt.run(row.id);
    });
    runDelete(toDelete);
    filesRemoved = toDelete.length;
  }

  // Remove series with zero episodes under this root.
  const orphanSeries = db
    .prepare(
      `SELECT s.id as id FROM local_series s
       WHERE s.root_id = ?
         AND NOT EXISTS (SELECT 1 FROM local_episodes e WHERE e.series_id = s.id)`
    )
    .all(rootId) as { id: number }[];

  let seriesRemoved = 0;
  const removedSeriesIds: number[] = [];
  if (orphanSeries.length > 0) {
    const deleteStmt = db.prepare('DELETE FROM local_series WHERE id = ?');
    const runDelete = db.transaction((rows: { id: number }[]) => {
      for (const row of rows) deleteStmt.run(row.id);
    });
    runDelete(orphanSeries);
    seriesRemoved = orphanSeries.length;
    for (const row of orphanSeries) removedSeriesIds.push(row.id);
  }

  return { filesRemoved, seriesRemoved, removedSeriesIds };
}
