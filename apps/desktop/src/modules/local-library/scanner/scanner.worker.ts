/**
 * Scanner worker — runs the full scan pipeline off the NestJS event loop.
 *
 * Lifecycle:
 *   1. Receive `workerData` with { rootId, rootPath, scanId, ffprobePath, dbPath }
 *   2. Open a dedicated better-sqlite3 connection against the app db
 *   3. Walk → parse → probe → group → persist, posting progress + series
 *      batches back to the main thread via parentPort.postMessage
 *   4. Post `done` on success, `error` on failure, `cancelled` if the main
 *      thread asked us to stop.
 *
 * We intentionally DO NOT use Nest here — that keeps the worker's startup
 * cost tiny (~50ms including better-sqlite3 init) and makes it trivial to
 * bundle as a standalone CJS file.
 *
 * Cancellation model: the main thread posts `{ type: 'cancel' }` and we set a
 * flag. We check that flag between files and between phases, then we return
 * cleanly with a `cancelled` message. ffprobe children are killed via their
 * AbortSignal on the same flag transition.
 */

import { parentPort, workerData } from 'node:worker_threads';
import os from 'node:os';
import Database from 'better-sqlite3';
import type { LocalSeries } from '@shiroani/shared';

import type {
  ScannerWorkerInit,
  ScannerWorkerMessage,
  ScannerControlMessage,
} from './scanner.messages';
import { walkRoot } from './pipeline/walk';
import { parseFilename } from './pipeline/parse-filename';
import { probeFile, ProbeError } from './pipeline/probe';
import { groupEpisodes, type ParsedEpisodeRecord } from './pipeline/group';
import { persistGroup, removeMissingFiles } from './pipeline/persist';

const init = workerData as ScannerWorkerInit;

let cancelled = false;
const abortController = new AbortController();

function post(message: ScannerWorkerMessage): void {
  parentPort?.postMessage(message);
}

function log(level: 'debug' | 'info' | 'warn' | 'error', message: string): void {
  post({ type: 'log', level, message });
}

parentPort?.on('message', (msg: ScannerControlMessage) => {
  if (msg?.type === 'cancel') {
    cancelled = true;
    abortController.abort();
  }
});

/**
 * Concurrency limiter with `size` workers. Runs tasks as they're added, never
 * exceeding the pool size. Matches the shape we need for ffprobe batching.
 */
