/**
 * Scanner orchestration service — the main-thread counterpart of
 * `scanner.worker.ts`.
 *
 * Owns the lifecycle of each running scan (one Worker per rootId at a time),
 * persists scan rows in `library_scans`, throttles progress broadcasts, and
 * translates worker messages into socket events through a lightweight
 * EventEmitter that the gateway subscribes to.
 */

import { Injectable } from '@nestjs/common';
import { EventEmitter } from 'node:events';
import { Worker } from 'node:worker_threads';
import path from 'node:path';
import { app } from 'electron';
import {
  createLogger,
  type LocalLibraryScanDonePayload,
  type LocalLibraryScanFailedPayload,
  type LocalLibraryScanCancelledPayload,
  type LocalLibraryScanProgressPayload,
  type LocalLibraryScanStartedPayload,
  type LocalLibrarySeriesUpdatedPayload,
} from '@shiroani/shared';

import { DatabaseService } from '../../database';
import { FfmpegService } from '../ffmpeg/ffmpeg.service';
import { FfmpegNotInstalledError } from '../ffmpeg/ffmpeg.errors';
import { LocalLibraryService } from '../local-library.service';
import type {
  ScannerCancelledMessage,
  ScannerControlMessage,
  ScannerDoneMessage,
  ScannerErrorMessage,
  ScannerWorkerInit,
  ScannerWorkerMessage,
} from './scanner.messages';

/** Narrowed union of worker messages that finalize the scan lifecycle. */
type ScannerTerminalMessage = ScannerDoneMessage | ScannerErrorMessage | ScannerCancelledMessage;

const logger = createLogger('ScannerService');

/** How often the service re-emits `SCAN_PROGRESS` to clients (ms). */
const PROGRESS_THROTTLE_MS = 100; // 10 Hz

/** Events the gateway subscribes to (server-only, local to this process). */
export const ScannerInternalEvents = {
  STARTED: 'scanner:started',
  PROGRESS: 'scanner:progress',
  DONE: 'scanner:done',
  FAILED: 'scanner:failed',
  CANCELLED: 'scanner:cancelled',
  SERIES_UPDATED: 'scanner:series-updated',
} as const;

interface ActiveScan {
  worker: Worker;
  scanId: number;
  rootId: number;
  startedAt: number;
  /** Latest progress payload — flushed to the gateway at most once per tick. */
  pendingProgress: LocalLibraryScanProgressPayload | null;
  /** Active setTimeout for the next flush, or null. */
  flushTimer: NodeJS.Timeout | null;
  /** Running accumulator for `library_scans.files_seen`. */
  lastFilesSeen: number;
}

/** Locate the bundled worker js file on disk. Different in dev vs packaged. */
function resolveWorkerPath(): string {
  // `__dirname` at runtime is `<app>/dist/main`. The worker builds next to it
  // as `scanner.worker.js` by way of the esbuild entrypoints list.
  return path.join(__dirname, 'scanner.worker.js');
}

