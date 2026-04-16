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
  type LocalLibraryListEpisodesPayload,
  type LocalLibraryEpisodesResult,
  type LocalLibraryListContinueWatchingPayload,
  type LocalLibraryContinueWatchingResult,
  type LocalLibraryGetSeriesProgressPayload,
  type LocalLibrarySeriesProgressResult,
  type LocalLibraryMarkEpisodeWatchedPayload,
  type LocalLibraryMarkEpisodeWatchedResult,
  type LocalLibraryMarkSeriesWatchedPayload,
  type LocalLibraryMarkSeriesWatchedResult,
  type LocalLibrarySetEpisodeProgressPayload,
  type LocalLibrarySetEpisodeProgressResult,
  type LocalLibraryEpisodeProgressUpdatedPayload,
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

  @SubscribeMessage(LocalLibraryEvents.LIST_EPISODES)
  handleListEpisodes(@MessageBody() payload: LocalLibraryListEpisodesPayload) {
    return handleGatewayRequest<LocalLibraryEpisodesResult>({
      logger,
      action: 'local-library:list-episodes',
      defaultResult: { seriesId: payload?.seriesId ?? -1, episodes: [] },
      handler: async () => {
        if (typeof payload?.seriesId !== 'number') {
          return { seriesId: -1, episodes: [], error: 'Missing seriesId' };
        }
        const episodes = this.localLibraryService.listEpisodesBySeries(payload.seriesId);
        return { seriesId: payload.seriesId, episodes };
      },
    });
  }

  @SubscribeMessage(LocalLibraryEvents.LIST_CONTINUE_WATCHING)
  handleListContinueWatching(@MessageBody() payload: LocalLibraryListContinueWatchingPayload) {
    return handleGatewayRequest<LocalLibraryContinueWatchingResult>({
      logger,
      action: 'local-library:list-continue-watching',
      defaultResult: { items: [] },
      handler: async () => {
        const limit = typeof payload?.limit === 'number' ? payload.limit : 20;
        const items = this.localLibraryService.listContinueWatching(limit);
        return { items };
      },
    });
  }

  @SubscribeMessage(LocalLibraryEvents.GET_SERIES_PROGRESS)
  handleGetSeriesProgress(@MessageBody() payload: LocalLibraryGetSeriesProgressPayload) {
    return handleGatewayRequest<LocalLibrarySeriesProgressResult>({
      logger,
      action: 'local-library:get-series-progress',
      defaultResult: {
        summary: {
          seriesId: payload?.seriesId ?? -1,
          watchedCount: 0,
          totalCount: 0,
          lastWatchedAt: null,
          resumeEpisodeId: null,
          resumePositionSeconds: null,
          resumeDurationSeconds: null,
        },
      },
      handler: async () => {
        if (typeof payload?.seriesId !== 'number') {
          return {
            summary: {
              seriesId: -1,
              watchedCount: 0,
              totalCount: 0,
              lastWatchedAt: null,
              resumeEpisodeId: null,
              resumePositionSeconds: null,
              resumeDurationSeconds: null,
            },
            error: 'Missing seriesId',
          };
        }
        const summary = this.localLibraryService.getSeriesProgress(payload.seriesId);
        return { summary };
      },
    });
  }

  @SubscribeMessage(LocalLibraryEvents.MARK_EPISODE_WATCHED)
  handleMarkEpisodeWatched(@MessageBody() payload: LocalLibraryMarkEpisodeWatchedPayload) {
    return handleGatewayRequest<LocalLibraryMarkEpisodeWatchedResult>({
      logger,
      action: 'local-library:mark-episode-watched',
      defaultResult: {
        episodeId: payload?.episodeId ?? -1,
        seriesId: -1,
        progress: null,
      },
      handler: async () => {
        if (typeof payload?.episodeId !== 'number' || typeof payload?.watched !== 'boolean') {
          return {
            episodeId: payload?.episodeId ?? -1,
            seriesId: -1,
            progress: null,
            error: 'Missing episodeId or watched flag',
          };
        }
        const episode = this.localLibraryService.getEpisodeById(payload.episodeId);
        if (!episode) {
          return {
            episodeId: payload.episodeId,
            seriesId: -1,
            progress: null,
            error: `Episode ${payload.episodeId} not found`,
          };
        }
        const progress = this.localLibraryService.markEpisodeWatched(
          payload.episodeId,
          payload.watched
        );
        const updatePayload: LocalLibraryEpisodeProgressUpdatedPayload = {
          episodeId: payload.episodeId,
          seriesId: episode.seriesId,
          progress: progress ?? {
            episodeId: payload.episodeId,
            positionSeconds: 0,
            durationSeconds: episode.durationSeconds ?? 0,
            completed: false,
            completedAt: null,
            watchCount: 0,
            updatedAt: new Date().toISOString(),
          },
        };
        this.server.emit(LocalLibraryEvents.EPISODE_PROGRESS_UPDATED, updatePayload);
        return {
          episodeId: payload.episodeId,
          seriesId: episode.seriesId,
          progress,
        };
      },
    });
  }

  @SubscribeMessage(LocalLibraryEvents.MARK_SERIES_WATCHED)
  handleMarkSeriesWatched(@MessageBody() payload: LocalLibraryMarkSeriesWatchedPayload) {
    return handleGatewayRequest<LocalLibraryMarkSeriesWatchedResult>({
      logger,
      action: 'local-library:mark-series-watched',
      defaultResult: {
        seriesId: payload?.seriesId ?? -1,
        affectedEpisodes: 0,
      },
      handler: async () => {
        if (typeof payload?.seriesId !== 'number' || typeof payload?.watched !== 'boolean') {
          return {
            seriesId: payload?.seriesId ?? -1,
            affectedEpisodes: 0,
            error: 'Missing seriesId or watched flag',
          };
        }
        const affectedEpisodes = this.localLibraryService.markSeriesWatched(
          payload.seriesId,
          payload.watched
        );
        // Broadcast per-episode updates so any open detail view stays in sync.
        const episodes = this.localLibraryService.listEpisodesBySeries(payload.seriesId);
        for (const ep of episodes) {
          const progress = this.localLibraryService.getEpisodeProgress(ep.id);
          const updatePayload: LocalLibraryEpisodeProgressUpdatedPayload = {
            episodeId: ep.id,
            seriesId: payload.seriesId,
            progress: progress ?? {
              episodeId: ep.id,
              positionSeconds: 0,
              durationSeconds: ep.durationSeconds ?? 0,
              completed: false,
              completedAt: null,
              watchCount: 0,
              updatedAt: new Date().toISOString(),
            },
          };
          this.server.emit(LocalLibraryEvents.EPISODE_PROGRESS_UPDATED, updatePayload);
        }
        return { seriesId: payload.seriesId, affectedEpisodes };
      },
    });
  }

  @SubscribeMessage(LocalLibraryEvents.SET_EPISODE_PROGRESS)
  handleSetEpisodeProgress(@MessageBody() payload: LocalLibrarySetEpisodeProgressPayload) {
    return handleGatewayRequest<LocalLibrarySetEpisodeProgressResult>({
      logger,
      action: 'local-library:set-episode-progress',
      defaultResult: { episodeId: payload?.episodeId ?? -1, progress: null },
      handler: async () => {
        if (
          typeof payload?.episodeId !== 'number' ||
          typeof payload?.positionSeconds !== 'number' ||
          typeof payload?.durationSeconds !== 'number'
        ) {
          return {
            episodeId: payload?.episodeId ?? -1,
            progress: null,
            error: 'Missing episodeId, positionSeconds or durationSeconds',
          };
        }
        const episode = this.localLibraryService.getEpisodeById(payload.episodeId);
        if (!episode) {
          return {
            episodeId: payload.episodeId,
            progress: null,
            error: `Episode ${payload.episodeId} not found`,
          };
        }
        const progress = this.localLibraryService.setEpisodeProgress({
          episodeId: payload.episodeId,
          positionSeconds: payload.positionSeconds,
          durationSeconds: payload.durationSeconds,
        });
        const updatePayload: LocalLibraryEpisodeProgressUpdatedPayload = {
          episodeId: payload.episodeId,
          seriesId: episode.seriesId,
          progress,
        };
        this.server.emit(LocalLibraryEvents.EPISODE_PROGRESS_UPDATED, updatePayload);
        return { episodeId: payload.episodeId, progress };
      },
    });
  }
}
