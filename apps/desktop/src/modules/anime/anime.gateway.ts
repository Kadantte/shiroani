import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
} from '@nestjs/websockets';
import { UseGuards } from '@nestjs/common';
import { Server } from 'socket.io';
import { createLogger } from '@shiroani/shared';
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
    void this.animeService;
  }

  // TODO: Implement WebSocket event handlers

  @SubscribeMessage('anime:search')
  async handleSearch(@MessageBody() _payload: { query: string; page?: number }) {
    // TODO: Call animeService.searchAnime() and return results
    logger.debug('anime:search received');
    return { results: [], pageInfo: { total: 0, currentPage: 1, hasNextPage: false } };
  }

  @SubscribeMessage('anime:get-details')
  async handleGetDetails(@MessageBody() _payload: { anilistId: number }) {
    // TODO: Call animeService.getAnimeById() and return details
    logger.debug('anime:get-details received');
    return { anime: null, error: 'Not implemented' };
  }

  @SubscribeMessage('anime:get-trending')
  async handleGetTrending(@MessageBody() _payload: { page?: number }) {
    // TODO: Call animeService.getTrendingAnime() and return results
    logger.debug('anime:get-trending received');
    return { results: [], pageInfo: { total: 0, currentPage: 1, hasNextPage: false } };
  }

  @SubscribeMessage('anime:get-popular')
  async handleGetPopular(@MessageBody() _payload: { page?: number }) {
    // TODO: Call animeService.getPopularAnime() and return results
    logger.debug('anime:get-popular received');
    return { results: [], pageInfo: { total: 0, currentPage: 1, hasNextPage: false } };
  }

  @SubscribeMessage('anime:get-seasonal')
  async handleGetSeasonal(@MessageBody() _payload: { year: number; season: string }) {
    // TODO: Call animeService.getSeasonalAnime() and return results
    logger.debug('anime:get-seasonal received');
    return { results: [], pageInfo: { total: 0, currentPage: 1, hasNextPage: false } };
  }
}
