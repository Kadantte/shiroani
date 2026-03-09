import { Injectable } from '@nestjs/common';
import {
  createLogger,
  type DiaryEntry,
  type DiaryCreatePayload,
  type DiaryUpdatePayload,
} from '@shiroani/shared';
import { DatabaseService } from '../database';

const logger = createLogger('DiaryService');

/** Raw row shape returned by better-sqlite3 for the diary_entries table. */
export interface DiaryRow {
  id: number;
  title: string;
  content_json: string;
  cover_gradient: string | null;
  mood: string | null;
  tags: string | null;
  anime_id: number | null;
  anime_title: string | null;
  anime_cover_image: string | null;
  is_pinned: number;
  created_at: string;
  updated_at: string;
}

/** Map a database row to the shared DiaryEntry type. */
export function rowToEntry(row: DiaryRow): DiaryEntry {
  return {
    id: row.id,
    title: row.title,
    contentJson: row.content_json,
    coverGradient: (row.cover_gradient as DiaryEntry['coverGradient']) ?? undefined,
    mood: (row.mood as DiaryEntry['mood']) ?? undefined,
    tags: row.tags ? JSON.parse(row.tags) : undefined,
    animeId: row.anime_id ?? undefined,
    animeTitle: row.anime_title ?? undefined,
    animeCoverImage: row.anime_cover_image ?? undefined,
    isPinned: row.is_pinned === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

@Injectable()
export class DiaryService {
  constructor(private readonly databaseService: DatabaseService) {
    logger.info('DiaryService initialized');
  }

  /** Get all diary entries, ordered by pinned first then most recently updated. */
  getAllEntries(): DiaryEntry[] {
    const db = this.databaseService.db;
    const rows = db
      .prepare('SELECT * FROM diary_entries ORDER BY is_pinned DESC, updated_at DESC')
      .all() as DiaryRow[];
    return rows.map(rowToEntry);
  }

  /** Get a single diary entry by its primary key. */
  getEntryById(id: number): DiaryEntry | undefined {
    const db = this.databaseService.db;
    const row = db.prepare('SELECT * FROM diary_entries WHERE id = ?').get(id) as
      | DiaryRow
      | undefined;
    return row ? rowToEntry(row) : undefined;
  }

  /** Insert a new diary entry. Returns the created entry. */
  createEntry(payload: DiaryCreatePayload): DiaryEntry {
    const db = this.databaseService.db;

    const result = db
      .prepare(
        `INSERT INTO diary_entries (title, content_json, cover_gradient, mood, tags, anime_id, anime_title, anime_cover_image)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        payload.title,
        payload.contentJson,
        payload.coverGradient ?? null,
        payload.mood ?? null,
        payload.tags ? JSON.stringify(payload.tags) : null,
        payload.animeId ?? null,
        payload.animeTitle ?? null,
        payload.animeCoverImage ?? null
      );

    const entry = this.getEntryById(Number(result.lastInsertRowid))!;
    logger.info(`Created diary entry "${entry.title}" (id=${entry.id})`);
    return entry;
  }

  /** Update an existing diary entry. Returns the updated entry or undefined if not found. */
  updateEntry(id: number, updates: Omit<DiaryUpdatePayload, 'id'>): DiaryEntry | undefined {
    const db = this.databaseService.db;

    const setClauses: string[] = [];
    const values: (string | number | null)[] = [];

    if (updates.title !== undefined) {
      setClauses.push('title = ?');
      values.push(updates.title);
    }
    if (updates.contentJson !== undefined) {
      setClauses.push('content_json = ?');
      values.push(updates.contentJson);
    }
    if (updates.coverGradient !== undefined) {
      setClauses.push('cover_gradient = ?');
      values.push(updates.coverGradient);
    }
    if (updates.mood !== undefined) {
      setClauses.push('mood = ?');
      values.push(updates.mood);
    }
    if (updates.tags !== undefined) {
      setClauses.push('tags = ?');
      values.push(updates.tags ? JSON.stringify(updates.tags) : null);
    }
    if (updates.animeId !== undefined) {
      setClauses.push('anime_id = ?');
      values.push(updates.animeId);
    }
    if (updates.animeTitle !== undefined) {
      setClauses.push('anime_title = ?');
      values.push(updates.animeTitle);
    }
    if (updates.animeCoverImage !== undefined) {
      setClauses.push('anime_cover_image = ?');
      values.push(updates.animeCoverImage);
    }
    if (updates.isPinned !== undefined) {
      setClauses.push('is_pinned = ?');
      values.push(updates.isPinned ? 1 : 0);
    }

    if (setClauses.length === 0) {
      return this.getEntryById(id);
    }

    setClauses.push("updated_at = datetime('now')");
    values.push(id);

    db.prepare(`UPDATE diary_entries SET ${setClauses.join(', ')} WHERE id = ?`).run(...values);

    const entry = this.getEntryById(id);
    if (entry) {
      logger.debug(`Updated diary entry id=${id}`);
    }
    return entry;
  }

  /** Remove a diary entry. Returns true if a row was deleted. */
  removeEntry(id: number): boolean {
    const db = this.databaseService.db;
    const result = db.prepare('DELETE FROM diary_entries WHERE id = ?').run(id);
    const deleted = result.changes > 0;
    if (deleted) {
      logger.info(`Removed diary entry id=${id}`);
    }
    return deleted;
  }
}
