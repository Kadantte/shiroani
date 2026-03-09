import { Injectable } from '@nestjs/common';
import {
  createLogger,
  type AnimeEntry,
  type AnimeStatus,
  type LibraryAddPayload,
  type LibraryUpdatePayload,
  type LibraryStatsResult,
} from '@shiroani/shared';
import { DatabaseService } from '../database';

const logger = createLogger('LibraryService');

/** Raw row shape returned by better-sqlite3 for the anime_library table. */
export interface AnimeLibraryRow {
  id: number;
  anilist_id: number | null;
  title: string;
  title_romaji: string | null;
  title_native: string | null;
  cover_image: string | null;
  total_episodes: number | null;
  status: string;
  current_episode: number;
  score: number | null;
  notes: string | null;
  resume_url: string | null;
  added_at: string;
  updated_at: string;
}

/** Map a database row to the shared AnimeEntry type. */
export function rowToEntry(row: AnimeLibraryRow): AnimeEntry {
  return {
    id: row.id,
    anilistId: row.anilist_id ?? undefined,
    title: row.title,
    titleRomaji: row.title_romaji ?? undefined,
    titleNative: row.title_native ?? undefined,
    coverImage: row.cover_image ?? undefined,
    episodes: row.total_episodes ?? undefined,
    status: row.status as AnimeStatus,
    currentEpisode: row.current_episode,
    score: row.score ?? undefined,
    notes: row.notes ?? undefined,
    resumeUrl: row.resume_url ?? undefined,
    addedAt: row.added_at,
    updatedAt: row.updated_at,
  };
}

@Injectable()
export class LibraryService {
  constructor(private readonly databaseService: DatabaseService) {
    logger.info('LibraryService initialized');
  }

  /** Get all library entries, optionally filtered by status. */
  getAllEntries(status?: AnimeStatus): AnimeEntry[] {
    const db = this.databaseService.db;

    if (status) {
      const rows = db
        .prepare('SELECT * FROM anime_library WHERE status = ? ORDER BY updated_at DESC')
        .all(status) as AnimeLibraryRow[];
      return rows.map(rowToEntry);
    }

    const rows = db
      .prepare('SELECT * FROM anime_library ORDER BY updated_at DESC')
      .all() as AnimeLibraryRow[];
    return rows.map(rowToEntry);
  }

  /** Get a single entry by its primary key. */
  getEntryById(id: number): AnimeEntry | undefined {
    const db = this.databaseService.db;
    const row = db.prepare('SELECT * FROM anime_library WHERE id = ?').get(id) as
      | AnimeLibraryRow
      | undefined;
    return row ? rowToEntry(row) : undefined;
  }

  /** Get a single entry by its AniList ID. */
  getEntryByAnilistId(anilistId: number): AnimeEntry | undefined {
    const db = this.databaseService.db;
    const row = db.prepare('SELECT * FROM anime_library WHERE anilist_id = ?').get(anilistId) as
      | AnimeLibraryRow
      | undefined;
    return row ? rowToEntry(row) : undefined;
  }

  /** Insert a new anime into the library. Returns the created entry. */
  addEntry(payload: LibraryAddPayload): AnimeEntry {
    const db = this.databaseService.db;

    const result = db
      .prepare(
        `INSERT INTO anime_library
          (anilist_id, title, title_romaji, title_native, cover_image, total_episodes, status, current_episode, resume_url)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        payload.anilistId ?? null,
        payload.title,
        payload.titleRomaji ?? null,
        payload.titleNative ?? null,
        payload.coverImage ?? null,
        payload.episodes ?? null,
        payload.status ?? 'plan_to_watch',
        payload.currentEpisode ?? 0,
        payload.resumeUrl ?? null
      );

    const entry = this.getEntryById(Number(result.lastInsertRowid))!;
    logger.info(`Added "${entry.title}" to library (id=${entry.id})`);
    return entry;
  }

  /** Update an existing anime entry. Returns the updated entry or undefined if not found. */
  updateEntry(id: number, updates: Omit<LibraryUpdatePayload, 'id'>): AnimeEntry | undefined {
    const db = this.databaseService.db;

    const setClauses: string[] = [];
    const values: (string | number | null)[] = [];

    if (updates.anilistId !== undefined) {
      setClauses.push('anilist_id = ?');
      values.push(updates.anilistId);
    }
    if (updates.status !== undefined) {
      setClauses.push('status = ?');
      values.push(updates.status);
    }
    if (updates.currentEpisode !== undefined) {
      setClauses.push('current_episode = ?');
      values.push(updates.currentEpisode);
    }
    if (updates.score !== undefined) {
      setClauses.push('score = ?');
      values.push(updates.score);
    }
    if (updates.notes !== undefined) {
      setClauses.push('notes = ?');
      values.push(updates.notes);
    }
    if (updates.resumeUrl !== undefined) {
      setClauses.push('resume_url = ?');
      values.push(updates.resumeUrl);
    }

    if (setClauses.length === 0) {
      return this.getEntryById(id);
    }

    setClauses.push("updated_at = datetime('now')");
    values.push(id);

    db.prepare(`UPDATE anime_library SET ${setClauses.join(', ')} WHERE id = ?`).run(...values);

    const entry = this.getEntryById(id);
    if (entry) {
      logger.debug(`Updated entry id=${id}`);
    }
    return entry;
  }

  /** Remove an anime from the library. Returns true if a row was deleted. */
  removeEntry(id: number): boolean {
    const db = this.databaseService.db;
    const result = db.prepare('DELETE FROM anime_library WHERE id = ?').run(id);
    const deleted = result.changes > 0;
    if (deleted) {
      logger.info(`Removed entry id=${id} from library`);
    }
    return deleted;
  }

  /** Get counts of entries grouped by status. */
  getStats(): LibraryStatsResult {
    const db = this.databaseService.db;
    const rows = db
      .prepare('SELECT status, COUNT(*) as count FROM anime_library GROUP BY status')
      .all() as { status: string; count: number }[];

    const stats: LibraryStatsResult = {
      watching: 0,
      completed: 0,
      plan_to_watch: 0,
      on_hold: 0,
      dropped: 0,
      total: 0,
    };

    for (const row of rows) {
      const key = row.status as keyof Omit<LibraryStatsResult, 'total'>;
      if (key in stats) {
        stats[key] = row.count;
      }
      stats.total += row.count;
    }

    return stats;
  }
}
