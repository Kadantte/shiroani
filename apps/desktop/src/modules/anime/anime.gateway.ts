import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
} from '@nestjs/websockets';
import { UseGuards } from '@nestjs/common';
import { Server } from 'socket.io';
import { AnimeEvents, createLogger, extractErrorMessage } from '@shiroani/shared';
import { CORS_CONFIG } from '../shared/cors.config';
import { WsThrottlerGuard } from '../shared/ws-throttler.guard';
import { AnimeService } from './anime.service';

const logger = createLogger('AnimeGateway');

@WebSocketGateway({ cors: CORS_CONFIG })
@UseGuards(WsThrottlerGuard)
export class AnimeGateway {
  @WebSocketServer()
  server!: Server;

  constructor(private readonly animeService: AnimeService) {
    logger.info('AnimeGateway initialized');
  }

  @SubscribeMessage(AnimeEvents.SEARCH)
  async handleSearch(@MessageBody() payload: { query: string; page?: number }) {
    logger.debug(`anime:search received — query="${payload.query}", page=${payload.page ?? 1}`);
    try {
      const result = await this.animeService.searchAnime(payload.query, payload.page);
      return { results: result.media, pageInfo: result.pageInfo };
    } catch (error) {
      logger.error(`anime:search failed: ${extractErrorMessage(error)}`);
      return {
        results: [],
        pageInfo: { total: 0, currentPage: 1, lastPage: 1, hasNextPage: false },
        error: extractErrorMessage(error),
      };
    }
  }

  @SubscribeMessage(AnimeEvents.GET_DETAILS)
  async handleGetDetails(@MessageBody() payload: { anilistId: number }) {
    logger.debug(`anime:get-details received — id=${payload.anilistId}`);
    try {
      const anime = await this.animeService.getAnimeDetails(payload.anilistId);
      return { anime };
    } catch (error) {
      logger.error(`anime:get-details failed: ${extractErrorMessage(error)}`);
      return { anime: null, error: extractErrorMessage(error) };
    }
  }

  @SubscribeMessage(AnimeEvents.GET_AIRING)
  async handleGetAiring(
    @MessageBody() payload: { startDate: string; endDate: string; page?: number }
  ) {
    logger.debug(`anime:get-airing received — ${payload.startDate} to ${payload.endDate}`);
    try {
      const startDate = new Date(payload.startDate);
      const endDate = new Date(payload.endDate);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return {
          airingSchedules: [],
          pageInfo: { total: 0, currentPage: 1, lastPage: 1, hasNextPage: false },
          error: 'Invalid date format. Use ISO 8601 strings.',
        };
      }

      const result = await this.animeService.getAiringSchedule(startDate, endDate, payload.page);
      return { airingSchedules: result.airingSchedules, pageInfo: result.pageInfo };
    } catch (error) {
      logger.error(`anime:get-airing failed: ${extractErrorMessage(error)}`);
      return {
        airingSchedules: [],
        pageInfo: { total: 0, currentPage: 1, lastPage: 1, hasNextPage: false },
        error: extractErrorMessage(error),
      };
    }
  }

  @SubscribeMessage('anime:get-trending')
  async handleGetTrending(@MessageBody() payload: { page?: number }) {
    logger.debug(`anime:get-trending received — page=${payload.page ?? 1}`);
    try {
      const result = await this.animeService.getTrending(payload.page);
      return { results: result.media, pageInfo: result.pageInfo };
    } catch (error) {
      logger.error(`anime:get-trending failed: ${extractErrorMessage(error)}`);
      return {
        results: [],
        pageInfo: { total: 0, currentPage: 1, lastPage: 1, hasNextPage: false },
        error: extractErrorMessage(error),
      };
    }
  }

  @SubscribeMessage('anime:get-popular')
  async handleGetPopular(@MessageBody() payload: { page?: number }) {
    logger.debug(`anime:get-popular received — page=${payload.page ?? 1}`);
    try {
      const result = await this.animeService.getPopularThisSeason(payload.page);
      return { results: result.media, pageInfo: result.pageInfo };
    } catch (error) {
      logger.error(`anime:get-popular failed: ${extractErrorMessage(error)}`);
      return {
        results: [],
        pageInfo: { total: 0, currentPage: 1, lastPage: 1, hasNextPage: false },
        error: extractErrorMessage(error),
      };
    }
  }

  @SubscribeMessage('anime:get-seasonal')
  async handleGetSeasonal(@MessageBody() payload: { year: number; season: string; page?: number }) {
    logger.debug(`anime:get-seasonal received — ${payload.season} ${payload.year}`);
    try {
      const result = await this.animeService.getPopularThisSeason(payload.page);
      return { results: result.media, pageInfo: result.pageInfo };
    } catch (error) {
      logger.error(`anime:get-seasonal failed: ${extractErrorMessage(error)}`);
      return {
        results: [],
        pageInfo: { total: 0, currentPage: 1, lastPage: 1, hasNextPage: false },
        error: extractErrorMessage(error),
      };
    }
  }
}
