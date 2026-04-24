import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { UseGuards } from '@nestjs/common';
import { Socket } from 'socket.io';
import {
  createLogger,
  ScheduleEvents,
  scheduleGetDailyPayloadSchema,
  scheduleGetWeeklyPayloadSchema,
} from '@shiroani/shared';
import { CORS_CONFIG } from '../kernel/cors.config';
import { WsThrottlerGuard } from '../kernel/ws-throttler.guard';
import { handleGatewayRequest } from '../kernel/gateway-handler';
import { ScheduleService } from './schedule.service';

const logger = createLogger('ScheduleGateway');

@WebSocketGateway({ cors: CORS_CONFIG })
@UseGuards(WsThrottlerGuard)
export class ScheduleGateway {
  constructor(private readonly scheduleService: ScheduleService) {
    logger.info('ScheduleGateway initialized');
  }

  @SubscribeMessage(ScheduleEvents.GET_DAILY)
  async handleGetDaily(@MessageBody() payload: unknown, @ConnectedSocket() client: Socket) {
    return handleGatewayRequest({
      logger,
      action: ScheduleEvents.GET_DAILY,
      defaultResult: { date: '', entries: [] },
      schema: scheduleGetDailyPayloadSchema,
      payload,
      handler: async parsed => {
        const result = await this.scheduleService.getDaily(parsed.date);
        client.emit(ScheduleEvents.DAILY_RESULT, result);
        return result;
      },
    });
  }

  @SubscribeMessage(ScheduleEvents.GET_WEEKLY)
  async handleGetWeekly(@MessageBody() payload: unknown, @ConnectedSocket() client: Socket) {
    return handleGatewayRequest({
      logger,
      action: ScheduleEvents.GET_WEEKLY,
      defaultResult: { schedule: {} },
      schema: scheduleGetWeeklyPayloadSchema,
      payload,
      handler: async parsed => {
        const result = await this.scheduleService.getWeekly(parsed.startDate);
        client.emit(ScheduleEvents.WEEKLY_RESULT, result);
        return result;
      },
    });
  }
}
