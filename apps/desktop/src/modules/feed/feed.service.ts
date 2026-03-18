import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { createHash } from 'crypto';
import Parser from 'rss-parser';
import {
  createLogger,
  type FeedItem,
  type FeedSource,
  type FeedCategory,
  type FeedLanguage,
  type FeedGetItemsPayload,
  type FeedGetItemsResult,
  DEFAULT_FEED_SOURCES,
} from '@shiroani/shared';
import { DatabaseService } from '../database';

const logger = createLogger('FeedService');

// ============================================
// RSS Parser custom item type
// ============================================

interface CustomItem {
  mediaThumbnail?: { $?: { url?: string } };
  mediaContent?: Array<{ $?: { url?: string; medium?: string } }>;
  enclosure?:
    | Array<{ $?: { url?: string; type?: string } }>
    | { $?: { url?: string; type?: string } };
  [key: string]: unknown;
}

// ============================================
// Database row interfaces
// ============================================

interface FeedSourceRow {
  id: number;
  name: string;
  url: string;
  site_url: string;
  category: string;
  language: string;
  color: string;
  icon: string | null;
  enabled: number; // SQLite boolean
  poll_interval_minutes: number;
  last_fetched_at: string | null;
  last_etag: string | null;
  consecutive_failures: number;
  last_error: string | null;
  created_at: string;
}

interface FeedItemRow {
  id: number;
  feed_source_id: number;
  guid: string;
  title: string;
  description: string | null;
  url: string;
  author: string | null;
  image_url: string | null;
  published_at: string | null;
  categories: string | null; // JSON array string
  content_hash: string;
  created_at: string;
  // Joined fields from feed_sources
  source_name?: string;
  source_color?: string;
  source_icon?: string | null;
  source_category?: string;
  source_language?: string;
}

// ============================================
// Row-to-type mapping functions
// ============================================

function rowToSource(row: FeedSourceRow): FeedSource {
  return {
    id: row.id,
    name: row.name,
    url: row.url,
    siteUrl: row.site_url,
    category: row.category as FeedCategory,
    language: row.language as FeedLanguage,
    color: row.color,
    icon: row.icon ?? undefined,
    enabled: row.enabled === 1,
    pollIntervalMinutes: row.poll_interval_minutes,
    lastFetchedAt: row.last_fetched_at ?? undefined,
    consecutiveFailures: row.consecutive_failures,
    lastError: row.last_error ?? undefined,
  };
}

function rowToItem(row: FeedItemRow): FeedItem {
  return {
    id: row.id,
    feedSourceId: row.feed_source_id,
    sourceName: row.source_name ?? '',
    sourceColor: row.source_color ?? '#666',
    sourceIcon: row.source_icon ?? undefined,
    sourceCategory: (row.source_category ?? 'news') as FeedCategory,
    sourceLanguage: (row.source_language ?? 'en') as FeedLanguage,
    guid: row.guid,
    title: row.title,
    description: row.description ?? undefined,
    url: row.url,
    author: row.author ?? undefined,
    imageUrl: row.image_url ?? undefined,
    publishedAt: row.published_at ?? undefined,
    categories: row.categories ? JSON.parse(row.categories) : [],
    createdAt: row.created_at,
  };
}

// ============================================
// FeedService
// ============================================

@Injectable()
export class FeedService implements OnModuleInit, OnModuleDestroy {
  private parser = new Parser<Record<string, unknown>, CustomItem>({
    customFields: {
      item: [
        ['media:thumbnail', 'mediaThumbnail'],
        ['media:content', 'mediaContent', { keepArray: true }],
        ['enclosure', 'enclosure', { keepArray: true }],
      ],
    },
    timeout: 30000,
  });

