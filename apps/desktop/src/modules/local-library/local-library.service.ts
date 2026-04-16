import { Injectable } from '@nestjs/common';
import {
  createLogger,
  type ContinueWatchingItem,
  type LibraryRoot,
  type LocalEpisode,
  type LocalSeries,
  type PlaybackProgress,
  type PosterKind,
  type SeriesProgressSummary,
} from '@shiroani/shared';
import { DatabaseService } from '../database';
import {
  removePoster as removePosterFromDisk,
  savePosterFromLocalFile,
  savePosterFromUrl,
} from './poster-cache';
import {
  type LibraryRootRow,
  type LocalEpisodeRow,
  type LocalSeriesRow,
  episodeRowToEpisode,
  rootRowToRoot,
  seriesRowToSeries,
} from './local-library.rows';

const logger = createLogger('LocalLibraryService');

// Re-export row helpers for backwards compatibility with existing imports.
export {
  type LibraryRootRow,
  type LocalEpisodeRow,
  type LocalSeriesRow,
  episodeRowToEpisode,
  rootRowToRoot,
  seriesRowToSeries,
};

/** Raw row shape for the playback_progress table. */
interface PlaybackProgressRow {
  episode_id: number;
  position_seconds: number;
  duration_seconds: number;
  completed: number;
  completed_at: string | null;
  watch_count: number;
  updated_at: string;
}

function progressRowToProgress(row: PlaybackProgressRow): PlaybackProgress {
  return {
    episodeId: row.episode_id,
    positionSeconds: row.position_seconds,
    durationSeconds: row.duration_seconds,
    completed: row.completed === 1,
    completedAt: row.completed_at,
    watchCount: row.watch_count,
    updatedAt: row.updated_at,
  };
}

/** Fraction of the episode that counts as "watched". */
const COMPLETED_THRESHOLD = 0.9;

@Injectable()
export class LocalLibraryService {
  constructor(private readonly databaseService: DatabaseService) {
    logger.info('LocalLibraryService initialized');
  }

  /** List every registered library root. */
  listRoots(): LibraryRoot[] {
    const db = this.databaseService.db;
    const rows = db
      .prepare('SELECT * FROM library_roots ORDER BY added_at ASC')
      .all() as LibraryRootRow[];
    return rows.map(rootRowToRoot);
  }

  /** Fetch a single root by id. */
  getRootById(id: number): LibraryRoot | undefined {
    const db = this.databaseService.db;
    const row = db.prepare('SELECT * FROM library_roots WHERE id = ?').get(id) as
      | LibraryRootRow
      | undefined;
    return row ? rootRowToRoot(row) : undefined;
  }

  /** Fetch a single root by path. */
  getRootByPath(path: string): LibraryRoot | undefined {
    const db = this.databaseService.db;
    const row = db.prepare('SELECT * FROM library_roots WHERE path = ?').get(path) as
      | LibraryRootRow
      | undefined;
    return row ? rootRowToRoot(row) : undefined;
  }

  /**
   * Register a new library root. If a root with the same path already exists,
   * the existing row is returned — adding the same folder twice is a no-op.
   */
  addRoot(absPath: string, label?: string): LibraryRoot {
    const existing = this.getRootByPath(absPath);
    if (existing) {
      logger.info(`Root already registered at ${absPath} (id=${existing.id})`);
      return existing;
    }

    const db = this.databaseService.db;
    const result = db
      .prepare('INSERT INTO library_roots (path, label) VALUES (?, ?)')
      .run(absPath, label ?? null);

    const root = this.getRootById(Number(result.lastInsertRowid));
    if (!root) {
      throw new Error('Failed to load root after insert');
    }
    logger.info(`Added library root id=${root.id} path=${root.path}`);
    return root;
  }

  /** Remove a library root. Cascades to series/episodes/progress. */
  removeRoot(id: number): boolean {
    const db = this.databaseService.db;
    const result = db.prepare('DELETE FROM library_roots WHERE id = ?').run(id);
    const deleted = result.changes > 0;
    if (deleted) {
      logger.info(`Removed library root id=${id}`);
    }
    return deleted;
  }

