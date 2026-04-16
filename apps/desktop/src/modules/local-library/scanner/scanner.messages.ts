/**
 * Typed message contracts between the main thread (scanner.service.ts) and the
 * scanner worker (scanner.worker.ts).
 *
 * Keep these plain, structurally-cloneable objects — no class instances, no
 * functions. Worker postMessage goes through structured clone.
 */

import type { LocalLibraryScanPhase, LocalSeries } from '@shiroani/shared';

/** Payload sent into the worker via `workerData`. */
export interface ScannerWorkerInit {
  rootId: number;
  rootPath: string;
  scanId: number;
  ffprobePath: string;
  dbPath: string;
}

/** Main → worker control channel. */
export type ScannerControlMessage = { type: 'cancel' };

/** Worker → main progress tick (raw; service throttles before broadcasting). */
export interface ScannerProgressMessage {
  type: 'progress';
  phase: LocalLibraryScanPhase;
  filesSeen: number;
  filesDone: number;
  filesTotal: number;
  filesSkipped: number;
  currentPath: string | null;
  seriesCount: number;
}

export interface ScannerSeriesUpdatedMessage {
  type: 'series-updated';
  series: LocalSeries[];
}

export interface ScannerDoneMessage {
  type: 'done';
  filesAdded: number;
  filesRemoved: number;
  filesSkipped: number;
  seriesCount: number;
  /** IDs of series removed during cleanup (zero episodes remaining). */
  removedSeriesIds: number[];
}

export interface ScannerErrorMessage {
  type: 'error';
  error: string;
  code?: string;
}

export interface ScannerCancelledMessage {
  type: 'cancelled';
}

export interface ScannerLogMessage {
  type: 'log';
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
}

/** Union of everything the worker can send back. */
export type ScannerWorkerMessage =
  | ScannerProgressMessage
  | ScannerSeriesUpdatedMessage
  | ScannerDoneMessage
  | ScannerErrorMessage
  | ScannerCancelledMessage
  | ScannerLogMessage;