  private pollingTimer: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly databaseService: DatabaseService) {
    logger.info('FeedService initialized');
  }

  onModuleInit(): void {
    this.seedDefaultSources();
    this.startPolling();
  }

  onModuleDestroy(): void {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
      logger.info('Polling timer cleared');
    }
  }

  // ============================================
  // Public methods
  // ============================================

  /** Seed default feed sources if the table is empty. */
  seedDefaultSources(): void {
    const db = this.databaseService.db;
    const count = db.prepare('SELECT COUNT(*) as count FROM feed_sources').get() as {
      count: number;
    };

    if (count.count > 0) {
      logger.debug('Feed sources already seeded, skipping');
      return;
    }

    const insert = db.prepare(`
      INSERT INTO feed_sources (name, url, site_url, category, language, color, icon, poll_interval_minutes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const seedAll = db.transaction(() => {
      for (const source of DEFAULT_FEED_SOURCES) {
        insert.run(
          source.name,
          source.url,
          source.siteUrl,
          source.category,
          source.language,
          source.color,
          source.icon ?? null,
          source.pollIntervalMinutes
        );
      }
    });

    seedAll();
    logger.info(`Seeded ${DEFAULT_FEED_SOURCES.length} default feed sources`);
  }

  /** Get all feed sources. */
  getAllSources(): FeedSource[] {
    const db = this.databaseService.db;
    const rows = db
      .prepare('SELECT * FROM feed_sources ORDER BY category, name')
      .all() as FeedSourceRow[];
    return rows.map(rowToSource);
  }

  /** Toggle a feed source's enabled state. */
  toggleSource(id: number, enabled: boolean): void {
    const db = this.databaseService.db;
    db.prepare('UPDATE feed_sources SET enabled = ? WHERE id = ?').run(enabled ? 1 : 0, id);
    logger.info(`Source id=${id} ${enabled ? 'enabled' : 'disabled'}`);
  }

  /** Get feed items with filtering and pagination. */
  getItems(payload: FeedGetItemsPayload): FeedGetItemsResult {
    const db = this.databaseService.db;
    const limit = payload.limit ?? 50;
    const offset = payload.offset ?? 0;

    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (payload.category && payload.category !== 'all') {
      conditions.push('fs.category = ?');
      params.push(payload.category);
    }

    if (payload.language && payload.language !== 'all') {
      conditions.push('fs.language = ?');
      params.push(payload.language);
    }

    if (payload.sourceId) {
      conditions.push('fi.feed_source_id = ?');
      params.push(payload.sourceId);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRow = db
      .prepare(
        `SELECT COUNT(*) as total FROM feed_items fi
         JOIN feed_sources fs ON fi.feed_source_id = fs.id
         ${whereClause}`
      )
      .get(...params) as { total: number };

    const total = countRow.total;

    const rows = db
      .prepare(
        `SELECT fi.*,
                fs.name as source_name,
                fs.color as source_color,
                fs.icon as source_icon,
                fs.category as source_category,
                fs.language as source_language
         FROM feed_items fi
         JOIN feed_sources fs ON fi.feed_source_id = fs.id
         ${whereClause}
         ORDER BY fi.published_at DESC, fi.created_at DESC
         LIMIT ? OFFSET ?`
      )
      .all(...params, limit, offset) as FeedItemRow[];

    return {
      items: rows.map(rowToItem),
      total,
      hasMore: offset + limit < total,
    };
  }

  /** Refresh all enabled feeds. Returns the count of newly inserted items. */
  async refreshAllFeeds(): Promise<number> {
    const db = this.databaseService.db;
    const sources = db
      .prepare('SELECT * FROM feed_sources WHERE enabled = 1')
      .all() as FeedSourceRow[];

    logger.info(`Refreshing ${sources.length} enabled feed sources`);

    let totalNew = 0;

    for (const source of sources) {
      try {
        const newCount = await this.fetchFeed(source);
        totalNew += newCount;
      } catch (error) {
        logger.error(`Failed to refresh feed "${source.name}":`, error);
      }
    }

    logger.info(`Feed refresh complete: ${totalNew} new items`);
    return totalNew;
  }

  /** Fetch a single RSS feed, insert new items, return count of new items. */
  async fetchFeed(source: FeedSourceRow): Promise<number> {
    const db = this.databaseService.db;

    try {
      const feed = await this.parser.parseURL(source.url);

      const insert = db.prepare(`
        INSERT OR IGNORE INTO feed_items
          (feed_source_id, guid, title, description, url, author, image_url, published_at, categories, content_hash)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      let newCount = 0;

      const insertAll = db.transaction(() => {
        for (const item of feed.items ?? []) {
          const guid = item.guid ?? item.link ?? item.title ?? '';
          if (!guid) continue;

          const title = item.title ?? 'Untitled';
          const url = item.link ?? '';
          if (!url) continue;

          const description = this.cleanDescription(
            item.contentSnippet ?? item.content ?? item.summary ?? ''
          );
          const author = item.creator ?? item.author ?? null;
          const imageUrl = this.extractImageUrl(item as CustomItem, item.content ?? item.summary);
          const publishedAt = item.isoDate ?? item.pubDate ?? null;
          const categories = item.categories ? JSON.stringify(item.categories) : null;
          const contentHash = this.generateContentHash(title, url);

          const result = insert.run(
            source.id,
            guid,
            title,
            description || null,
            url,
            author,
            imageUrl,
            publishedAt,
            categories,
            contentHash
          );

          if (result.changes > 0) {
            newCount++;
          }
        }
      });

      insertAll();

      // Update source on success
      db.prepare(
        `UPDATE feed_sources
         SET last_fetched_at = datetime('now'),
             consecutive_failures = 0,
             last_error = NULL
         WHERE id = ?`
      ).run(source.id);

      if (newCount > 0) {
        logger.info(`Fetched ${newCount} new items from "${source.name}"`);
      } else {
        logger.debug(`No new items from "${source.name}"`);
      }

      return newCount;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      db.prepare(
        `UPDATE feed_sources
         SET consecutive_failures = consecutive_failures + 1,
             last_error = ?
         WHERE id = ?`
      ).run(errorMessage, source.id);

      logger.warn(`Failed to fetch feed "${source.name}": ${errorMessage}`);
      return 0;
    }
  }

  // ============================================
  // Private helper methods
  // ============================================

  /** Generate a SHA-256 content hash from title + url, truncated to 16 hex chars. */
  private generateContentHash(title: string, url: string): string {
    return createHash('sha256').update(`${title}${url}`).digest('hex').substring(0, 16);
  }

  /**
   * Extract image URL from an RSS item.
   * Tries: media:thumbnail, media:content, enclosure, then regex for <img> in content.
   */
  private extractImageUrl(item: CustomItem, htmlContent?: string | null): string | null {
    // Try media:thumbnail
    if (item.mediaThumbnail?.$?.url) {
      return item.mediaThumbnail.$.url;
    }

    // Try media:content
    if (Array.isArray(item.mediaContent)) {
      for (const media of item.mediaContent) {
        if (media.$?.url) {
          return media.$.url;
        }
      }
    }

    // Try enclosure
    if (item.enclosure) {
      const enclosures = Array.isArray(item.enclosure) ? item.enclosure : [item.enclosure];
      for (const enc of enclosures) {
        if (enc.$?.url && enc.$?.type?.startsWith('image/')) {
          return enc.$.url;
        }
      }
    }

    // Try regex for <img> tag in HTML content
    if (htmlContent) {
      const imgMatch = htmlContent.match(/<img[^>]+src=["']([^"']+)["']/i);
      if (imgMatch?.[1]) {
        return imgMatch[1];
      }
    }

    return null;
  }

  /** Strip HTML tags, decode common entities, and truncate to 500 chars. */
  private cleanDescription(html: string): string {
    if (!html) return '';

    let text = html
      // Remove HTML tags
      .replace(/<[^>]+>/g, '')
      // Decode common HTML entities
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/&#\d+;/g, '')
      // Collapse whitespace
      .replace(/\s+/g, ' ')
      .trim();

    if (text.length > 500) {
      text = text.substring(0, 497) + '...';
    }

    return text;
  }

  /** Start the background polling timer. Checks every 60 seconds. */
  private startPolling(): void {
    // Do an initial fetch shortly after startup (5 seconds delay)
    setTimeout(() => {
      this.pollDueFeeds().catch(error => {
        logger.error('Error during initial feed poll:', error);
      });
    }, 5000);

    this.pollingTimer = setInterval(() => {
      this.pollDueFeeds().catch(error => {
        logger.error('Error during feed poll:', error);
      });
    }, 60_000);

    logger.info('Feed polling started (60s interval)');
  }

  /** Find sources that are due for a refresh and fetch them. */
  private async pollDueFeeds(): Promise<void> {
    const db = this.databaseService.db;

    const dueSources = db
      .prepare(
        `SELECT * FROM feed_sources
         WHERE enabled = 1
           AND (
             last_fetched_at IS NULL
             OR (julianday('now') - julianday(last_fetched_at)) * 24 * 60 >= poll_interval_minutes
           )
         ORDER BY last_fetched_at ASC`
      )
      .all() as FeedSourceRow[];

    if (dueSources.length === 0) return;

    logger.debug(`${dueSources.length} feed source(s) due for refresh`);

    for (const source of dueSources) {
      try {
        await this.fetchFeed(source);
      } catch (error) {
        logger.error(`Error polling feed "${source.name}":`, error);
      }
    }
  }
}
