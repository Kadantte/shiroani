import type Database from 'better-sqlite3';
import { createLogger } from '@shiroani/shared';

const logger = createLogger('Migrations');

interface Migration {
  version: number;
  description: string;
  up: string;
}

const MIGRATIONS: Migration[] = [
  {
    version: 1,
    description: 'Create anime_library table',
    up: `
      CREATE TABLE IF NOT EXISTS anime_library (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        anilist_id INTEGER UNIQUE,
        title TEXT NOT NULL,
        title_romaji TEXT,
        title_native TEXT,
        cover_image TEXT,
        total_episodes INTEGER,
        status TEXT NOT NULL DEFAULT 'plan_to_watch',
        current_episode INTEGER NOT NULL DEFAULT 0,
        score INTEGER,
        notes TEXT,
        resume_url TEXT,
        added_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_anime_library_status ON anime_library(status);
      CREATE INDEX IF NOT EXISTS idx_anime_library_anilist_id ON anime_library(anilist_id);
    `,
  },
  {
    version: 2,
    description: 'Create bookmarks table',
    up: `
      CREATE TABLE IF NOT EXISTS bookmarks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        url TEXT NOT NULL,
        title TEXT NOT NULL,
        favicon TEXT,
        folder TEXT DEFAULT 'default',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_bookmarks_folder ON bookmarks(folder);
    `,
  },
  {
    version: 3,
    description: 'Create watch_history table',
    up: `
      CREATE TABLE IF NOT EXISTS watch_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        anime_id INTEGER NOT NULL REFERENCES anime_library(id) ON DELETE CASCADE,
        episode_number INTEGER NOT NULL,
        watched_url TEXT,
        watched_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(anime_id, episode_number)
      );
    `,
  },
  {
    version: 4,
    description: 'Create diary_entries table',
    up: `
      CREATE TABLE IF NOT EXISTS diary_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL DEFAULT '',
        content_json TEXT NOT NULL DEFAULT '{}',
        cover_gradient TEXT,
        mood TEXT,
        tags TEXT,
        anime_id INTEGER REFERENCES anime_library(id) ON DELETE SET NULL,
        anime_title TEXT,
        anime_cover_image TEXT,
        is_pinned INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_diary_created ON diary_entries(created_at);
      CREATE INDEX IF NOT EXISTS idx_diary_pinned ON diary_entries(is_pinned);
    `,
  },
  {
    version: 5,
    description: 'Create feed_sources and feed_items tables',
    up: `
      CREATE TABLE IF NOT EXISTS feed_sources (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        url TEXT NOT NULL UNIQUE,
        site_url TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'news',
        language TEXT NOT NULL DEFAULT 'en',
        color TEXT NOT NULL DEFAULT '#666666',
        icon TEXT,
        enabled INTEGER NOT NULL DEFAULT 1,
        poll_interval_minutes INTEGER NOT NULL DEFAULT 60,
        last_fetched_at TEXT,
        last_etag TEXT,
        consecutive_failures INTEGER NOT NULL DEFAULT 0,
        last_error TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_feed_sources_enabled ON feed_sources(enabled);
      CREATE INDEX IF NOT EXISTS idx_feed_sources_category ON feed_sources(category);

      CREATE TABLE IF NOT EXISTS feed_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        feed_source_id INTEGER NOT NULL REFERENCES feed_sources(id) ON DELETE CASCADE,
        guid TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        url TEXT NOT NULL,
        author TEXT,
        image_url TEXT,
        published_at TEXT,
        categories TEXT,
        content_hash TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(feed_source_id, guid)
      );
      CREATE INDEX IF NOT EXISTS idx_feed_items_source ON feed_items(feed_source_id);
      CREATE INDEX IF NOT EXISTS idx_feed_items_published ON feed_items(published_at);
      CREATE INDEX IF NOT EXISTS idx_feed_items_hash ON feed_items(content_hash);
    `,
  },
];

/**
 * Run pending database migrations in order.
 *
 * Creates a `_migrations` table to track which versions have been applied.
 * Each pending migration runs inside a transaction so partial failures
 * roll back cleanly.
 */
export function runMigrations(db: Database.Database): void {
  // Ensure the migrations tracking table exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      version INTEGER PRIMARY KEY,
      description TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Determine current schema version
  const row = db.prepare('SELECT MAX(version) AS current_version FROM _migrations').get() as
    | { current_version: number | null }
    | undefined;
  const currentVersion = row?.current_version ?? 0;

  const pending = MIGRATIONS.filter(m => m.version > currentVersion);

  if (pending.length === 0) {
    logger.debug(`Database is up to date (version ${currentVersion})`);
    return;
  }

  logger.info(`Running ${pending.length} pending migration(s) from version ${currentVersion}`);

  for (const migration of pending) {
    const applyMigration = db.transaction(() => {
      db.exec(migration.up);
      db.prepare('INSERT INTO _migrations (version, description) VALUES (?, ?)').run(
        migration.version,
        migration.description
      );
    });

    applyMigration();
    logger.info(`Applied migration v${migration.version}: ${migration.description}`);
  }

  logger.info(
    `All migrations applied. Database now at version ${pending[pending.length - 1].version}`
  );
}