  /**
   * List local series for a given root (or all roots when `rootId` is omitted).
   * Ordered by `updated_at DESC` so freshly-scanned/updated series surface
   * first in the grid.
   */
  listSeriesByRoot(rootId?: number): LocalSeries[] {
    const db = this.databaseService.db;

    if (rootId !== undefined) {
      const rows = db
        .prepare('SELECT * FROM local_series WHERE root_id = ? ORDER BY updated_at DESC')
        .all(rootId) as LocalSeriesRow[];
      return rows.map(seriesRowToSeries);
    }

    const rows = db
      .prepare('SELECT * FROM local_series ORDER BY updated_at DESC')
      .all() as LocalSeriesRow[];
    return rows.map(seriesRowToSeries);
  }

  /** Convenience alias for cross-root views. */
  listAllSeries(): LocalSeries[] {
    return this.listSeriesByRoot();
  }

  /** Fetch a single series by id. */
  getSeriesById(id: number): LocalSeries | undefined {
    const db = this.databaseService.db;
    const row = db.prepare('SELECT * FROM local_series WHERE id = ?').get(id) as
      | LocalSeriesRow
      | undefined;
    return row ? seriesRowToSeries(row) : undefined;
  }

  /** List episodes for a series, ordered by (season, episode number). */
  listEpisodesBySeries(seriesId: number): LocalEpisode[] {
    const db = this.databaseService.db;
    const rows = db
      .prepare(
        `SELECT * FROM local_episodes
         WHERE series_id = ?
         ORDER BY parsed_season ASC NULLS LAST,
                  parsed_episode_number ASC NULLS LAST,
                  file_path ASC`
      )
      .all(seriesId) as LocalEpisodeRow[];
    return rows.map(episodeRowToEpisode);
  }

  /** Fetch a single episode by id. */
  getEpisodeById(id: number): LocalEpisode | undefined {
    const db = this.databaseService.db;
    const row = db.prepare('SELECT * FROM local_episodes WHERE id = ?').get(id) as
      | LocalEpisodeRow
      | undefined;
    return row ? episodeRowToEpisode(row) : undefined;
  }

  // ==========================================================================
  // Playback progress
  // ==========================================================================

  /** Fetch the playback progress row for a single episode (or undefined). */
  getEpisodeProgress(episodeId: number): PlaybackProgress | undefined {
    const db = this.databaseService.db;
    const row = db
      .prepare('SELECT * FROM playback_progress WHERE episode_id = ?')
      .get(episodeId) as PlaybackProgressRow | undefined;
    return row ? progressRowToProgress(row) : undefined;
  }

  /**
   * Upsert a playback position. When the ratio of position to duration crosses
   * {@link COMPLETED_THRESHOLD} the row is flipped to `completed = 1` and
   * `completed_at` is stamped. Going from not-completed to completed also
   * increments `watch_count` so the user can see rewatches.
   */
  setEpisodeProgress(input: {
    episodeId: number;
    positionSeconds: number;
    durationSeconds: number;
  }): PlaybackProgress {
    const db = this.databaseService.db;
    const episode = this.getEpisodeById(input.episodeId);
    if (!episode) {
      throw new Error(`Episode ${input.episodeId} not found`);
    }

    const position = Math.max(0, input.positionSeconds);
    const duration = Math.max(0, input.durationSeconds);
    const ratio = duration > 0 ? position / duration : 0;
    const shouldComplete = duration > 0 && ratio >= COMPLETED_THRESHOLD;

    const existing = this.getEpisodeProgress(input.episodeId);
    const wasCompleted = existing?.completed ?? false;
    const nowCompleted = shouldComplete;
    // Only bump watch_count on the transition from not-completed -> completed.
    // Repeated position updates past 90% won't inflate the counter.
    const incrementWatch = !wasCompleted && nowCompleted;

    db.prepare(
      `INSERT INTO playback_progress (
         episode_id, position_seconds, duration_seconds, completed, completed_at,
         watch_count, updated_at
       )
       VALUES (
         @episodeId, @position, @duration, @completed,
         CASE WHEN @completed = 1 THEN datetime('now') ELSE NULL END,
         @watchCount, datetime('now')
       )
       ON CONFLICT(episode_id) DO UPDATE SET
         position_seconds = excluded.position_seconds,
         duration_seconds = excluded.duration_seconds,
         completed = excluded.completed,
         completed_at = CASE
           WHEN excluded.completed = 1 AND playback_progress.completed = 0 THEN excluded.completed_at
           WHEN excluded.completed = 1 THEN playback_progress.completed_at
           ELSE NULL
         END,
         watch_count = playback_progress.watch_count + @watchIncrement,
         updated_at = datetime('now')`
    ).run({
      episodeId: input.episodeId,
      position,
      duration,
      completed: nowCompleted ? 1 : 0,
      watchCount: incrementWatch ? 1 : 0,
      watchIncrement: incrementWatch ? 1 : 0,
    });

    // Touch the series updated_at so "Recently watched" sort works.
    db.prepare(`UPDATE local_series SET updated_at = datetime('now') WHERE id = ?`).run(
      episode.seriesId
    );

    const updated = this.getEpisodeProgress(input.episodeId);
    if (!updated) {
      throw new Error(`Failed to read back progress for episode ${input.episodeId}`);
    }
    return updated;
  }

