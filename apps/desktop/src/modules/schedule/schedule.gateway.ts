import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { UseGuards } from '@nestjs/common';
import { Socket } from 'socket.io';
import { createLogger, ScheduleEvents, extractErrorMessage } from '@shiroani/shared';
import { CORS_CONFIG } from '../shared/cors.config';
import { WsThrottlerGuard } from '../shared/ws-throttler.guard';
import { ScheduleService } from './schedule.service';

const logger = createLogger('ScheduleGateway');

@WebSocketGateway({ cors: CORS_CONFIG })
@UseGuards(WsThrottlerGuard)
export class ScheduleGateway {
  constructor(private readonly scheduleService: ScheduleService) {
    logger.info('ScheduleGateway initialized');
  }

  @SubscribeMessage(ScheduleEvents.GET_DAILY)
  async handleGetDaily(
    @MessageBody() payload: { date: string },
    @ConnectedSocket() client: Socket
  ) {
    logger.debug(`${ScheduleEvents.GET_DAILY} received for date: ${payload.date}`);
    try {
      const result = await this.scheduleService.getDaily(payload.date);
      client.emit(ScheduleEvents.DAILY_RESULT, result);
      return result;
    } catch (error) {
      logger.error(`Failed to get daily schedule: ${extractErrorMessage(error)}`);
      return { date: payload.date, entries: [], error: extractErrorMessage(error) };
    }
  }

  @SubscribeMessage(ScheduleEvents.GET_WEEKLY)
  async handleGetWeekly(
    @MessageBody() payload: { startDate: string },
    @ConnectedSocket() client: Socket
  ) {
    logger.debug(`${ScheduleEvents.GET_WEEKLY} received from: ${payload.startDate}`);
    try {
      const result = await this.scheduleService.getWeekly(payload.startDate);
      client.emit(ScheduleEvents.WEEKLY_RESULT, result);
      return result;
    } catch (error) {
      logger.error(`Failed to get weekly schedule: ${extractErrorMessage(error)}`);
      return { schedule: {}, error: extractErrorMessage(error) };
    }
  }
}
