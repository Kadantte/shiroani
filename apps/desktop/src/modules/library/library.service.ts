import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { createLogger } from '@shiroani/shared';

const logger = createLogger('LibraryService');

/**
 * LibraryService manages the user's local anime library backed by SQLite.
 *
 * TODO: Implement the following:
 *
 * Database setup (using better-sqlite3):
 * - Initialize SQLite database at app.getPath('userData')/library.db
 * - Create tables on first run:
 *   - library_entries: id, anilist_id, title, cover_image, status (watching/completed/planned/dropped/paused),
 *     progress (episodes watched), score, notes, added_at, updated_at
 *   - watch_history: id, anilist_id, episode_number, watched_at, source_url
 *
 * CRUD operations:
 * - addToLibrary(entry): Insert or update a library entry
 * - removeFromLibrary(anilistId): Delete an entry
 * - updateProgress(anilistId, episode): Update watch progress
 * - updateStatus(anilistId, status): Update watching status
 * - updateScore(anilistId, score): Update user rating
 * - getLibrary(filters?): Get all entries, optionally filtered by status
 * - getEntry(anilistId): Get a single library entry
 * - searchLibrary(query): Search library by title
 *
 * Watch history:
 * - addWatchHistoryEntry(anilistId, episode, sourceUrl): Log a watched episode
 * - getWatchHistory(anilistId): Get watch history for an anime
 *
 * Export/Import:
 * - exportLibrary(): Export library as JSON (for backup)
 * - importLibrary(data): Import library from JSON
 */
@Injectable()
export class LibraryService implements OnModuleInit, OnModuleDestroy {
  // TODO: private db: Database.Database;

  constructor() {
    logger.info('LibraryService initialized');
  }

  onModuleInit() {
    // TODO: Initialize SQLite database
    // const dbPath = join(app.getPath('userData'), 'library.db');
    // this.db = new Database(dbPath);
    // this.createTables();
    logger.info('LibraryService module initialized');
  }

  onModuleDestroy() {
    // TODO: Close SQLite database
    // this.db?.close();
    logger.info('LibraryService module destroyed');
  }

  // TODO: Implement CRUD methods

  // TODO: Implement watch history methods

  // TODO: Implement export/import
}