async function mapConcurrent<T, R>(
  items: T[],
  size: number,
  task: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(size, items.length) }, async () => {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      if (cancelled) return;
      results[i] = await task(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}

async function run(): Promise<void> {
  const db = new Database(init.dbPath);
  // Match the main-thread pragmas — opening with WAL + NORMAL means we can
  // write concurrently with the main-thread reader without blocking.
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('temp_store = MEMORY');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 10000');

  const totals = {
    filesAdded: 0,
    filesRemoved: 0,
    filesSkipped: 0,
    seriesCount: 0,
    removedSeriesIds: [] as number[],
  };

  try {
    // ---------- Phase: walk ----------
    post({
      type: 'progress',
      phase: 'discovering',
      filesSeen: 0,
      filesDone: 0,
      filesTotal: 0,
      filesSkipped: 0,
      currentPath: null,
      seriesCount: 0,
    });

    const walked = await walkRoot(init.rootPath, {
      shouldCancel: () => cancelled,
      onProgress: (filesSeen, currentPath) => {
        post({
          type: 'progress',
          phase: 'discovering',
          filesSeen,
          filesDone: 0,
          filesTotal: 0,
          filesSkipped: 0,
          currentPath,
          seriesCount: 0,
        });
      },
    });

    log('info', `walker: found ${walked.files.length} candidate files`);
    if (walked.inaccessibleDirs > 0) {
      log('warn', `walker: ${walked.inaccessibleDirs} inaccessible directories skipped`);
    }

    if (cancelled) {
      post({ type: 'cancelled' });
      return;
    }

    // ---------- Phase: parse filenames ----------
    post({
      type: 'progress',
      phase: 'parsing',
      filesSeen: walked.files.length,
      filesDone: 0,
      filesTotal: walked.files.length,
      filesSkipped: 0,
      currentPath: null,
      seriesCount: 0,
    });

    const parsedRecords: ParsedEpisodeRecord[] = walked.files.map(file => ({
      file,
      parsed: parseFilename(file.fullPath),
      probe: null,
      probeError: null,
    }));

    // ---------- Phase: probe ----------
    const concurrency = Math.max(2, os.cpus().length - 2);
    let filesDone = 0;

    await mapConcurrent(parsedRecords, concurrency, async record => {
      if (cancelled) return;
      try {
        const probe = await probeFile(init.ffprobePath, record.file.fullPath, {
          signal: abortController.signal,
        });
        record.probe = probe;
      } catch (err) {
        const message = err instanceof ProbeError ? err.message : (err as Error).message;
        record.probeError = message;
        totals.filesSkipped += 1;
        log('warn', `probe skipped ${record.file.fullPath}: ${message}`);
      } finally {
        filesDone += 1;
        // Post every N files; service throttles for the renderer.
        if (filesDone % 3 === 0 || filesDone === parsedRecords.length) {
          post({
            type: 'progress',
            phase: 'probing',
            filesSeen: walked.files.length,
            filesDone,
            filesTotal: parsedRecords.length,
            filesSkipped: totals.filesSkipped,
            currentPath: record.file.fullPath,
            seriesCount: 0,
          });
        }
      }
    });

    if (cancelled) {
      post({ type: 'cancelled' });
      return;
    }

    // ---------- Phase: group ----------
    const groups = groupEpisodes(parsedRecords, { rootPath: init.rootPath });
    totals.seriesCount = groups.length;
    log('info', `grouper: ${groups.length} series from ${parsedRecords.length} files`);

    // ---------- Phase: persist ----------
    post({
      type: 'progress',
      phase: 'persisting',
      filesSeen: walked.files.length,
      filesDone: parsedRecords.length,
      filesTotal: parsedRecords.length,
      filesSkipped: totals.filesSkipped,
      currentPath: null,
      seriesCount: groups.length,
    });

    const SERIES_BROADCAST_CHUNK = 25;
    let pendingSeries: LocalSeries[] = [];

    for (const group of groups) {
      if (cancelled) break;
      const result = persistGroup(db, init.rootId, group);
      pendingSeries.push(result.series);
      totals.filesAdded += result.episodesUpserted;

      if (pendingSeries.length >= SERIES_BROADCAST_CHUNK) {
        post({ type: 'series-updated', series: pendingSeries });
        pendingSeries = [];
      }
    }

    if (pendingSeries.length > 0) {
      post({ type: 'series-updated', series: pendingSeries });
      pendingSeries = [];
    }

    if (cancelled) {
      post({ type: 'cancelled' });
      return;
    }

    // ---------- Phase: cleanup ----------
    post({
      type: 'progress',
      phase: 'cleanup',
      filesSeen: walked.files.length,
      filesDone: parsedRecords.length,
      filesTotal: parsedRecords.length,
      filesSkipped: totals.filesSkipped,
      currentPath: null,
      seriesCount: groups.length,
    });

    const currentPaths = walked.files.map(f => f.fullPath);
    const cleanup = removeMissingFiles(db, init.rootId, currentPaths);
    totals.filesRemoved = cleanup.filesRemoved;
    totals.seriesCount = Math.max(0, groups.length - cleanup.seriesRemoved);
    totals.removedSeriesIds = cleanup.removedSeriesIds;

    log(
      'info',
      `cleanup: removed ${cleanup.filesRemoved} stale files and ${cleanup.seriesRemoved} empty series`
    );

    post({
      type: 'done',
      filesAdded: totals.filesAdded,
      filesRemoved: totals.filesRemoved,
      filesSkipped: totals.filesSkipped,
      seriesCount: totals.seriesCount,
      removedSeriesIds: totals.removedSeriesIds,
    });
  } catch (err) {
    const message = (err as Error)?.message ?? String(err);
    log('error', `scan failed: ${message}`);
    post({ type: 'error', error: message });
  } finally {
    try {
      db.close();
    } catch {
      // ignore
    }
    // Unref the control channel so the worker thread can exit once run()
    // completes. Without this the `cancel` listener on parentPort keeps the
    // event loop alive indefinitely, `worker.on('exit')` never fires on the
    // main thread, and the service's finalize() path (which emits
    // SCAN_DONE/FAILED/CANCELLED) never runs. `unref` is safer than `close`
    // — any queued terminal message still gets flushed to the main thread
    // before the worker actually tears down.
    parentPort?.unref();
  }
}

void run();
