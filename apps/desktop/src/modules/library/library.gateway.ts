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
import { LibraryService } from './library.service';

const logger = createLogger('LibraryGateway');

@WebSocketGateway({ cors: CORS_CONFIG })
@UseGuards(WsThrottlerGuard)
export class LibraryGateway {
  @WebSocketServer()
  server!: Server;

  constructor(private readonly libraryService: LibraryService) {
    logger.info('LibraryGateway initialized');
    void this.libraryService;
  }

  @SubscribeMessage('library:get-all')
  async handleGetAll(@MessageBody() _payload: { status?: string }) {
    // TODO: Call libraryService.getLibrary(payload.status) and return entries
    logger.debug('library:get-all received');
    return { entries: [], error: undefined };
  }

  @SubscribeMessage('library:get-entry')
  async handleGetEntry(@MessageBody() _payload: { anilistId: number }) {
    // TODO: Call libraryService.getEntry(payload.anilistId) and return entry
    logger.debug('library:get-entry received');
    return { entry: null, error: 'Not implemented' };
  }

  @SubscribeMessage('library:add')
  async handleAdd(
    @MessageBody()
    _payload: {
      anilistId: number;
      title: string;
      coverImage?: string;
      status?: string;
    }
  ) {
    // TODO: Call libraryService.addToLibrary(payload) and return result
    logger.debug('library:add received');
    return { success: false, error: 'Not implemented' };
  }

  @SubscribeMessage('library:remove')
  async handleRemove(@MessageBody() _payload: { anilistId: number }) {
    // TODO: Call libraryService.removeFromLibrary(payload.anilistId)
    logger.debug('library:remove received');
    return { success: false, error: 'Not implemented' };
  }

  @SubscribeMessage('library:update-progress')
  async handleUpdateProgress(@MessageBody() _payload: { anilistId: number; episode: number }) {
    // TODO: Call libraryService.updateProgress(payload.anilistId, payload.episode)
    logger.debug('library:update-progress received');
    return { success: false, error: 'Not implemented' };
  }

  @SubscribeMessage('library:update-status')
  async handleUpdateStatus(@MessageBody() _payload: { anilistId: number; status: string }) {
    // TODO: Call libraryService.updateStatus(payload.anilistId, payload.status)
    logger.debug('library:update-status received');
    return { success: false, error: 'Not implemented' };
  }

  @SubscribeMessage('library:update-score')
  async handleUpdateScore(@MessageBody() _payload: { anilistId: number; score: number }) {
    // TODO: Call libraryService.updateScore(payload.anilistId, payload.score)
    logger.debug('library:update-score received');
    return { success: false, error: 'Not implemented' };
  }

  @SubscribeMessage('library:search')
  async handleSearch(@MessageBody() _payload: { query: string }) {
    // TODO: Call libraryService.searchLibrary(payload.query)
    logger.debug('library:search received');
    return { entries: [], error: undefined };
  }
}
