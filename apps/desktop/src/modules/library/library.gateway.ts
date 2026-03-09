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
  LibraryEvents,
  type AnimeStatus,
  type LibraryAddPayload,
  type LibraryUpdatePayload,
} from '@shiroani/shared';
import { CORS_CONFIG } from '../shared/cors.config';
import { WsThrottlerGuard } from '../shared/ws-throttler.guard';
import { handleGatewayRequest } from '../shared/gateway-handler';
import { LibraryService } from './library.service';

const logger = createLogger('LibraryGateway');

@WebSocketGateway({ cors: CORS_CONFIG })
@UseGuards(WsThrottlerGuard)
export class LibraryGateway {
  @WebSocketServer()
  server!: Server;

  constructor(private readonly libraryService: LibraryService) {
    logger.info('LibraryGateway initialized');
  }

  @SubscribeMessage(LibraryEvents.GET_ALL)
  handleGetAll(@MessageBody() payload: { status?: AnimeStatus }) {
    return handleGatewayRequest({
      logger,
      action: 'library:get-all',
      defaultResult: { entries: [] },
      handler: async () => {
        const entries = this.libraryService.getAllEntries(payload?.status);
        return { entries };
      },
    });
  }

  @SubscribeMessage(LibraryEvents.ADD)
  handleAdd(@MessageBody() payload: LibraryAddPayload) {
    return handleGatewayRequest({
      logger,
      action: 'library:add',
      defaultResult: { entry: null },
      handler: async () => {
        const entry = this.libraryService.addEntry(payload);
        this.server.emit(LibraryEvents.UPDATED, { entry, action: 'added' });
        return { entry };
      },
    });
  }

  @SubscribeMessage(LibraryEvents.UPDATE)
  handleUpdate(@MessageBody() payload: LibraryUpdatePayload) {
    return handleGatewayRequest({
      logger,
      action: 'library:update',
      defaultResult: { entry: null },
      handler: async () => {
        const { id, ...updates } = payload;
        const entry = this.libraryService.updateEntry(id, updates);
        if (!entry) {
          return { entry: null, error: `Entry with id ${id} not found` };
        }
        this.server.emit(LibraryEvents.UPDATED, { entry, action: 'updated' });
        return { entry };
      },
    });
  }

  @SubscribeMessage(LibraryEvents.GET_STATS)
  handleGetStats() {
    return handleGatewayRequest({
      logger,
      action: 'library:get-stats',
      defaultResult: { stats: null },
      handler: async () => {
        const stats = this.libraryService.getStats();
        return { stats };
      },
    });
  }

  @SubscribeMessage(LibraryEvents.REMOVE)
  handleRemove(@MessageBody() payload: { id: number }) {
    return handleGatewayRequest({
      logger,
      action: 'library:remove',
      defaultResult: { success: false },
      handler: async () => {
        const deleted = this.libraryService.removeEntry(payload.id);
        if (!deleted) {
          return { success: false, error: `Entry with id ${payload.id} not found` };
        }
        this.server.emit(LibraryEvents.UPDATED, { id: payload.id, action: 'removed' });
        return { success: true };
      },
    });
  }
}
