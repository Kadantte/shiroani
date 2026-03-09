import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
} from '@nestjs/websockets';
import { UseGuards } from '@nestjs/common';
import { Server } from 'socket.io';
import {
  createLogger,
  DiaryEvents,
  type DiaryCreatePayload,
  type DiaryUpdatePayload,
} from '@shiroani/shared';
import { CORS_CONFIG } from '../shared/cors.config';
import { WsThrottlerGuard } from '../shared/ws-throttler.guard';
import { handleGatewayRequest } from '../shared/gateway-handler';
import { DiaryService } from './diary.service';

const logger = createLogger('DiaryGateway');

@WebSocketGateway({ cors: CORS_CONFIG })
@UseGuards(WsThrottlerGuard)
export class DiaryGateway {
  @WebSocketServer()
  server!: Server;

  constructor(private readonly diaryService: DiaryService) {
    logger.info('DiaryGateway initialized');
  }

  @SubscribeMessage(DiaryEvents.GET_ALL)
  handleGetAll() {
    return handleGatewayRequest({
      logger,
      action: 'diary:get-all',
      defaultResult: { entries: [] },
      handler: async () => {
        const entries = this.diaryService.getAllEntries();
        return { entries };
      },
    });
  }

  @SubscribeMessage(DiaryEvents.CREATE)
  handleCreate(@MessageBody() payload: DiaryCreatePayload) {
    return handleGatewayRequest({
      logger,
      action: 'diary:create',
      defaultResult: { entry: null },
      handler: async () => {
        const entry = this.diaryService.createEntry(payload);
        this.server.emit(DiaryEvents.UPDATED, { entry, action: 'created' });
        return { entry };
      },
    });
  }

  @SubscribeMessage(DiaryEvents.UPDATE)
  handleUpdate(@MessageBody() payload: DiaryUpdatePayload) {
    return handleGatewayRequest({
      logger,
      action: 'diary:update',
      defaultResult: { entry: null },
      handler: async () => {
        const { id, ...updates } = payload;
        const entry = this.diaryService.updateEntry(id, updates);
        if (!entry) {
          return { entry: null, error: `Entry with id ${id} not found` };
        }
        this.server.emit(DiaryEvents.UPDATED, { entry, action: 'updated' });
        return { entry };
      },
    });
  }

  @SubscribeMessage(DiaryEvents.REMOVE)
  handleRemove(@MessageBody() payload: { id: number }) {
    return handleGatewayRequest({
      logger,
      action: 'diary:remove',
      defaultResult: { success: false },
      handler: async () => {
        const deleted = this.diaryService.removeEntry(payload.id);
        if (!deleted) {
          return { success: false, error: `Entry with id ${payload.id} not found` };
        }
        this.server.emit(DiaryEvents.UPDATED, { id: payload.id, action: 'removed' });
        return { success: true };
      },
    });
  }
}
