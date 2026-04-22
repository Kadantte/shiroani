import { Injectable } from '@nestjs/common';
import { createLogger } from '@shiroani/shared';
import { FeedParserService, type ParsedFeedItem } from './feed-parser.service';

const logger = createLogger('FeedCacheService');

interface CacheEntry {
  items: ParsedFeedItem[];
  expiresAt: number;
}

/**
 * Minimal in-memory TTL cache for parsed feeds.
 *
 * Wraps {@link FeedParserService.parse} with a per-URL TTL so repeated
 * refreshes of the same feed within the TTL window avoid a second HTTP round
 * trip. This is intentionally tiny — no LRU, no persistence, no revalidation.
 */
@Injectable()
export class FeedCacheService {
  private readonly cache = new Map<string, CacheEntry>();

  constructor(private readonly parser: FeedParserService) {
    logger.info('FeedCacheService initialized');
  }

  /** Fetch a feed through the cache. Falls through to the parser on miss or expiry. */
  async fetch(feedUrl: string, ttlMs = 60_000): Promise<ParsedFeedItem[]> {
    const now = Date.now();
    const entry = this.cache.get(feedUrl);
    if (entry && entry.expiresAt > now) {
      return entry.items;
    }

    const items = await this.parser.parse(feedUrl);
    this.cache.set(feedUrl, { items, expiresAt: now + ttlMs });
    return items;
  }

  /** Drop a single URL's cached entry. */
  invalidate(feedUrl: string): void {
    this.cache.delete(feedUrl);
  }

  /** Drop every cached entry. */
  invalidateAll(): void {
    this.cache.clear();
  }
}
