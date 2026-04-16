import { Injectable } from '@nestjs/common';
import { createLogger, extractErrorMessage, type AniListSearchHit } from '@shiroani/shared';
import { AniListClient } from '../anime';

const logger = createLogger('AniListSearchService');

/**
 * GraphQL query tailored for the poster picker: returns the largest cover
 * image + bannerImage along with the handful of metadata fields the dialog
 * uses to help the user disambiguate search hits.
 *
 * Kept here rather than in the shared `anime/queries.ts` because:
 *  - the existing SEARCH_ANIME_QUERY only requests coverImage.{large,medium}
 *    and including `extraLarge` (which is a ~2x size) for the generic
 *    search pages would waste bandwidth for callers that don't render it.
 *  - the shape of the result is different (no pagination; we only show 10).
 */
const POSTER_SEARCH_QUERY = `
query PosterSearch($search: String!) {
  Page(page: 1, perPage: 10) {
    media(search: $search, type: ANIME, sort: SEARCH_MATCH) {
      id
      title { romaji english native }
      seasonYear
      format
      coverImage { extraLarge large }
      bannerImage
      episodes
      description(asHtml: false)
    }
  }
}
`;

interface PosterSearchResponse {
  Page: {
    media: Array<{
      id: number;
      title: { romaji: string | null; english: string | null; native: string | null };
      seasonYear: number | null;
      format: string | null;
      coverImage: { extraLarge: string | null; large: string | null };
      bannerImage: string | null;
      episodes: number | null;
      description: string | null;
    }>;
  };
}

/**
 * Thin wrapper over the AniList client used exclusively by the poster picker.
 * Reuses the same shared `AniListClient` instance as the rest of the app so
 * retry + cache behaviour is consistent.
 */
@Injectable()
export class AniListSearchService {
  constructor(private readonly anilistClient: AniListClient) {
    logger.info('AniListSearchService initialized');
  }

  /**
   * Search AniList for candidates to use as artwork for a local series.
   * Returns up to 10 hits sorted by AniList's relevance score.
   */
  async searchForArtwork(query: string): Promise<AniListSearchHit[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];

    logger.debug(`Searching AniList for artwork with query="${trimmed}"`);

    try {
      const cacheKey = `poster-search:${trimmed.toLowerCase()}`;
      const data = await this.anilistClient.cachedQuery<PosterSearchResponse>(
        cacheKey,
        POSTER_SEARCH_QUERY,
        { search: trimmed }
      );

      return data.Page.media.map(m => ({
        anilistId: m.id,
        titleRomaji: m.title.romaji ?? null,
        titleEnglish: m.title.english ?? null,
        titleNative: m.title.native ?? null,
        seasonYear: m.seasonYear ?? null,
        format: m.format ?? null,
        coverImageUrl: m.coverImage.extraLarge ?? m.coverImage.large ?? null,
        bannerImageUrl: m.bannerImage ?? null,
        episodes: m.episodes ?? null,
        synopsis: m.description ?? null,
      }));
    } catch (error) {
      const message = extractErrorMessage(error, 'AniList search failed');
      logger.error(`Poster search failed for "${trimmed}": ${message}`);
      throw error;
    }
  }
}