  /**
   * Flip the watched state for a single episode. Watched stamps a completed
   * progress row with `position_seconds = duration_seconds`. Unwatched deletes
   * the row outright so the user gets a clean "never watched" state back.
   *
   * Returns the resulting progress row (null when the episode was unwatched).
   */
  markEpisodeWatched(episodeId: number, watched: boolean): PlaybackProgress | null {
    const db = this.databaseService.db;
    const episode = this.getEpisodeById(episodeId);
    if (!episode) {
      throw new Error(`Episode ${episodeId} not found`);
    }

    if (!watched) {
      db.prepare('DELETE FROM playback_progress WHERE episode_id = ?').run(episodeId);
      db.prepare(`UPDATE local_series SET updated_at = datetime('now') WHERE id = ?`).run(
        episode.seriesId
      );
      return null;
    }

    // Use duration from the probed file when available, else fall back to 1s
    // so the 90% math still treats the episode as completed.
    const duration = episode.durationSeconds ?? 1;
    return this.setEpisodeProgress({
      episodeId,
      positionSeconds: duration,
      durationSeconds: duration,
    });
  }

  /**
   * Bulk mark every episode of a series as watched or unwatched. Returns the
   * number of rows affected so the UI can report a snackbar-style confirmation.
   */
  markSeriesWatched(seriesId: number, watched: boolean): number {
    const db = this.databaseService.db;
    const series = this.getSeriesById(seriesId);
    if (!series) {
      throw new Error(`Series ${seriesId} not found`);
    }

    const episodes = this.listEpisodesBySeries(seriesId);
    if (episodes.length === 0) return 0;

    if (!watched) {
      const run = db.transaction((ids: number[]) => {
        const stmt = db.prepare('DELETE FROM playback_progress WHERE episode_id = ?');
        for (const id of ids) stmt.run(id);
      });
      run(episodes.map(e => e.id));
      db.prepare(`UPDATE local_series SET updated_at = datetime('now') WHERE id = ?`).run(seriesId);
      return episodes.length;
    }

    const run = db.transaction((rows: LocalEpisode[]) => {
      for (const ep of rows) {
        this.markEpisodeWatched(ep.id, true);
      }
    });
    run(episodes);
    return episodes.length;
  }

