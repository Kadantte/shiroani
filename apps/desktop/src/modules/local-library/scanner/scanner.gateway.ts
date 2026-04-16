/**
 * Scanner gateway — glues the ScannerService's internal EventEmitter to the
 * socket.io server.
 *
 * Keeps the start/cancel handlers on the same gateway so clients don't have
 * to connect to two namespaces. The LocalLibraryGateway stays focused on
 * roots+series CRUD.
 */

import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  OnGatewayInit,
} from '@nestjs/websockets';
import { UseGuards, OnModuleDestroy } from '@nestjs/common';
import { Server } from 'socket.io';
import {
  createLogger,
  LocalLibraryEvents,
  type LocalLibraryStartScanPayload,
  type LocalLibraryCancelScanPayload,
  type LocalLibraryStartScanResult,
  type LocalLibraryCancelScanResult,
  type LocalLibraryScanDonePayload,
  type LocalLibraryScanFailedPayload,
  type LocalLibraryScanCancelledPayload,
  type LocalLibraryScanProgressPayload,
  type LocalLibraryScanStartedPayload,
  type LocalLibrarySeriesUpdatedPayload,
} from '@shiroani/shared';

import { CORS_CONFIG } from '../../shared/cors.config';
import { WsThrottlerGuard } from '../../shared/ws-throttler.guard';
import { handleGatewayRequest } from '../../shared/gateway-handler';
import { FfmpegNotInstalledError } from '../ffmpeg/ffmpeg.errors';
import { ScannerService, ScannerInternalEvents } from './scanner.service';

const logger = createLogger('ScannerGateway');

@WebSocketGateway({ cors: CORS_CONFIG })
@UseGuards(WsThrottlerGuard)
export class ScannerGateway implements OnGatewayInit, OnModuleDestroy {
  @WebSocketServer()
  server!: Server;

  /** Kept so we can detach all handlers on module destroy. */
  private disposers: Array<() => void> = [];

  constructor(private readonly scannerService: ScannerService) {
    logger.info('ScannerGateway initialized');
  }

  afterInit(): void {
    const wire = <T>(internal: string, external: string): void => {
      const handler = (payload: T): void => {
        this.server.emit(external, payload);
      };
      this.scannerService.events.on(internal, handler);
      this.disposers.push(() => this.scannerService.events.off(internal, handler));
    };

    wire<LocalLibraryScanStartedPayload>(
      ScannerInternalEvents.STARTED,
      LocalLibraryEvents.SCAN_STARTED
    );
    wire<LocalLibraryScanProgressPayload>(
      ScannerInternalEvents.PROGRESS,
      LocalLibraryEvents.SCAN_PROGRESS
    );
    wire<LocalLibraryScanDonePayload>(ScannerInternalEvents.DONE, LocalLibraryEvents.SCAN_DONE);
    wire<LocalLibraryScanFailedPayload>(
      ScannerInternalEvents.FAILED,
      LocalLibraryEvents.SCAN_FAILED
    );
    wire<LocalLibraryScanCancelledPayload>(
      ScannerInternalEvents.CANCELLED,
      LocalLibraryEvents.SCAN_CANCELLED
    );
    wire<LocalLibrarySeriesUpdatedPayload>(
      ScannerInternalEvents.SERIES_UPDATED,
      LocalLibraryEvents.SERIES_UPDATED
    );
  }

  onModuleDestroy(): void {
    for (const dispose of this.disposers) {
      try {
        dispose();
      } catch {
        // ignore
      }
    }
    this.disposers = [];
  }

  @SubscribeMessage(LocalLibraryEvents.START_SCAN)
  handleStartScan(@MessageBody() payload: LocalLibraryStartScanPayload) {
    return handleGatewayRequest<LocalLibraryStartScanResult>({
      logger,
      action: 'local-library:start-scan',
      defaultResult: { scanId: null },
      handler: async () => {
        if (typeof payload?.rootId !== 'number') {
          return { scanId: null, error: 'Missing rootId' };
        }
        try {
          const scanId = await this.scannerService.startScan(payload.rootId);
          return { scanId } satisfies LocalLibraryStartScanResult;
        } catch (err) {
          if (err instanceof FfmpegNotInstalledError) {
            // Surface a typed code so the renderer can show the setup dialog.
            const failedPayload: LocalLibraryScanFailedPayload = {
              rootId: payload.rootId,
              scanId: null,
              error: err.message,
              code: 'FFMPEG_NOT_INSTALLED',
            };
            this.server.emit(LocalLibraryEvents.SCAN_FAILED, failedPayload);
            return {
              scanId: null,
              error: err.message,
              code: 'FFMPEG_NOT_INSTALLED',
            } satisfies LocalLibraryStartScanResult;
          }
          throw err;
        }
      },
    });
  }

  @SubscribeMessage(LocalLibraryEvents.CANCEL_SCAN)
  handleCancelScan(@MessageBody() payload: LocalLibraryCancelScanPayload) {
    return handleGatewayRequest<LocalLibraryCancelScanResult>({
      logger,
      action: 'local-library:cancel-scan',
      defaultResult: { success: false },
      handler: async () => {
        if (typeof payload?.rootId !== 'number') {
          return { success: false, error: 'Missing rootId' };
        }
        const cancelled = this.scannerService.cancelScan(payload.rootId);
        if (!cancelled) {
          return { success: false, error: 'No active scan for this root' };
        }
        return { success: true };
      },
    });
  }
}
