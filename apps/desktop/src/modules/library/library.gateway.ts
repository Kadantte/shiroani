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
  extractErrorMessage,
  LibraryEvents,
  type AnimeStatus,
  type LibraryAddPayload,
  type LibraryUpdatePayload,
} from '@shiroani/shared';
import { CORS_CONFIG } from '../shared/cors.config';
import { WsThrottlerGuard } from '../shared/ws-throttler.guard';
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
    try {
      logger.debug('library:get-all received', payload);
      const entries = this.libraryService.getAllEntries(payload?.status);
      return { entries, error: undefined };
    } catch (error) {
      const message = extractErrorMessage(error);
      logger.error('Failed to get library entries', message);
      return { entries: [], error: message };
    }
  }

  @SubscribeMessage(LibraryEvents.ADD)
  handleAdd(@MessageBody() payload: LibraryAddPayload) {
    try {
      logger.debug('library:add received', payload);
      const entry = this.libraryService.addEntry(payload);
      this.server.emit(LibraryEvents.UPDATED, { entry, action: 'added' });
      return { entry, error: undefined };
    } catch (error) {
      const message = extractErrorMessage(error);
      logger.error('Failed to add library entry', message);
      return { entry: null, error: message };
    }
  }

  @SubscribeMessage(LibraryEvents.UPDATE)
  handleUpdate(@MessageBody() payload: LibraryUpdatePayload) {
    try {
      logger.debug('library:update received', payload);
      const { id, ...updates } = payload;
      const entry = this.libraryService.updateEntry(id, updates);
      if (!entry) {
        return { entry: null, error: `Entry with id ${id} not found` };
      }
      this.server.emit(LibraryEvents.UPDATED, { entry, action: 'updated' });
      return { entry, error: undefined };
    } catch (error) {
      const message = extractErrorMessage(error);
      logger.error('Failed to update library entry', message);
      return { entry: null, error: message };
    }
  }

  @SubscribeMessage(LibraryEvents.REMOVE)
  handleRemove(@MessageBody() payload: { id: number }) {
    try {
      logger.debug('library:remove received', payload);
      const deleted = this.libraryService.removeEntry(payload.id);
      if (!deleted) {
        return { success: false, error: `Entry with id ${payload.id} not found` };
      }
      this.server.emit(LibraryEvents.UPDATED, { id: payload.id, action: 'removed' });
      return { success: true, error: undefined };
    } catch (error) {
      const message = extractErrorMessage(error);
      logger.error('Failed to remove library entry', message);
      return { success: false, error: message };
    }
  }
}
