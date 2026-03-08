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
    logger.debug(`Searching anime: "${query}" (page ${page})`);
    try {
      const data = await this.anilistClient.query<SearchAnimeResponse>(SEARCH_ANIME_QUERY, {
        search: query,
        page,
        perPage,
      });
      return {
        media: data.Page.media,
        pageInfo: data.Page.pageInfo,
      };
    } catch (error) {
      logger.error(`Failed to search anime: ${extractErrorMessage(error)}`);
      throw error;
    }
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
      const data = await this.anilistClient.query<AiringScheduleResponse>(AIRING_SCHEDULE_QUERY, {
        airingAt_greater: airingAtGreater,
        airingAt_lesser: airingAtLesser,
        page,
        perPage,
      });
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
    logger.debug(`Fetching trending anime (page ${page})`);
    try {
      const data = await this.anilistClient.query<TrendingAnimeResponse>(TRENDING_ANIME_QUERY, {
        page,
        perPage,
      });
      return {
        media: data.Page.media,
        pageInfo: data.Page.pageInfo,
      };
    } catch (error) {
      logger.error(`Failed to fetch trending anime: ${extractErrorMessage(error)}`);
      throw error;
    }
  }

  /**
   * Get popular anime for the current season.
   * Automatically detects the current season and year.
   */
  async getPopularThisSeason(page = 1, perPage = DEFAULT_PER_PAGE): Promise<PaginatedMediaResult> {
    const season = getCurrentSeason();
    const seasonYear = new Date().getFullYear();

    logger.debug(`Fetching popular anime for ${season} ${seasonYear} (page ${page})`);

    try {
      const data = await this.anilistClient.query<PopularThisSeasonResponse>(
        POPULAR_THIS_SEASON_QUERY,
        { season, seasonYear, page, perPage }
      );
      return {
        media: data.Page.media,
        pageInfo: data.Page.pageInfo,
      };
    } catch (error) {
      logger.error(`Failed to fetch popular this season: ${extractErrorMessage(error)}`);
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
export function getCurrentSeason(): MediaSeason {
  const month = new Date().getMonth(); // 0-indexed
  if (month <= 2) return 'WINTER';
  if (month <= 5) return 'SPRING';
  if (month <= 8) return 'SUMMER';
  return 'FALL';
}
