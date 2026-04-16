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
  LocalLibraryEvents,
  type LocalLibraryAddRootPayload,
  type LocalLibraryRemoveRootPayload,
  type LocalLibraryListSeriesPayload,
} from '@shiroani/shared';
import { CORS_CONFIG } from '../shared/cors.config';
import { WsThrottlerGuard } from '../shared/ws-throttler.guard';
import { handleGatewayRequest } from '../shared/gateway-handler';
import { LocalLibraryService } from './local-library.service';

const logger = createLogger('LocalLibraryGateway');

@WebSocketGateway({ cors: CORS_CONFIG })
@UseGuards(WsThrottlerGuard)
export class LocalLibraryGateway {
  @WebSocketServer()
  server!: Server;

  constructor(private readonly localLibraryService: LocalLibraryService) {
    logger.info('LocalLibraryGateway initialized');
  }

  @SubscribeMessage(LocalLibraryEvents.LIST_ROOTS)
  handleListRoots() {
    return handleGatewayRequest({
      logger,
      action: 'local-library:list-roots',
      defaultResult: { roots: [] },
      handler: async () => {
        const roots = this.localLibraryService.listRoots();
        return { roots };
      },
    });
  }

  @SubscribeMessage(LocalLibraryEvents.ADD_ROOT)
  handleAddRoot(@MessageBody() payload: LocalLibraryAddRootPayload) {
    return handleGatewayRequest({
      logger,
      action: 'local-library:add-root',
      defaultResult: { root: null },
      handler: async () => {
        if (!payload?.path || typeof payload.path !== 'string') {
          return { root: null, error: 'Missing folder path' };
        }
        const root = this.localLibraryService.addRoot(payload.path, payload.label);
        this.server.emit(LocalLibraryEvents.ROOT_ADDED, { root });
        return { root };
      },
    });
  }

  @SubscribeMessage(LocalLibraryEvents.REMOVE_ROOT)
  handleRemoveRoot(@MessageBody() payload: LocalLibraryRemoveRootPayload) {
    return handleGatewayRequest({
      logger,
      action: 'local-library:remove-root',
      defaultResult: { success: false, id: payload?.id ?? -1 },
      handler: async () => {
        if (typeof payload?.id !== 'number') {
          return { success: false, id: -1, error: 'Missing root id' };
        }
        const deleted = this.localLibraryService.removeRoot(payload.id);
        if (!deleted) {
          return {
            success: false,
            id: payload.id,
            error: `Root with id ${payload.id} not found`,
          };
        }
        this.server.emit(LocalLibraryEvents.ROOT_REMOVED, { id: payload.id, success: true });
        return { success: true, id: payload.id };
      },
    });
  }

  @SubscribeMessage(LocalLibraryEvents.LIST_SERIES)
  handleListSeries(@MessageBody() payload: LocalLibraryListSeriesPayload) {
    return handleGatewayRequest({
      logger,
      action: 'local-library:list-series',
      defaultResult: { series: [] },
      handler: async () => {
        const series = this.localLibraryService.listSeriesByRoot(payload?.rootId);
        return { series };
      },
    });
  }
}
