import type { SQLiteDatabase } from 'expo-sqlite';

const MIGRATIONS: Record<number, string[]> = {
  1: [
    `CREATE TABLE IF NOT EXISTS anime_library (
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
    )`,
    `CREATE INDEX IF NOT EXISTS idx_anime_library_status ON anime_library(status)`,
    `CREATE INDEX IF NOT EXISTS idx_anime_library_anilist_id ON anime_library(anilist_id)`,
  ],
  2: [
    `CREATE TABLE IF NOT EXISTS bookmarks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      url TEXT NOT NULL,
      title TEXT NOT NULL,
      favicon TEXT,
      folder TEXT DEFAULT 'default',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_bookmarks_folder ON bookmarks(folder)`,
  ],
  3: [
    `CREATE TABLE IF NOT EXISTS watch_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      anime_id INTEGER NOT NULL REFERENCES anime_library(id) ON DELETE CASCADE,
      episode_number INTEGER NOT NULL,
      watched_url TEXT,
      watched_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(anime_id, episode_number)
    )`,
  ],
  4: [
    `CREATE TABLE IF NOT EXISTS notification_subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      anilist_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      title_romaji TEXT,
      cover_image TEXT,
      subscribed_at TEXT NOT NULL DEFAULT (datetime('now')),
      enabled INTEGER NOT NULL DEFAULT 1,
      source TEXT NOT NULL DEFAULT 'schedule'
    )`,
    `CREATE INDEX IF NOT EXISTS idx_notif_subs_anilist_id ON notification_subscriptions(anilist_id)`,
  ],
  5: [
    `CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )`,
  ],
};

const LATEST_VERSION = Math.max(...Object.keys(MIGRATIONS).map(Number));

export async function migrateDbIfNeeded(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`PRAGMA journal_mode = WAL`);
  await db.execAsync(`PRAGMA foreign_keys = ON`);

  await db.execAsync(
    `CREATE TABLE IF NOT EXISTS _migrations (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`
  );

  const result = await db.getFirstAsync<{ version: number }>(
    `SELECT MAX(version) as version FROM _migrations`
  );
  const currentVersion = result?.version ?? 0;

  if (currentVersion >= LATEST_VERSION) {
    return;
  }

  for (let v = currentVersion + 1; v <= LATEST_VERSION; v++) {
    const statements = MIGRATIONS[v];
    if (!statements) continue;

    await db.withTransactionAsync(async () => {
      for (const sql of statements) {
        await db.execAsync(sql);
      }
      await db.runAsync(`INSERT INTO _migrations (version) VALUES (?)`, v);
    });
  }
}
