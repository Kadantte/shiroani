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
  FeedEvents,
  type FeedGetItemsPayload,
  type FeedToggleSourcePayload,
} from '@shiroani/shared';
import { CORS_CONFIG } from '../shared/cors.config';
import { WsThrottlerGuard } from '../shared/ws-throttler.guard';
import { handleGatewayRequest } from '../shared/gateway-handler';
import { FeedService } from './feed.service';

const logger = createLogger('FeedGateway');

@WebSocketGateway({ cors: CORS_CONFIG })
@UseGuards(WsThrottlerGuard)
export class FeedGateway {
  @WebSocketServer()
  server!: Server;

  constructor(private readonly feedService: FeedService) {
    logger.info('FeedGateway initialized');
  }

  @SubscribeMessage(FeedEvents.GET_ITEMS)
  handleGetItems(@MessageBody() payload: FeedGetItemsPayload) {
    return handleGatewayRequest({
      logger,
      action: 'feed:get-items',
      defaultResult: { items: [], total: 0, hasMore: false },
      handler: async () => {
        return this.feedService.getItems(payload);
      },
    });
  }

  @SubscribeMessage(FeedEvents.GET_SOURCES)
  handleGetSources() {
    return handleGatewayRequest({
      logger,
      action: 'feed:get-sources',
      defaultResult: { sources: [] },
      handler: async () => {
        const sources = this.feedService.getAllSources();
        return { sources };
      },
    });
  }

  @SubscribeMessage(FeedEvents.TOGGLE_SOURCE)
  handleToggleSource(@MessageBody() payload: FeedToggleSourcePayload) {
    return handleGatewayRequest({
      logger,
      action: 'feed:toggle-source',
      defaultResult: { sources: [] },
      handler: async () => {
        this.feedService.toggleSource(payload.id, payload.enabled);
        const sources = this.feedService.getAllSources();
        this.server.emit(FeedEvents.SOURCES_RESULT, { sources });
        return { sources };
      },
    });
  }

  @SubscribeMessage(FeedEvents.REFRESH)
  handleRefresh() {
    logger.debug('feed:refresh — starting background refresh');

    // Fire-and-forget: return immediately so the client socket doesn't time out,
    // then broadcast NEW_ITEMS when all sources have been fetched.
    this.feedService
      .refreshAllFeeds()
      .then(newItemsCount => {
        this.server.emit(FeedEvents.NEW_ITEMS, { newItemsCount });
      })
      .catch(err => {
        logger.error('Background feed refresh failed:', err);
        this.server.emit(FeedEvents.NEW_ITEMS, { newItemsCount: 0 });
      });

    return { started: true };
  }
}
