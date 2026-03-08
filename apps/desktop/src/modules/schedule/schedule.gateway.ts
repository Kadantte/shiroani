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
import { ScheduleService } from './schedule.service';

const logger = createLogger('ScheduleGateway');

@WebSocketGateway({ cors: CORS_CONFIG })
@UseGuards(WsThrottlerGuard)
export class ScheduleGateway {
  @WebSocketServer()
  server!: Server;

  constructor(private readonly scheduleService: ScheduleService) {
    logger.info('ScheduleGateway initialized');
    void this.scheduleService;
  }

  @SubscribeMessage('schedule:get-airing')
  async handleGetAiring(@MessageBody() _payload: { page?: number; perPage?: number }) {
    // TODO: Call scheduleService.getAiringSchedule() and return results
    logger.debug('schedule:get-airing received');
    return { schedule: [], pageInfo: { total: 0, currentPage: 1, hasNextPage: false } };
  }

  @SubscribeMessage('schedule:get-today')
  async handleGetToday() {
    // TODO: Call scheduleService.getAiringToday() and return results
    logger.debug('schedule:get-today received');
    return { schedule: [] };
  }

  @SubscribeMessage('schedule:get-week')
  async handleGetWeek() {
    // TODO: Call scheduleService.getAiringThisWeek() and return results
    logger.debug('schedule:get-week received');
    return { schedule: [] };
  }

  @SubscribeMessage('schedule:get-next-airing')
  async handleGetNextAiring(@MessageBody() _payload: { anilistId: number }) {
    // TODO: Call scheduleService.getNextAiring(payload.anilistId) and return result
    logger.debug('schedule:get-next-airing received');
    return { nextAiring: null, error: 'Not implemented' };
  }

  @SubscribeMessage('schedule:get-upcoming-library')
  async handleGetUpcomingLibrary(@MessageBody() _payload: { anilistIds: number[] }) {
    // TODO: Call scheduleService.getUpcomingForLibrary(payload.anilistIds)
    logger.debug('schedule:get-upcoming-library received');
    return { upcoming: [] };
  }
}
