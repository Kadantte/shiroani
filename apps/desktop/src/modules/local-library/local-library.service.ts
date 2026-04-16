import { Injectable } from '@nestjs/common';
import {
  createLogger,
  type LibraryRoot,
  type LocalEpisode,
  type LocalSeries,
} from '@shiroani/shared';
import { DatabaseService } from '../database';
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
}
