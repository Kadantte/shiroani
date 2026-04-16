import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
} from '@nestjs/websockets';
import { OnModuleInit, UseGuards } from '@nestjs/common';
import { Server } from 'socket.io';
import {
  createLogger,
  FfmpegEvents,
  type FfmpegInstallProgress,
  type FfmpegSetSystemPathsPayload,
  type FfmpegStatusResult,
  type FfmpegSetSystemPathsResult,
  type FfmpegInstallDoneResult,
  type FfmpegStatus,
} from '@shiroani/shared';
import { CORS_CONFIG } from '../../shared/cors.config';
import { WsThrottlerGuard } from '../../shared/ws-throttler.guard';
import { handleGatewayRequest } from '../../shared/gateway-handler';
import { store } from '../../../main/store';
import { FfmpegService } from './ffmpeg.service';
import { FfmpegInstallerService } from './ffmpeg-installer.service';
import { validateSystemBinary } from './ffmpeg.validator';
import { FFMPEG_STORE_KEYS } from './ffmpeg.constants';

const logger = createLogger('FfmpegGateway');

@WebSocketGateway({ cors: CORS_CONFIG })
@UseGuards(WsThrottlerGuard)
export class FfmpegGateway implements OnModuleInit {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly ffmpegService: FfmpegService,
    private readonly installer: FfmpegInstallerService
  ) {
    logger.info('FfmpegGateway initialized');
  }

  onModuleInit(): void {
    // Hook the installer's progress events into the socket so any connected
    // renderer receives them. Listener registration survives module lifecycle
    // — there's only one gateway and one installer.
    this.installer.onProgress((progress: FfmpegInstallProgress) => {
      this.server?.emit(FfmpegEvents.INSTALL_PROGRESS, progress);
    });
  }

  // ---------------------------------------------------------------------------
  // Requests
  // ---------------------------------------------------------------------------

  @SubscribeMessage(FfmpegEvents.STATUS)
  handleStatus() {
    return handleGatewayRequest({
      logger,
      action: 'ffmpeg:status',
      defaultResult: { status: this.ffmpegService.getStatus() },
      handler: async (): Promise<FfmpegStatusResult> => ({
        status: this.ffmpegService.getStatus(),
      }),
    });
  }

  /**
   * Kick off a background install and ack immediately. The actual download
   * takes minutes, so awaiting it in the socket callback would blow past the
   * default 10s timeout. Completion + failure + cancellation arrive via the
   * INSTALL_DONE / INSTALL_FAILED / INSTALL_CANCELLED broadcasts.
   */
  @SubscribeMessage(FfmpegEvents.INSTALL)
  handleInstall() {
    return handleGatewayRequest({
      logger,
      action: 'ffmpeg:install',
      defaultResult: { started: false } satisfies { started: boolean },
      handler: async (): Promise<{ started: boolean; reason?: string }> => {
        if (this.installer.isInstalling()) {
          return { started: false, reason: 'Another install is already in progress' };
        }

        this.server?.emit(FfmpegEvents.INSTALL_START);

        // Fire and forget — the installer emits its own progress / terminal
        // events. We only catch so no unhandled rejection escapes this tick.
        void this.installer
          .install()
          .then(() => {
            const status = this.ffmpegService.getStatus();
            const result: FfmpegInstallDoneResult = { success: true, status };
            this.server?.emit(FfmpegEvents.INSTALL_DONE, result);
          })
          .catch((error: unknown) => {
            const message = error instanceof Error ? error.message : String(error);
            const isCancelled =
              error instanceof Error && error.name === 'FfmpegInstallCancelledError';
            const status = this.ffmpegService.getStatus();
            const result: FfmpegInstallDoneResult = { success: false, status, error: message };
            this.server?.emit(
              isCancelled ? FfmpegEvents.INSTALL_CANCELLED : FfmpegEvents.INSTALL_FAILED,
              result
            );
          });

        return { started: true };
      },
    });
  }

  @SubscribeMessage(FfmpegEvents.CANCEL)
  handleCancel() {
    return handleGatewayRequest({
      logger,
      action: 'ffmpeg:cancel',
      defaultResult: { success: false },
      handler: async () => {
        this.installer.cancel();
        return { success: true };
      },
    });
  }

  @SubscribeMessage(FfmpegEvents.UNINSTALL)
  handleUninstall() {
    return handleGatewayRequest({
      logger,
      action: 'ffmpeg:uninstall',
      defaultResult: { success: false, status: this.ffmpegService.getStatus() },
      handler: async (): Promise<{ success: true; status: FfmpegStatus }> => {
        await this.installer.uninstall();
        const status = this.ffmpegService.getStatus();
        this.server?.emit(FfmpegEvents.STATUS_RESULT, { status });
        return { success: true, status };
      },
    });
  }

  @SubscribeMessage(FfmpegEvents.SET_SYSTEM_PATHS)
  handleSetSystemPaths(@MessageBody() payload: FfmpegSetSystemPathsPayload) {
    return handleGatewayRequest({
      logger,
      action: 'ffmpeg:set-system-paths',
      defaultResult: {
        success: false,
        status: this.ffmpegService.getStatus(),
      } satisfies FfmpegSetSystemPathsResult,
      handler: async (): Promise<FfmpegSetSystemPathsResult> => {
        if (
          typeof payload?.ffmpegPath !== 'string' ||
          typeof payload?.ffprobePath !== 'string' ||
          !payload.ffmpegPath.trim() ||
          !payload.ffprobePath.trim()
        ) {
          return {
            success: false,
            status: this.ffmpegService.getStatus(),
            error: 'Both ffmpeg and ffprobe paths are required',
          };
        }

        const [ffmpegResult, ffprobeResult] = await Promise.all([
          validateSystemBinary(payload.ffmpegPath, { kind: 'ffmpeg' }),
          validateSystemBinary(payload.ffprobePath, { kind: 'ffprobe' }),
        ]);

        if (!ffmpegResult.ok) {
          return {
            success: false,
            status: this.ffmpegService.getStatus(),
            error: `ffmpeg: ${ffmpegResult.error ?? 'validation failed'}`,
          };
        }
        if (!ffprobeResult.ok) {
          return {
            success: false,
            status: this.ffmpegService.getStatus(),
            error: `ffprobe: ${ffprobeResult.error ?? 'validation failed'}`,
          };
        }

        store.set(FFMPEG_STORE_KEYS.MODE, 'system');
        store.set(FFMPEG_STORE_KEYS.SYSTEM_FFMPEG_PATH, payload.ffmpegPath);
        store.set(FFMPEG_STORE_KEYS.SYSTEM_FFPROBE_PATH, payload.ffprobePath);

        const status = this.ffmpegService.getStatus();
        this.server?.emit(FfmpegEvents.STATUS_RESULT, { status });
        return { success: true, status };
      },
    });
  }

  @SubscribeMessage(FfmpegEvents.CLEAR_SYSTEM_PATHS)
  handleClearSystemPaths() {
    return handleGatewayRequest({
      logger,
      action: 'ffmpeg:clear-system-paths',
      defaultResult: { success: false, status: this.ffmpegService.getStatus() },
      handler: async (): Promise<{ success: true; status: FfmpegStatus }> => {
        store.delete(FFMPEG_STORE_KEYS.SYSTEM_FFMPEG_PATH);
        store.delete(FFMPEG_STORE_KEYS.SYSTEM_FFPROBE_PATH);
        // If the user was in system mode we drop back to none — they can
        // re-install the bundled build or supply new paths.
        if (this.ffmpegService.getMode() === 'system') {
          store.delete(FFMPEG_STORE_KEYS.MODE);
        }
        const status = this.ffmpegService.getStatus();
        this.server?.emit(FfmpegEvents.STATUS_RESULT, { status });
        return { success: true, status };
      },
    });
  }
}
