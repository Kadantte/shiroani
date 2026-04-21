import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import {
  LOG_FILE_PREFIX,
  LOG_MAX_FILE_SIZE,
  LOG_MAX_AGE_MS,
  LOG_FLUSH_INTERVAL_MS,
  LOG_BUFFER_MAX_ENTRIES,
  LOG_CLEANUP_INTERVAL_MS,
  createLogger,
  LoggerOptions,
  setTimestampsEnabled,
} from '@shiroani/shared';

// ============================================================================
// State
// ============================================================================

let logsDir: string | null = null;
const buffer: string[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;
let cleanupTimer: ReturnType<typeof setInterval> | null = null;
let isRotating = false;
let loggingFailed = false;
let loggingErrorNotified = false;

/** Optional callback invoked on the first logging error */
let onLoggingError: ((error: unknown) => void) | null = null;

/**
 * Set the callback for logging errors (one-time notification)
 */
export function setOnLoggingError(callback: (error: unknown) => void): void {
  onLoggingError = callback;
}

// ============================================================================
// Path helpers
// ============================================================================

/**
 * Get the logs directory path (userData/logs).
 * Creates the directory if it does not exist.
 */
export function getLogsDir(): string {
  if (!logsDir) {
    const userDataPath = app.getPath('userData');
    logsDir = path.join(userDataPath, 'logs');
  }
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  return logsDir;
}

/**
 * Get the current log file path (date-based).
 */
export function getLogPath(): string {
  const date = new Date().toISOString().split('T')[0];
  return path.join(getLogsDir(), `${LOG_FILE_PREFIX}-${date}.log`);
}

// ============================================================================
// Rotation
// ============================================================================

/**
 * Find the next available rotation number for a given base file.
 */
async function getNextRotationNumber(dir: string, baseName: string): Promise<number> {
  const files = await fs.promises.readdir(dir);
  let max = 0;
  // Pattern: shiroani-YYYY-MM-DD.N.log
  const pattern = new RegExp(`^${escapeRegex(baseName)}\\.(\\d+)\\.log$`);
  for (const file of files) {
    const match = file.match(pattern);
    if (match) {
      const n = parseInt(match[1], 10);
      if (n > max) max = n;
    }
  }
  return max + 1;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Rotate the current log file if it exceeds LOG_MAX_FILE_SIZE.
 * Returns the path to write to (may be the same file or a new one after rotation).
 */
async function rotateIfNeeded(currentPath: string): Promise<void> {
  if (isRotating) return;
  isRotating = true;

  try {
    const stat = await fs.promises.stat(currentPath);
    if (stat.size < LOG_MAX_FILE_SIZE) return;

    const dir = path.dirname(currentPath);
    const ext = path.extname(currentPath); // .log
    const base = path.basename(currentPath, ext); // shiroani-YYYY-MM-DD
    const n = await getNextRotationNumber(dir, base);
    const rotatedPath = path.join(dir, `${base}.${n}${ext}`);

    await fs.promises.rename(currentPath, rotatedPath);
  } catch (error) {
    // File may not exist yet (first write), that's fine
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      handleLoggingError(error);
    }
  } finally {
    isRotating = false;
  }
}

// ============================================================================
// Cleanup
// ============================================================================

/**
 * Remove log files older than LOG_MAX_AGE_MS.
 */
async function cleanupOldLogs(): Promise<void> {
  try {
    const dir = getLogsDir();
    const files = await fs.promises.readdir(dir);
    const now = Date.now();

    for (const file of files) {
      // Only clean up our log files
      if (!file.startsWith(LOG_FILE_PREFIX) || !file.endsWith('.log')) continue;

      const filePath = path.join(dir, file);
      try {
        const stat = await fs.promises.stat(filePath);
        if (now - stat.mtimeMs > LOG_MAX_AGE_MS) {
          await fs.promises.unlink(filePath);
        }
      } catch {
        // Ignore individual file errors during cleanup
      }
    }
  } catch {
    // Ignore cleanup errors -- non-critical
  }
}

// ============================================================================
// Flush
// ============================================================================

/**
 * Flush buffered log entries to disk.
 */
async function doFlush(): Promise<void> {
  if (buffer.length === 0 || loggingFailed) return;

  const entries = buffer.splice(0);
  const logPath = getLogPath();

  try {
    await rotateIfNeeded(logPath);
    await fs.promises.appendFile(logPath, entries.join(''));
  } catch (error) {
    // Re-queue entries on failure so they are not lost
    buffer.unshift(...entries);
    handleLoggingError(error);
  }
}

/**
 * Force an immediate flush of all buffered logs. Returns a promise
 * that resolves when the flush is complete. Useful for before-quit.
 */
export async function flushLogs(): Promise<void> {
  await doFlush();
}

/**
 * Synchronously drain the in-memory write buffer to disk.
 *
 * Intended for `uncaughtException` / `unhandledRejection` handlers and any
 * other path where the process may exit before the event loop runs another
 * tick. Uses `fs.appendFileSync` so the write completes before returning.
 *
 * Safe to call after `flushLogs()` or the async flush timer — if the buffer
 * is empty, this is a no-op. On failure, entries are re-queued so a later
 * async flush can retry.
 */
export function flushLogsSync(): void {
  if (buffer.length === 0 || loggingFailed) return;

  const entries = buffer.splice(0);
  let logPath: string;
  try {
    logPath = getLogPath();
  } catch (error) {
    // Re-queue and bail — the logs dir may not be resolvable in the
    // middle of a crash (e.g. app not yet ready).
    buffer.unshift(...entries);
    handleLoggingError(error);
    return;
  }

  try {
    fs.appendFileSync(logPath, entries.join(''));
  } catch (error) {
    buffer.unshift(...entries);
    handleLoggingError(error);
  }
}

// ============================================================================
// Error handling
// ============================================================================

function handleLoggingError(error: unknown): void {
  if (!loggingErrorNotified) {
    loggingErrorNotified = true;
    if (onLoggingError) {
      try {
        onLoggingError(error);
      } catch {
        // Callback itself failed, ignore
      }
    }
    // Also log to console once
    console.error('[Logger] File logging failed:', error);
  }
  loggingFailed = true;
}

// ============================================================================
// File transport
// ============================================================================

/**
 * File transport function passed to createLogger.
 * Buffers messages and flushes periodically or when buffer is full.
 */
export const fileTransport = (message: string): void => {
  if (loggingFailed) return;

  buffer.push(message);

  // Force flush if buffer exceeds max entries
  if (buffer.length >= LOG_BUFFER_MAX_ENTRIES) {
    doFlush().catch(() => {
      // Error already handled in doFlush
    });
  }
};

// ============================================================================
// Initialization
// ============================================================================

/**
 * Initialize the file logging system.
 * Called automatically on module load -- sets up flush timer and cleanup.
 */
function initialize(): void {
  // Ensure logs directory exists
  try {
    getLogsDir();
  } catch (error) {
    handleLoggingError(error);
    return;
  }

  // Start periodic flush timer
  flushTimer = setInterval(() => {
    doFlush().catch(() => {
      // Error already handled in doFlush
    });
  }, LOG_FLUSH_INTERVAL_MS);

  // Run initial cleanup
  cleanupOldLogs();

  // Schedule periodic cleanup
  cleanupTimer = setInterval(() => {
    cleanupOldLogs();
  }, LOG_CLEANUP_INTERVAL_MS);

  // Unref timers so they don't prevent process exit
  if (flushTimer && typeof flushTimer === 'object' && 'unref' in flushTimer) {
    flushTimer.unref();
  }
  if (cleanupTimer && typeof cleanupTimer === 'object' && 'unref' in cleanupTimer) {
    cleanupTimer.unref();
  }
}

// Initialize on module load
initialize();

// ============================================================================
// Logger instance
// ============================================================================

// Enable timestamps for main process logs
setTimestampsEnabled(true);

const loggerOptions: LoggerOptions = {
  fileTransport,
};

/**
 * Create a logger for the main process that writes to both console and log file.
 * Use this instead of the shared `createLogger` in all desktop main-process code.
 */
export function createMainLogger(context: string) {
  return createLogger(context, loggerOptions);
}

/** Main process logger */
export const logger = createMainLogger('Main');

// ============================================================================
// electron-updater shim
// ============================================================================

/**
 * Minimal subset of `electron-updater`'s `AppUpdater` surface we need in order
 * to install a logger. Declaring this locally keeps `logger.ts` free of a
 * compile-time dependency on `electron-updater` (the caller, `updater.ts`,
 * owns that import).
 */
export interface UpdaterLoggerTarget {
  logger: {
    info(message?: unknown): void;
    warn(message?: unknown): void;
    error(message?: unknown): void;
    debug?(message: string): void;
  } | null;
}

/**
 * Install a logger shim on the given `electron-updater` instance so its
 * internal debug output is routed through `createMainLogger('AutoUpdater')`
 * and written to our log file from the first tick.
 *
 * The caller owns the `electron-updater` import; pass `autoUpdater` in.
 */
export function attachUpdaterLogger(target: UpdaterLoggerTarget): void {
  const updaterLogger = createMainLogger('AutoUpdater');
  target.logger = {
    info: (message?: unknown) => updaterLogger.info(message),
    warn: (message?: unknown) => updaterLogger.warn(message),
    error: (message?: unknown) => updaterLogger.error(message),
    debug: (message: string) => updaterLogger.debug(message),
  };
}

export default logger;