  /**
   * Aggregate progress for a series: watched/total counts, last-watched date,
   * and the resume target (most recently touched in-progress episode at
   * < 90% completion).
   */
  getSeriesProgress(seriesId: number): SeriesProgressSummary {
    const db = this.databaseService.db;

    const counts = db
      .prepare(
        `SELECT
           COUNT(e.id) AS total_count,
           COALESCE(SUM(CASE WHEN p.completed = 1 THEN 1 ELSE 0 END), 0) AS watched_count,
           MAX(p.updated_at) AS last_watched_at
         FROM local_episodes e
         LEFT JOIN playback_progress p ON p.episode_id = e.id
         WHERE e.series_id = ?`
      )
      .get(seriesId) as {
      total_count: number;
      watched_count: number;
      last_watched_at: string | null;
    };

    // Resume target: most recent in-progress episode (not completed, has position).
    const resume = db
      .prepare(
        `SELECT p.episode_id, p.position_seconds, p.duration_seconds
         FROM playback_progress p
         INNER JOIN local_episodes e ON e.id = p.episode_id
         WHERE e.series_id = ?
           AND p.completed = 0
           AND p.position_seconds > 0
         ORDER BY p.updated_at DESC
         LIMIT 1`
      )
      .get(seriesId) as
      | { episode_id: number; position_seconds: number; duration_seconds: number }
      | undefined;

    return {
      seriesId,
      watchedCount: counts.watched_count,
      totalCount: counts.total_count,
      lastWatchedAt: counts.last_watched_at,
      resumeEpisodeId: resume?.episode_id ?? null,
      resumePositionSeconds: resume?.position_seconds ?? null,
      resumeDurationSeconds: resume?.duration_seconds ?? null,
    };
  }

  /**
   * Items for the "Continue watching" rail. Rows must have a non-zero position,
   * not be completed, and are ordered by `updated_at DESC` so the most recent
   * watch bubbles to the front.
   */
  listContinueWatching(limit = 20): ContinueWatchingItem[] {
    const db = this.databaseService.db;
    const clampedLimit = Math.max(1, Math.min(100, Math.floor(limit)));

    const rows = db
      .prepare(
        `SELECT
           p.episode_id       AS p_episode_id,
           p.position_seconds AS p_position_seconds,
           p.duration_seconds AS p_duration_seconds,
           p.completed        AS p_completed,
           p.completed_at     AS p_completed_at,
           p.watch_count      AS p_watch_count,
           p.updated_at       AS p_updated_at,
           e.id               AS e_id,
           e.series_id        AS e_series_id,
           e.file_path        AS e_file_path,
           e.file_size        AS e_file_size,
           e.file_hash        AS e_file_hash,
           e.duration_seconds AS e_duration_seconds,
           e.width            AS e_width,
           e.height           AS e_height,
           e.video_codec      AS e_video_codec,
           e.audio_tracks_json    AS e_audio_tracks_json,
           e.subtitle_tracks_json AS e_subtitle_tracks_json,
           e.parsed_episode_number AS e_parsed_episode_number,
           e.parsed_season    AS e_parsed_season,
           e.parsed_title     AS e_parsed_title,
           e.release_group    AS e_release_group,
           e.kind             AS e_kind,
           e.mtime            AS e_mtime,
           e.created_at       AS e_created_at,
           s.id               AS s_id,
           s.root_id          AS s_root_id,
           s.folder_path      AS s_folder_path,
           s.parsed_title     AS s_parsed_title,
           s.display_title    AS s_display_title,
           s.anilist_id       AS s_anilist_id,
           s.match_status     AS s_match_status,
           s.match_confidence AS s_match_confidence,
           s.poster_path      AS s_poster_path,
           s.banner_path      AS s_banner_path,
           s.synopsis         AS s_synopsis,
           s.genres_json      AS s_genres_json,
           s.season           AS s_season,
           s.year             AS s_year,
           s.created_at       AS s_created_at,
           s.updated_at       AS s_updated_at
         FROM playback_progress p
         INNER JOIN local_episodes e ON e.id = p.episode_id
         INNER JOIN local_series s   ON s.id = e.series_id
         WHERE p.completed = 0
           AND p.position_seconds > 0
         ORDER BY p.updated_at DESC
         LIMIT ?`
      )
      .all(clampedLimit) as Array<Record<string, unknown>>;

    return rows.map(r => {
      const progress = progressRowToProgress({
        episode_id: r.p_episode_id as number,
        position_seconds: r.p_position_seconds as number,
        duration_seconds: r.p_duration_seconds as number,
        completed: r.p_completed as number,
        completed_at: r.p_completed_at as string | null,
        watch_count: r.p_watch_count as number,
        updated_at: r.p_updated_at as string,
      });
      const episode = episodeRowToEpisode({
        id: r.e_id as number,
        series_id: r.e_series_id as number,
        file_path: r.e_file_path as string,
        file_size: r.e_file_size as number,
        file_hash: r.e_file_hash as string | null,
        duration_seconds: r.e_duration_seconds as number | null,
        width: r.e_width as number | null,
        height: r.e_height as number | null,
        video_codec: r.e_video_codec as string | null,
        audio_tracks_json: r.e_audio_tracks_json as string | null,
        subtitle_tracks_json: r.e_subtitle_tracks_json as string | null,
        parsed_episode_number: r.e_parsed_episode_number as number | null,
        parsed_season: r.e_parsed_season as number | null,
        parsed_title: r.e_parsed_title as string | null,
        release_group: r.e_release_group as string | null,
        kind: r.e_kind as string,
        mtime: r.e_mtime as string,
        created_at: r.e_created_at as string,
      });
      const series = seriesRowToSeries({
        id: r.s_id as number,
        root_id: r.s_root_id as number,
        folder_path: r.s_folder_path as string,
        parsed_title: r.s_parsed_title as string,
        display_title: r.s_display_title as string | null,
        anilist_id: r.s_anilist_id as number | null,
        match_status: r.s_match_status as string,
        match_confidence: r.s_match_confidence as number | null,
        poster_path: r.s_poster_path as string | null,
        banner_path: r.s_banner_path as string | null,
        synopsis: r.s_synopsis as string | null,
        genres_json: r.s_genres_json as string | null,
        season: r.s_season as number | null,
        year: r.s_year as number | null,
        created_at: r.s_created_at as string,
        updated_at: r.s_updated_at as string,
      });
      return { progress, episode, series };
    });
  }