@Injectable()
export class ScannerService {
  readonly events = new EventEmitter();
  private active = new Map<number, ActiveScan>();

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly ffmpegService: FfmpegService,
    private readonly localLibraryService: LocalLibraryService
  ) {
    logger.info('ScannerService initialized');
    this.events.setMaxListeners(50);
  }

  /**
   * Start a scan for the given root. Rejects if another scan is already in
   * flight for the same root or if FFmpeg isn't available.
   *
   * Returns the `library_scans.id` of the newly-created scan row.
   */
  async startScan(rootId: number): Promise<number> {
    if (this.active.has(rootId)) {
      throw new Error(`Scan already running for root ${rootId}`);
    }

    const root = this.localLibraryService.getRootById(rootId);
    if (!root) {
      throw new Error(`Root ${rootId} not found`);
    }

    // Throws FfmpegNotInstalledError on missing install — propagated to the
    // gateway, which turns it into a typed SCAN_FAILED event.
    const { ffprobePath } = this.ffmpegService.resolvePaths();

    const db = this.databaseService.db;
    const insertResult = db
      .prepare('INSERT INTO library_scans (root_id, status) VALUES (?, ?)')
      .run(rootId, 'running');
    const scanId = Number(insertResult.lastInsertRowid);

    const init: ScannerWorkerInit = {
      rootId,
      rootPath: root.path,
      scanId,
      ffprobePath,
      dbPath: path.join(app.getPath('userData'), 'shiroani.db'),
    };

    const worker = new Worker(resolveWorkerPath(), {
      workerData: init,
    });

    const activeScan: ActiveScan = {
      worker,
      scanId,
      rootId,
      startedAt: Date.now(),
      pendingProgress: null,
      flushTimer: null,
      lastFilesSeen: 0,
    };
    this.active.set(rootId, activeScan);

    this.wireWorker(activeScan);

    const startedPayload: LocalLibraryScanStartedPayload = { rootId, scanId };
    this.events.emit(ScannerInternalEvents.STARTED, startedPayload);
    logger.info(`Scan started id=${scanId} root=${rootId} path=${root.path}`);
    return scanId;
  }

  /** Signal cancellation for an active scan. Returns false if no scan was active. */
  cancelScan(rootId: number): boolean {
    const scan = this.active.get(rootId);
    if (!scan) return false;

    logger.info(`Cancelling scan id=${scan.scanId} root=${rootId}`);
    const ctl: ScannerControlMessage = { type: 'cancel' };
    scan.worker.postMessage(ctl);
    return true;
  }

  /** Snapshot of currently running scans (for UI state hydration). */
  getActiveScans(): { rootId: number; scanId: number; startedAt: number }[] {
    return Array.from(this.active.values()).map(s => ({
      rootId: s.rootId,
      scanId: s.scanId,
      startedAt: s.startedAt,
    }));
  }

  private wireWorker(scan: ActiveScan): void {
    const { worker, rootId, scanId } = scan;
    let finalMessage: ScannerTerminalMessage | null = null;

    worker.on('message', (msg: ScannerWorkerMessage) => {
      switch (msg.type) {
        case 'log':
          this.logWorker(msg.level, msg.message);
          break;
        case 'progress': {
          scan.lastFilesSeen = msg.filesSeen;
          scan.pendingProgress = {
            rootId,
            scanId,
            phase: msg.phase,
            filesSeen: msg.filesSeen,
            filesDone: msg.filesDone,
            filesTotal: msg.filesTotal,
            filesSkipped: msg.filesSkipped,
            currentPath: msg.currentPath,
            seriesCount: msg.seriesCount,
          };
          this.scheduleFlush(scan);
          break;
        }
        case 'series-updated': {
          const payload: LocalLibrarySeriesUpdatedPayload = {
            rootId,
            series: msg.series,
          };
          this.events.emit(ScannerInternalEvents.SERIES_UPDATED, payload);
          break;
        }
        case 'done':
        case 'error':
        case 'cancelled':
          finalMessage = msg;
          break;
      }
    });

    worker.on('error', (err: Error) => {
      logger.error(`Worker error for scan ${scanId}: ${err.message}`);
      if (!finalMessage) {
        finalMessage = { type: 'error', error: err.message };
      }
    });

    worker.on('exit', code => {
      this.flushPending(scan);

      // If the worker exited without producing a terminal message (crash,
      // non-zero exit), synthesize a failure so the UI doesn't get stuck.
      if (!finalMessage && code !== 0) {
        finalMessage = { type: 'error', error: `Worker exited with code ${code}` };
      }

      this.finalize(scan, finalMessage);
    });
  }

  private scheduleFlush(scan: ActiveScan): void {
    if (scan.flushTimer) return;
    scan.flushTimer = setTimeout(() => {
      this.flushPending(scan);
    }, PROGRESS_THROTTLE_MS);
  }

  private flushPending(scan: ActiveScan): void {
    if (scan.flushTimer) {
      clearTimeout(scan.flushTimer);
      scan.flushTimer = null;
    }
    const payload = scan.pendingProgress;
    if (!payload) return;
    scan.pendingProgress = null;
    this.events.emit(ScannerInternalEvents.PROGRESS, payload);
  }

  private finalize(scan: ActiveScan, finalMessage: ScannerTerminalMessage | null): void {
    this.active.delete(scan.rootId);

    const db = this.databaseService.db;

    if (!finalMessage || finalMessage.type === 'done') {
      const filesAdded = finalMessage?.type === 'done' ? finalMessage.filesAdded : 0;
      const filesRemoved = finalMessage?.type === 'done' ? finalMessage.filesRemoved : 0;
      const seriesCount = finalMessage?.type === 'done' ? finalMessage.seriesCount : 0;
      const filesSkipped = finalMessage?.type === 'done' ? finalMessage.filesSkipped : 0;

      db.prepare(
        `UPDATE library_scans
         SET status = ?, finished_at = datetime('now'),
             files_seen = ?, files_added = ?, files_removed = ?
         WHERE id = ?`
      ).run('completed', scan.lastFilesSeen, filesAdded, filesRemoved, scan.scanId);
      db.prepare(`UPDATE library_roots SET last_scanned_at = datetime('now') WHERE id = ?`).run(
        scan.rootId
      );

      const payload: LocalLibraryScanDonePayload = {
        rootId: scan.rootId,
        scanId: scan.scanId,
        filesAdded,
        filesRemoved,
        filesSkipped,
        seriesCount,
      };
      this.events.emit(ScannerInternalEvents.DONE, payload);
      logger.info(
        `Scan ${scan.scanId} done: ${filesAdded} added, ${filesRemoved} removed, ${seriesCount} series, ${filesSkipped} skipped`
      );
      return;
    }

    if (finalMessage.type === 'cancelled') {
      db.prepare(
        `UPDATE library_scans
         SET status = ?, finished_at = datetime('now'), files_seen = ?
         WHERE id = ?`
      ).run('cancelled', scan.lastFilesSeen, scan.scanId);

      const payload: LocalLibraryScanCancelledPayload = {
        rootId: scan.rootId,
        scanId: scan.scanId,
      };
      this.events.emit(ScannerInternalEvents.CANCELLED, payload);
      logger.info(`Scan ${scan.scanId} cancelled`);
      return;
    }

    // error
    db.prepare(
      `UPDATE library_scans
       SET status = ?, finished_at = datetime('now'), error = ?, files_seen = ?
       WHERE id = ?`
    ).run('failed', finalMessage.error, scan.lastFilesSeen, scan.scanId);

    const payload: LocalLibraryScanFailedPayload = {
      rootId: scan.rootId,
      scanId: scan.scanId,
      error: finalMessage.error,
      code: finalMessage.code,
    };
    this.events.emit(ScannerInternalEvents.FAILED, payload);
    logger.error(`Scan ${scan.scanId} failed: ${finalMessage.error}`);
  }

  /** Translate the FfmpegNotInstalledError coming out of `startScan` for the gateway. */
  static isFfmpegNotInstalledError(err: unknown): err is FfmpegNotInstalledError {
    return err instanceof FfmpegNotInstalledError;
  }

  private logWorker(level: 'debug' | 'info' | 'warn' | 'error', message: string): void {
    switch (level) {
      case 'debug':
        logger.debug(`worker: ${message}`);
        return;
      case 'info':
        logger.info(`worker: ${message}`);
        return;
      case 'warn':
        logger.warn(`worker: ${message}`);
        return;
      case 'error':
        logger.error(`worker: ${message}`);
        return;
    }
  }
}
