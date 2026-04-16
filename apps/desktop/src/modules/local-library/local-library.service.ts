import { Injectable } from '@nestjs/common';
import {
  createLogger,
  type LibraryRoot,
  type LocalSeries,
  type LocalMatchStatus,
} from '@shiroani/shared';
import { DatabaseService } from '../database';

const logger = createLogger('LocalLibraryService');

/** Raw row shape returned by better-sqlite3 for the library_roots table. */
export interface LibraryRootRow {
  id: number;
  path: string;
  label: string | null;
  enabled: number;
  added_at: string;
  last_scanned_at: string | null;
}

/** Raw row shape returned by better-sqlite3 for the local_series table. */
export interface LocalSeriesRow {
  id: number;
  root_id: number;
  folder_path: string;
  parsed_title: string;
  display_title: string | null;
  anilist_id: number | null;
  match_status: string;
  match_confidence: number | null;
  poster_path: string | null;
  banner_path: string | null;
  synopsis: string | null;
  genres_json: string | null;
  season: number | null;
  year: number | null;
  created_at: string;
  updated_at: string;
}

/** Map a raw library_roots row to the shared LibraryRoot type. */
export function rootRowToRoot(row: LibraryRootRow): LibraryRoot {
  return {
    id: row.id,
    path: row.path,
    label: row.label,
    enabled: row.enabled === 1,
    addedAt: row.added_at,
    lastScannedAt: row.last_scanned_at,
  };
}

/** Map a raw local_series row to the shared LocalSeries type. */
export function seriesRowToSeries(row: LocalSeriesRow): LocalSeries {
  let genres: string[] | null = null;
  if (row.genres_json) {
    try {
      const parsed: unknown = JSON.parse(row.genres_json);
      if (Array.isArray(parsed)) {
        genres = parsed.filter((v): v is string => typeof v === 'string');
      }
    } catch {
      genres = null;
    }
  }

  return {
    id: row.id,
    rootId: row.root_id,
    folderPath: row.folder_path,
    parsedTitle: row.parsed_title,
    displayTitle: row.display_title,
    anilistId: row.anilist_id,
    matchStatus: row.match_status as LocalMatchStatus,
    matchConfidence: row.match_confidence,
    posterPath: row.poster_path,
    bannerPath: row.banner_path,
    synopsis: row.synopsis,
    genres,
    season: row.season,
    year: row.year,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

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
   *
   * Phase 0 placeholder: the scanner that populates `local_series` ships in
   * Phase 3, so this currently returns the real query result — which will be
   * empty until then.
   */
  listSeriesByRoot(rootId?: number): LocalSeries[] {
    const db = this.databaseService.db;

    if (rootId !== undefined) {
      const rows = db
        .prepare(
          'SELECT * FROM local_series WHERE root_id = ? ORDER BY parsed_title COLLATE NOCASE'
        )
        .all(rootId) as LocalSeriesRow[];
      return rows.map(seriesRowToSeries);
    }

    const rows = db
      .prepare('SELECT * FROM local_series ORDER BY parsed_title COLLATE NOCASE')
      .all() as LocalSeriesRow[];
    return rows.map(seriesRowToSeries);
  }
}