  // ==========================================================================
  // Posters + banners (Phase 5)
  // ==========================================================================

  /** Update the row column for the given artwork kind. */
  private updateArtworkColumn(
    seriesId: number,
    kind: PosterKind,
    value: string | null
  ): LocalSeries {
    const db = this.databaseService.db;
    const column = kind === 'poster' ? 'poster_path' : 'banner_path';
    db.prepare(
      `UPDATE local_series SET ${column} = ?, updated_at = datetime('now') WHERE id = ?`
    ).run(value, seriesId);
    const series = this.getSeriesById(seriesId);
    if (!series) {
      throw new Error(`Series ${seriesId} not found after artwork update`);
    }
    return series;
  }

  /**
   * Copy a local image file into the cache and point the series row at it.
   * Returns the updated series so callers can broadcast SERIES_UPDATED.
   */
  async setSeriesArtworkFromFile(
    seriesId: number,
    kind: PosterKind,
    filePath: string
  ): Promise<{ series: LocalSeries; artworkPath: string }> {
    const existing = this.getSeriesById(seriesId);
    if (!existing) {
      throw new Error(`Series ${seriesId} not found`);
    }
    const artworkPath = await savePosterFromLocalFile(seriesId, filePath, kind);
    const series = this.updateArtworkColumn(seriesId, kind, artworkPath);
    logger.info(`Updated ${kind} for series ${seriesId} from local file`);
    return { series, artworkPath };
  }

  /**
   * Download a remote image (typically an AniList CDN URL) into the cache
   * and point the series row at it.
   */
  async setSeriesArtworkFromUrl(
    seriesId: number,
    kind: PosterKind,
    url: string
  ): Promise<{ series: LocalSeries; artworkPath: string }> {
    const existing = this.getSeriesById(seriesId);
    if (!existing) {
      throw new Error(`Series ${seriesId} not found`);
    }
    const artworkPath = await savePosterFromUrl(seriesId, url, kind);
    const series = this.updateArtworkColumn(seriesId, kind, artworkPath);
    logger.info(`Updated ${kind} for series ${seriesId} from URL`);
    return { series, artworkPath };
  }

  /**
   * Remove any cached artwork for a series and clear the corresponding column.
   * The series falls back to the gradient placeholder in the UI.
   */
  async removeSeriesArtwork(seriesId: number, kind: PosterKind): Promise<LocalSeries> {
    const existing = this.getSeriesById(seriesId);
    if (!existing) {
      throw new Error(`Series ${seriesId} not found`);
    }
    await removePosterFromDisk(seriesId, kind);
    const series = this.updateArtworkColumn(seriesId, kind, null);
    logger.info(`Cleared ${kind} for series ${seriesId}`);
    return series;
  }
}
