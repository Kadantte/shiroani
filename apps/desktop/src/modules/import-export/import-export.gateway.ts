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
  ImportExportEvents,
  LibraryEvents,
  DiaryEvents,
  type ExportRequest,
  type ExportResponse,
  type ImportRequest,
  type ImportResponse,
  type ImportItemResult,
} from '@shiroani/shared';
import { CORS_CONFIG } from '../shared/cors.config';
import { WsThrottlerGuard } from '../shared/ws-throttler.guard';
import { handleGatewayRequest } from '../shared/gateway-handler';
import { ImportExportService } from './import-export.service';

const logger = createLogger('ImportExportGateway');

/** Small helper to wait for a given number of milliseconds. */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

@WebSocketGateway({ cors: CORS_CONFIG })
@UseGuards(WsThrottlerGuard)
export class ImportExportGateway {
  @WebSocketServer()
  server!: Server;

  constructor(private readonly importExportService: ImportExportService) {
    logger.info('ImportExportGateway initialized');
  }

  @SubscribeMessage(ImportExportEvents.EXPORT)
  handleExport(@MessageBody() payload: ExportRequest) {
    return handleGatewayRequest({
      logger,
      action: 'data:export',
      defaultResult: { data: null, totalExported: 0 },
      handler: async () => {
        const data = this.importExportService.exportData(payload.type, payload.ids);
        const totalExported = (data.data.library?.length ?? 0) + (data.data.diary?.length ?? 0);
        return { data, totalExported } as ExportResponse;
      },
    });
  }

  @SubscribeMessage(ImportExportEvents.IMPORT)
  handleImport(@MessageBody() payload: ImportRequest) {
    return handleGatewayRequest({
      logger,
      action: 'data:import',
      defaultResult: { results: [], totalImported: 0, totalSkipped: 0, totalErrors: 0 },
      handler: async () => {
        const results: ImportItemResult[] = [];
        let totalImported = 0;
        let totalSkipped = 0;
        let totalErrors = 0;
        let index = 0;

        let hasLibrary = false;
        let hasDiary = false;

        // Import library entries
        const libraryEntries = payload.data.data.library ?? [];
        if ((payload.type === 'library' || payload.type === 'all') && libraryEntries.length > 0) {
          hasLibrary = true;
          for (const entry of libraryEntries) {
            const result = this.importExportService.importLibraryEntry(entry, payload.strategy);
            result.index = index;

            results.push(result);
            this.server.emit(ImportExportEvents.IMPORT_PROGRESS, result);

            if (result.status === 'success') totalImported++;
            else if (result.status === 'skipped') totalSkipped++;
            else if (result.status === 'error') totalErrors++;

            index++;
            await sleep(1000);
          }
        }

        // Import diary entries
        const diaryEntries = payload.data.data.diary ?? [];
        if ((payload.type === 'diary' || payload.type === 'all') && diaryEntries.length > 0) {
          hasDiary = true;
          for (const entry of diaryEntries) {
            const result = this.importExportService.importDiaryEntry(entry, payload.strategy);
            result.index = index;

            results.push(result);
            this.server.emit(ImportExportEvents.IMPORT_PROGRESS, result);

            if (result.status === 'success') totalImported++;
            else if (result.status === 'skipped') totalSkipped++;
            else if (result.status === 'error') totalErrors++;

            index++;
            await sleep(1000);
          }
        }

        // Notify existing stores to refresh
        if (hasLibrary) {
          this.server.emit(LibraryEvents.UPDATED, { action: 'imported' });
        }
        if (hasDiary) {
          this.server.emit(DiaryEvents.UPDATED, { action: 'imported' });
        }

        const response: ImportResponse = {
          results,
          totalImported,
          totalSkipped,
          totalErrors,
        };

        logger.info(
          `Import complete: ${totalImported} imported, ${totalSkipped} skipped, ${totalErrors} errors`
        );

        return response;
      },
    });
  }
}
