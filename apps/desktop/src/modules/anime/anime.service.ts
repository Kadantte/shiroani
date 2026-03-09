import { Injectable } from '@nestjs/common';
import { createLogger, extractErrorMessage } from '@shiroani/shared';
import { AniListClient } from './anilist-client';
import {
  SEARCH_ANIME_QUERY,
  ANIME_DETAILS_QUERY,
  AIRING_SCHEDULE_QUERY,
  TRENDING_ANIME_QUERY,
  POPULAR_THIS_SEASON_QUERY,
} from './queries';
import type {
  AniListMedia,
  AniListPageInfo,
  AniListAiringSchedule,
  MediaSeason,
  SearchAnimeResponse,
  AnimeDetailsResponse,
  AiringScheduleResponse,
  TrendingAnimeResponse,
  PopularThisSeasonResponse,
} from './types';

const logger = createLogger('AnimeService');

const DEFAULT_PER_PAGE = 20;

export interface PaginatedMediaResult {
  media: AniListMedia[];
  pageInfo: AniListPageInfo;
}

export interface PaginatedAiringResult {
  airingSchedules: AniListAiringSchedule[];
  pageInfo: AniListPageInfo;
}

@Injectable()
export class AnimeService {
  constructor(private readonly anilistClient: AniListClient) {
    logger.info('AnimeService initialized');
  }

  /**
   * Search anime by title with pagination.
   */
  async searchAnime(
    query: string,
    page = 1,
    perPage = DEFAULT_PER_PAGE
  ): Promise<PaginatedMediaResult> {
    return this.queryPagedMedia('Searching anime', SEARCH_ANIME_QUERY, {
      search: query,
      page,
      perPage,
    });
  }

  /**
   * Get full anime details by AniList ID.
   */
  async getAnimeDetails(id: number): Promise<AniListMedia> {
    logger.debug(`Fetching anime details for ID: ${id}`);
    try {
      const data = await this.anilistClient.query<AnimeDetailsResponse>(ANIME_DETAILS_QUERY, {
        id,
      });
      return data.Media;
    } catch (error) {
      logger.error(`Failed to fetch anime details for ID ${id}: ${extractErrorMessage(error)}`);
      throw error;
    }
  }

  /**
   * Get airing schedule for a date range.
   *
   * @param startDate - Start of the range
   * @param endDate - End of the range
   * @param page - Page number (default 1)
   * @param perPage - Items per page (default 20)
   */
  async getAiringSchedule(
    startDate: Date,
    endDate: Date,
    page = 1,
    perPage = DEFAULT_PER_PAGE
  ): Promise<PaginatedAiringResult> {
    const airingAtGreater = Math.floor(startDate.getTime() / 1000);
    const airingAtLesser = Math.floor(endDate.getTime() / 1000);

    logger.debug(
      `Fetching airing schedule: ${startDate.toISOString()} to ${endDate.toISOString()} (page ${page})`
    );

    try {
      const cacheKey = `airing:${airingAtGreater}:${airingAtLesser}:${page}`;
      const data = await this.anilistClient.cachedQuery<AiringScheduleResponse>(
        cacheKey,
        AIRING_SCHEDULE_QUERY,
        {
          airingAt_greater: airingAtGreater,
          airingAt_lesser: airingAtLesser,
          page,
          perPage,
        }
      );
      return {
        airingSchedules: data.Page.airingSchedules,
        pageInfo: data.Page.pageInfo,
      };
    } catch (error) {
      logger.error(`Failed to fetch airing schedule: ${extractErrorMessage(error)}`);
      throw error;
    }
  }

  /**
   * Get currently trending anime with pagination.
   */
  async getTrending(page = 1, perPage = DEFAULT_PER_PAGE): Promise<PaginatedMediaResult> {
    return this.queryPagedMedia(
      'Fetching trending anime',
      TRENDING_ANIME_QUERY,
      {
        page,
        perPage,
      },
      `trending:${page}`
    );
  }

  /**
   * Get popular anime for the current season.
   * Automatically detects the current season and year.
   */
  async getPopularThisSeason(page = 1, perPage = DEFAULT_PER_PAGE): Promise<PaginatedMediaResult> {
    const season = getCurrentSeason();
    const seasonYear = new Date().getFullYear();

    return this.queryPagedMedia(
      `Fetching popular anime for ${season} ${seasonYear}`,
      POPULAR_THIS_SEASON_QUERY,
      { season, seasonYear, page, perPage },
      `popular:${season}:${seasonYear}:${page}`
    );
  }

  /**
   * Get anime for a specific season and year.
   */
  async getSeasonalAnime(
    year: number,
    season: string,
    page = 1,
    perPage = DEFAULT_PER_PAGE
  ): Promise<PaginatedMediaResult> {
    return this.queryPagedMedia(
      `Fetching seasonal anime for ${season} ${year}`,
      POPULAR_THIS_SEASON_QUERY,
      { season: season.toUpperCase(), seasonYear: year, page, perPage },
      `seasonal:${season.toUpperCase()}:${year}:${page}`
    );
  }

  /**
   * Execute a paged media query against AniList and extract media + pageInfo.
   * Centralizes the common log/try/query/extract/catch pattern.
   */
  private async queryPagedMedia(
    description: string,
    query: string,
    variables: Record<string, unknown>,
    cacheKey?: string
  ): Promise<PaginatedMediaResult> {
    const page = (variables.page as number) ?? 1;
    logger.debug(`${description} (page ${page})`);

    type PagedResponse = TrendingAnimeResponse | PopularThisSeasonResponse | SearchAnimeResponse;

    try {
      const data = cacheKey
        ? await this.anilistClient.cachedQuery<PagedResponse>(cacheKey, query, variables)
        : await this.anilistClient.query<PagedResponse>(query, variables);
      return {
        media: data.Page.media,
        pageInfo: data.Page.pageInfo,
      };
    } catch (error) {
      logger.error(`Failed: ${description}: ${extractErrorMessage(error)}`);
      throw error;
    }
  }
}

/**
 * Determine the current anime season based on the current month.
 *
 * - WINTER: January, February, March
 * - SPRING: April, May, June
 * - SUMMER: July, August, September
 * - FALL: October, November, December
 */
function getCurrentSeason(): MediaSeason {
  const month = new Date().getMonth(); // 0-indexed
  if (month <= 2) return 'WINTER';
  if (month <= 5) return 'SPRING';
  if (month <= 8) return 'SUMMER';
  return 'FALL';
}
