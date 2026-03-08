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
import { BrowserService } from './browser.service';

const logger = createLogger('BrowserGateway');

@WebSocketGateway({ cors: CORS_CONFIG })
@UseGuards(WsThrottlerGuard)
export class BrowserGateway {
  @WebSocketServer()
  server!: Server;

  constructor(private readonly browserService: BrowserService) {
    logger.info('BrowserGateway initialized');
    void this.browserService;
  }

  @SubscribeMessage('browser:get-tabs')
  async handleGetTabs() {
    // TODO: Return all active tabs with their current state
    logger.debug('browser:get-tabs received');
    return { tabs: [] };
  }

  @SubscribeMessage('browser:get-tab')
  async handleGetTab(@MessageBody() _payload: { tabId: string }) {
    // TODO: Return tab info (url, title, loading, canGoBack, canGoForward)
    logger.debug('browser:get-tab received');
    return { tab: null, error: 'Not implemented' };
  }

  // NOTE: Most browser operations (open, close, navigate, etc.) are handled
  // via IPC rather than WebSocket because they require direct access to
  // Electron's WebContentsView API in the main process.
  // The gateway primarily listens for internal events and broadcasts
  // state changes to the renderer.
}
