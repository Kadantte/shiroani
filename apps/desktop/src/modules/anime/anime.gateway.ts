import { WebSocketGateway, SubscribeMessage, MessageBody } from '@nestjs/websockets';
import { UseGuards } from '@nestjs/common';
import { AnimeEvents, createLogger } from '@shiroani/shared';
import { CORS_CONFIG } from '../shared/cors.config';
import { WsThrottlerGuard } from '../shared/ws-throttler.guard';
import { handleGatewayRequest } from '../shared/gateway-handler';
import { AnimeService } from './anime.service';

const logger = createLogger('AnimeGateway');

const EMPTY_PAGE_INFO = { total: 0, currentPage: 1, lastPage: 1, hasNextPage: false };

@WebSocketGateway({ cors: CORS_CONFIG })
@UseGuards(WsThrottlerGuard)
export class AnimeGateway {
  constructor(private readonly animeService: AnimeService) {
    logger.info('AnimeGateway initialized');
  }

  @SubscribeMessage(AnimeEvents.SEARCH)
  async handleSearch(@MessageBody() payload: { query: string; page?: number }) {
    return handleGatewayRequest({
      logger,
      action: `anime:search — query="${payload.query}", page=${payload.page ?? 1}`,
      defaultResult: { results: [], pageInfo: EMPTY_PAGE_INFO },
      handler: async () => {
        const result = await this.animeService.searchAnime(payload.query, payload.page);
        return { results: result.media, pageInfo: result.pageInfo };
      },
    });
  }

  @SubscribeMessage(AnimeEvents.GET_DETAILS)
  async handleGetDetails(@MessageBody() payload: { anilistId: number }) {
    return handleGatewayRequest({
      logger,
      action: `anime:get-details — id=${payload.anilistId}`,
      defaultResult: { anime: null },
      handler: async () => {
        const anime = await this.animeService.getAnimeDetails(payload.anilistId);
        return { anime };
      },
    });
  }

  @SubscribeMessage(AnimeEvents.GET_AIRING)
  async handleGetAiring(
    @MessageBody() payload: { startDate: string; endDate: string; page?: number }
  ) {
    return handleGatewayRequest({
      logger,
      action: `anime:get-airing — ${payload.startDate} to ${payload.endDate}`,
      defaultResult: { airingSchedules: [], pageInfo: EMPTY_PAGE_INFO },
      handler: async () => {
        const startDate = new Date(payload.startDate);
        const endDate = new Date(payload.endDate);

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          return {
            airingSchedules: [],
            pageInfo: EMPTY_PAGE_INFO,
            error: 'Invalid date format. Use ISO 8601 strings.',
          };
        }

        const result = await this.animeService.getAiringSchedule(startDate, endDate, payload.page);
        return { airingSchedules: result.airingSchedules, pageInfo: result.pageInfo };
      },
    });
  }

  @SubscribeMessage(AnimeEvents.GET_TRENDING)
  async handleGetTrending(@MessageBody() payload: { page?: number }) {
    return handleGatewayRequest({
      logger,
      action: `anime:get-trending — page=${payload.page ?? 1}`,
      defaultResult: { results: [], pageInfo: EMPTY_PAGE_INFO },
      handler: async () => {
        const result = await this.animeService.getTrending(payload.page);
        return { results: result.media, pageInfo: result.pageInfo };
      },
    });
  }

  @SubscribeMessage(AnimeEvents.GET_POPULAR)
  async handleGetPopular(@MessageBody() payload: { page?: number }) {
    return handleGatewayRequest({
      logger,
      action: `anime:get-popular — page=${payload.page ?? 1}`,
      defaultResult: { results: [], pageInfo: EMPTY_PAGE_INFO },
      handler: async () => {
        const result = await this.animeService.getPopularThisSeason(payload.page);
        return { results: result.media, pageInfo: result.pageInfo };
      },
    });
  }

  @SubscribeMessage(AnimeEvents.GET_SEASONAL)
  async handleGetSeasonal(@MessageBody() payload: { year: number; season: string; page?: number }) {
    return handleGatewayRequest({
      logger,
      action: `anime:get-seasonal — ${payload.season} ${payload.year}`,
      defaultResult: { results: [], pageInfo: EMPTY_PAGE_INFO },
      handler: async () => {
        const result = await this.animeService.getSeasonalAnime(
          payload.year,
          payload.season,
          payload.page
        );
        return { results: result.media, pageInfo: result.pageInfo };
      },
    });
  }

  @SubscribeMessage(AnimeEvents.GET_USER_PROFILE)
  async handleGetUserProfile(@MessageBody() payload: { username: string }) {
    return handleGatewayRequest({
      logger,
      action: `anime:get-user-profile — username="${payload.username}"`,
      defaultResult: { profile: null },
      handler: async () => {
        const profile = await this.animeService.getUserProfile(payload.username);
        return { profile };
      },
    });
  }
}
