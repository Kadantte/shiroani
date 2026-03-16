import type { SQLiteDatabase } from 'expo-sqlite';
import type { AnimeEntry, AnimeStatus, NotificationSubscription } from '@shiroani/shared';

// ============================================
// DB Row Types (snake_case, matching SQLite columns)
// ============================================

interface AnimeLibraryRow {
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

export interface Bookmark {
  id: number;
  url: string;
  title: string;
  favicon?: string;
  folder: string;
  createdAt: string;
}

interface BookmarkRow {
  id: number;
  url: string;
  title: string;
  favicon: string | null;
  folder: string;
  created_at: string;
}

export interface WatchHistoryEntry {
  id: number;
  animeId: number;
  episodeNumber: number;
  watchedUrl?: string;
  watchedAt: string;
}

interface WatchHistoryRow {
  id: number;
  anime_id: number;
  episode_number: number;
  watched_url: string | null;
  watched_at: string;
}

interface NotificationSubscriptionRow {
  id: number;
  anilist_id: number;
  title: string;
  title_romaji: string | null;
  cover_image: string | null;
  subscribed_at: string;
  enabled: number;
  source: string;
}

// ============================================
// Row-to-Type Mappers
// ============================================

function mapAnimeRow(row: AnimeLibraryRow): AnimeEntry {
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

function mapBookmarkRow(row: BookmarkRow): Bookmark {
  return {
    id: row.id,
    url: row.url,
    title: row.title,
    favicon: row.favicon ?? undefined,
    folder: row.folder,
    createdAt: row.created_at,
  };
}

function mapWatchHistoryRow(row: WatchHistoryRow): WatchHistoryEntry {
  return {
    id: row.id,
    animeId: row.anime_id,
    episodeNumber: row.episode_number,
    watchedUrl: row.watched_url ?? undefined,
    watchedAt: row.watched_at,
  };
}

function mapNotificationRow(row: NotificationSubscriptionRow): NotificationSubscription {
  return {
    anilistId: row.anilist_id,
    title: row.title,
    titleRomaji: row.title_romaji ?? undefined,
    coverImage: row.cover_image ?? undefined,
    subscribedAt: row.subscribed_at,
    enabled: row.enabled === 1,
    source: row.source as 'schedule' | 'library',
  };
}

// ============================================
// Anime Library Queries
// ============================================

export async function getAnimeLibrary(db: SQLiteDatabase): Promise<AnimeEntry[]> {
  const rows = await db.getAllAsync<AnimeLibraryRow>(
    `SELECT * FROM anime_library ORDER BY updated_at DESC`
  );
  return rows.map(mapAnimeRow);
}

export async function getAnimeByStatus(
  db: SQLiteDatabase,
  status: AnimeStatus
): Promise<AnimeEntry[]> {
  const rows = await db.getAllAsync<AnimeLibraryRow>(
    `SELECT * FROM anime_library WHERE status = ? ORDER BY updated_at DESC`,
    status
  );
  return rows.map(mapAnimeRow);
}

export async function getAnimeById(db: SQLiteDatabase, id: number): Promise<AnimeEntry | null> {
  const row = await db.getFirstAsync<AnimeLibraryRow>(
    `SELECT * FROM anime_library WHERE id = ?`,
    id
  );
  return row ? mapAnimeRow(row) : null;
}

export async function addAnime(
  db: SQLiteDatabase,
  data: Omit<AnimeEntry, 'id' | 'addedAt' | 'updatedAt'>
): Promise<AnimeEntry> {
  const result = await db.runAsync(
    `INSERT INTO anime_library (anilist_id, title, title_romaji, title_native, cover_image, total_episodes, status, current_episode, score, notes, resume_url)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    data.anilistId ?? null,
    data.title,
    data.titleRomaji ?? null,
    data.titleNative ?? null,
    data.coverImage ?? null,
    data.episodes ?? null,
    data.status,
    data.currentEpisode,
    data.score ?? null,
    data.notes ?? null,
    data.resumeUrl ?? null
  );

  const entry = await getAnimeById(db, result.lastInsertRowId);
  if (!entry) {
    throw new Error('Nie udalo sie dodac anime do biblioteki');
  }
  return entry;
}

export async function updateAnime(
  db: SQLiteDatabase,
  id: number,
  data: Partial<AnimeEntry>
): Promise<void> {
  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  if (data.anilistId !== undefined) {
    fields.push('anilist_id = ?');
    values.push(data.anilistId ?? null);
  }
  if (data.title !== undefined) {
    fields.push('title = ?');
    values.push(data.title);
  }
  if (data.titleRomaji !== undefined) {
    fields.push('title_romaji = ?');
    values.push(data.titleRomaji ?? null);
  }
  if (data.titleNative !== undefined) {
    fields.push('title_native = ?');
    values.push(data.titleNative ?? null);
  }
  if (data.coverImage !== undefined) {
    fields.push('cover_image = ?');
    values.push(data.coverImage ?? null);
  }
  if (data.episodes !== undefined) {
    fields.push('total_episodes = ?');
    values.push(data.episodes ?? null);
  }
  if (data.status !== undefined) {
    fields.push('status = ?');
    values.push(data.status);
  }
  if (data.currentEpisode !== undefined) {
    fields.push('current_episode = ?');
    values.push(data.currentEpisode);
  }
  if (data.score !== undefined) {
    fields.push('score = ?');
    values.push(data.score ?? null);
  }
  if (data.notes !== undefined) {
    fields.push('notes = ?');
    values.push(data.notes ?? null);
  }
  if (data.resumeUrl !== undefined) {
    fields.push('resume_url = ?');
    values.push(data.resumeUrl ?? null);
  }

  if (fields.length === 0) return;

  fields.push("updated_at = datetime('now')");
  values.push(id);

  await db.runAsync(`UPDATE anime_library SET ${fields.join(', ')} WHERE id = ?`, ...values);
}

export async function deleteAnime(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync(`DELETE FROM anime_library WHERE id = ?`, id);
}

// ============================================
// Bookmark Queries
// ============================================

export async function addBookmark(
  db: SQLiteDatabase,
  data: { url: string; title: string; favicon?: string; folder?: string }
): Promise<void> {
  await db.runAsync(
    `INSERT INTO bookmarks (url, title, favicon, folder) VALUES (?, ?, ?, ?)`,
    data.url,
    data.title,
    data.favicon ?? null,
    data.folder ?? 'default'
  );
}

export async function getBookmarks(db: SQLiteDatabase, folder?: string): Promise<Bookmark[]> {
  const rows = folder
    ? await db.getAllAsync<BookmarkRow>(
        `SELECT * FROM bookmarks WHERE folder = ? ORDER BY created_at DESC`,
        folder
      )
    : await db.getAllAsync<BookmarkRow>(`SELECT * FROM bookmarks ORDER BY created_at DESC`);
  return rows.map(mapBookmarkRow);
}

export async function deleteBookmark(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync(`DELETE FROM bookmarks WHERE id = ?`, id);
}

// ============================================
// Watch History Queries
// ============================================

export async function addWatchHistory(
  db: SQLiteDatabase,
  animeId: number,
  episodeNumber: number,
  watchedUrl?: string
): Promise<void> {
  await db.runAsync(
    `INSERT INTO watch_history (anime_id, episode_number, watched_url)
     VALUES (?, ?, ?)
     ON CONFLICT(anime_id, episode_number) DO UPDATE SET
       watched_url = COALESCE(excluded.watched_url, watched_url),
       watched_at = datetime('now')`,
    animeId,
    episodeNumber,
    watchedUrl ?? null
  );
}

export async function getWatchHistory(
  db: SQLiteDatabase,
  animeId: number
): Promise<WatchHistoryEntry[]> {
  const rows = await db.getAllAsync<WatchHistoryRow>(
    `SELECT * FROM watch_history WHERE anime_id = ? ORDER BY episode_number ASC`,
    animeId
  );
  return rows.map(mapWatchHistoryRow);
}

// ============================================
// Notification Subscription Queries
// ============================================

export async function getNotificationSubscriptions(
  db: SQLiteDatabase
): Promise<NotificationSubscription[]> {
  const rows = await db.getAllAsync<NotificationSubscriptionRow>(
    `SELECT * FROM notification_subscriptions ORDER BY subscribed_at DESC`
  );
  return rows.map(mapNotificationRow);
}

export async function toggleNotificationSubscription(
  db: SQLiteDatabase,
  anilistId: number,
  enabled: boolean
): Promise<void> {
  await db.runAsync(
    `UPDATE notification_subscriptions SET enabled = ? WHERE anilist_id = ?`,
    enabled ? 1 : 0,
    anilistId
  );
}
