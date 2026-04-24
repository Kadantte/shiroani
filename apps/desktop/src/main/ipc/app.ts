import { ipcMain, app, shell, clipboard, nativeImage } from 'electron';
import { existsSync } from 'fs';
import { readdir, stat, readFile, writeFile } from 'fs/promises';
import { join, resolve, sep } from 'path';
import { release as osRelease } from 'os';
import { gunzipSync } from 'zlib';
import {
  LOG_FILE_PREFIX,
  LOG_MAX_FILE_SIZE,
  setLogLevel,
  getLogLevel,
  LogLevel,
} from '@shiroani/shared';
import { getLogsDir, createMainLogger } from '../logging/logger';
import { getBackendPort } from '../backend-port';
import { handle, handleWithFallback } from './with-ipc-handler';
import {
  appGetPathSchema,
  appGetVersionSchema,
  appGetSystemInfoSchema,
  appOpenLogsFolderSchema,
  appClipboardWriteSchema,
  appFetchImageBase64Schema,
  appClipboardWriteImageSchema,
  appSaveFileBinarySchema,
  appGetAutoLaunchSchema,
  appSetAutoLaunchSchema,
  appGetBackendPortSchema,
  appListLogFilesSchema,
  appSetLogLevelSchema,
  appReadLogFileSchema,
} from './schemas';

const logger = createMainLogger('IPC:App');

// Dedicated forwarder logger — keeps renderer-originated entries visually
// distinct (and separable via the `Renderer:*` context) from main-process ones.
const rendererForwardLoggers = new Map<string, ReturnType<typeof createMainLogger>>();
function getRendererForwardLogger(subContext: string): ReturnType<typeof createMainLogger> {
  const tag = `Renderer:${subContext}`;
  let existing = rendererForwardLoggers.get(tag);
  if (!existing) {
    existing = createMainLogger(tag);
    rendererForwardLoggers.set(tag, existing);
  }
  return existing;
}

const ALLOWED_LOG_LEVELS = new Set(['error', 'warn', 'info', 'debug'] as const);
type AllowedLogLevel = 'error' | 'warn' | 'info' | 'debug';

// Clamp thresholds — prevent a runaway renderer from bloating the log file.
const RENDERER_LOG_MESSAGE_MAX = 16 * 1024; // 16 KB
const RENDERER_LOG_DATA_MAX = 32 * 1024; // 32 KB
const TRUNCATED_SUFFIX = '...[truncated]';

// ── app:fetch-image-base64 security limits ──────────────────────────────
// Keep in lock-step with the documented threat model: renderer-driven fetches
// of remote images (AniList covers/avatars) for canvas-composed profile cards.
// Anything larger than this is almost certainly not an AniList cover.
const FETCH_IMAGE_MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const FETCH_IMAGE_TIMEOUT_MS = 8_000;

/**
 * Allowlisted host suffixes for `app:fetch-image-base64`.
 *
 * The only current caller is the profile-card canvas (AniList covers/avatars +
 * Google favicons). Keep the list narrow and add hosts only when a new,
 * main-process-fetched image source is intentionally introduced.
 */
const FETCH_IMAGE_HOST_SUFFIXES: readonly string[] = [
  '.anilist.co', // AniList CDN — s4.anilist.co covers, avatars
  'anilist.co',
  '.google.com', // Google favicon service (www.google.com/s2/favicons)
  'google.com',
  '.gstatic.com', // Google static assets (occasional redirect target)
  'gstatic.com',
];

/**
 * Block literal private, loopback, and link-local addresses. We don't do DNS
 * resolution (the OS fetch happens after this check and would race anyway);
 * this is a defence-in-depth layer against URLs that use literal IPs.
 *
 * Covers IPv4 RFC1918 (`10/8`, `172.16/12`, `192.168/16`), loopback (`127/8`),
 * link-local (`169.254/16`), the `::1` IPv6 loopback, and the `fd00::/8`
 * IPv6 ULA range.
 */
function isPrivateHostLiteral(host: string): boolean {
  const normalized = host.trim().toLowerCase();
  if (!normalized) return true;

  // IPv6: strip brackets if present (URL.hostname for [::1] returns '[::1]')
  const unbracketed =
    normalized.startsWith('[') && normalized.endsWith(']') ? normalized.slice(1, -1) : normalized;

  if (unbracketed === '::1' || unbracketed === '::') return true;
  // IPv6 ULA fd00::/8 — hex byte starting with 'fc' or 'fd'
  if (/^f[cd][0-9a-f]{0,2}:/.test(unbracketed)) return true;
  // IPv6 link-local fe80::/10
  if (/^fe[89ab][0-9a-f]?:/.test(unbracketed)) return true;

  // IPv4 dotted-quad checks
  const ipv4 = unbracketed.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const [, aStr, bStr] = ipv4;
    const a = Number(aStr);
    const b = Number(bStr);
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
  }

  // Hostnames that should never be fetched
  if (unbracketed === 'localhost' || unbracketed.endsWith('.localhost')) return true;

  return false;
}

/** Whether `host` matches one of the configured allowlist suffixes. */
function isAllowedImageHost(host: string): boolean {
  const normalized = host.trim().toLowerCase();
  if (!normalized) return false;
  return FETCH_IMAGE_HOST_SUFFIXES.some(suffix =>
    suffix.startsWith('.') ? normalized.endsWith(suffix) : normalized === suffix
  );
}

// ── app:log-write rate limiter ──────────────────────────────────────────
// Token bucket per renderer (keyed by `event.sender.id`). Renderers can burst
// up to LOG_WRITE_RATE_LIMIT entries per second; excess drops silently so a
// runaway renderer can't flood the on-disk log.
const LOG_WRITE_RATE_LIMIT = 100; // entries per window
const LOG_WRITE_WINDOW_MS = 1_000;
interface LogRateBucket {
  count: number;
  resetAt: number;
}
const logRateBuckets = new Map<number, LogRateBucket>();

function shouldAcceptLogWrite(senderId: number): boolean {
  const now = Date.now();
  const bucket = logRateBuckets.get(senderId);
  if (!bucket || now >= bucket.resetAt) {
    logRateBuckets.set(senderId, { count: 1, resetAt: now + LOG_WRITE_WINDOW_MS });
    return true;
  }
  if (bucket.count >= LOG_WRITE_RATE_LIMIT) {
    return false;
  }
  bucket.count += 1;
  return true;
}

function clampString(value: string, max: number): string {
  if (value.length <= max) return value;
  return value.slice(0, Math.max(0, max - TRUNCATED_SUFFIX.length)) + TRUNCATED_SUFFIX;
}

function clampSerializedData(data: unknown): unknown {
  if (data === undefined) return undefined;
  let serialized: string;
  try {
    serialized = typeof data === 'string' ? data : JSON.stringify(data);
  } catch {
    // Fall back to String() for non-serializable values (circular refs, BigInt).
    serialized = String(data);
  }
  if (serialized.length <= RENDERER_LOG_DATA_MAX) return data;
  return clampString(serialized, RENDERER_LOG_DATA_MAX);
}

function logLevelName(level: LogLevel): AllowedLogLevel {
  switch (level) {
    case LogLevel.ERROR:
      return 'error';
    case LogLevel.WARN:
      return 'warn';
    case LogLevel.DEBUG:
      return 'debug';
    case LogLevel.INFO:
    default:
      return 'info';
  }
}

/**
 * Register app-related IPC handlers
 */
export function registerAppHandlers(): void {
  const ALLOWED_PATH_NAMES = new Set([
    'userData',
    'home',
    'documents',
    'downloads',
    'desktop',
    'logs',
    'temp',
  ]);

  handleWithFallback(
    'app:get-path',
    (_event, name) => {
      if (!ALLOWED_PATH_NAMES.has(name)) {
        logger.warn(`[security] Blocked app:get-path for non-whitelisted name: "${name}"`);
        return undefined;
      }
      logger.debug(`app:get-path invoked for "${name}"`);
      return app.getPath(name as Parameters<typeof app.getPath>[0]);
    },
    () => undefined,
    { schema: appGetPathSchema }
  );

  handle(
    'app:get-version',
    () => {
      logger.debug('app:get-version invoked');
      return app.getVersion();
    },
    { schema: appGetVersionSchema }
  );

  handleWithFallback(
    'app:get-system-info',
    () => {
      logger.debug('app:get-system-info invoked');
      // getGPUFeatureStatus can throw very early in startup; guard so diagnostics
      // still render a best-effort payload.
      let gpuFeatureStatus: Record<string, string> | { error: string };
      try {
        gpuFeatureStatus = app.getGPUFeatureStatus() as unknown as Record<string, string>;
      } catch (err) {
        gpuFeatureStatus = { error: err instanceof Error ? err.message : String(err) };
      }
      return {
        appVersion: app.getVersion(),
        electronVersion: process.versions.electron ?? 'unknown',
        chromeVersion: process.versions.chrome ?? 'unknown',
        nodeVersion: process.versions.node ?? 'unknown',
        osPlatform: process.platform,
        osRelease: osRelease(),
        arch: process.arch,
        userDataPath: app.getPath('userData'),
        logsPath: getLogsDir(),
        gpuFeatureStatus,
      };
    },
    () => ({
      appVersion: 'unknown',
      electronVersion: 'unknown',
      chromeVersion: 'unknown',
      nodeVersion: 'unknown',
      osPlatform: process.platform,
      osRelease: 'unknown',
      arch: process.arch,
      userDataPath: '',
      logsPath: '',
      gpuFeatureStatus: { error: 'unavailable' } as Record<string, string> | { error: string },
    }),
    { schema: appGetSystemInfoSchema }
  );

  handle(
    'app:open-logs-folder',
    async () => {
      logger.debug('app:open-logs-folder invoked');
      const logsPath = getLogsDir();
      await shell.openPath(logsPath);
    },
    { schema: appOpenLogsFolderSchema }
  );

  handle(
    'app:clipboard-write',
    (_event, text) => {
      clipboard.writeText(text);
    },
    { schema: appClipboardWriteSchema }
  );

  handleWithFallback(
    'app:fetch-image-base64',
    async (_event, url): Promise<string | null> => {
      let parsed: URL;
      try {
        parsed = new URL(url);
      } catch {
        return null;
      }
      if (parsed.protocol !== 'https:') return null;

      // SSRF guard: reject private/loopback/link-local literals so a renderer
      // can't coerce the main process into probing LAN HTTPS services.
      if (isPrivateHostLiteral(parsed.hostname)) {
        logger.warn(
          `[security] Blocked app:fetch-image-base64 for private host: ${parsed.hostname}`
        );
        return null;
      }

      // Host allowlist: keep this tight — the only current caller is the
      // profile-card canvas (AniList covers/avatars + Google favicons).
      if (!isAllowedImageHost(parsed.hostname)) {
        logger.warn(
          `[security] Blocked app:fetch-image-base64 for non-allowlisted host: ${parsed.hostname}`
        );
        return null;
      }

      try {
        // Manual redirect loop: validate every Location hop before following so
        // a redirecting CDN can never coerce the main process into probing a
        // private host (the redirect: 'follow' path makes the hop request
        // before we can inspect the destination).
        const MAX_REDIRECTS = 5;
        let currentUrl = url;
        let res!: Response;
        for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
          res = await fetch(currentUrl, {
            signal: AbortSignal.timeout(FETCH_IMAGE_TIMEOUT_MS),
            redirect: 'manual',
          });
          if (res.status < 300 || res.status >= 400) break;
          const location = res.headers.get('location');
          if (!location) return null;
          let nextUrl: URL;
          try {
            nextUrl = new URL(location, currentUrl);
          } catch {
            return null;
          }
          if (
            nextUrl.protocol !== 'https:' ||
            isPrivateHostLiteral(nextUrl.hostname) ||
            !isAllowedImageHost(nextUrl.hostname)
          ) {
            logger.warn(
              `[security] Blocked app:fetch-image-base64 redirect to disallowed host: ${nextUrl.hostname}`
            );
            return null;
          }
          if (hop === MAX_REDIRECTS) {
            logger.warn('[security] Blocked app:fetch-image-base64 redirect chain too long');
            return null;
          }
          currentUrl = nextUrl.href;
        }
        if (!res.ok) return null;

        // Content-Type must declare an image. Rejects HTML/JSON/etc. that
        // a misconfigured allowlisted host might serve.
        const contentTypeHeader = res.headers.get('content-type') ?? '';
        if (!contentTypeHeader.toLowerCase().startsWith('image/')) {
          logger.warn(
            `[security] Blocked app:fetch-image-base64 non-image content-type: ${contentTypeHeader}`
          );
          return null;
        }

        // Size cap: reject early via Content-Length when present, otherwise
        // enforce against the downloaded buffer. AniList covers are ~100KB;
        // 5 MB is a comfortable ceiling that still blocks abuse.
        const declaredLength = Number(res.headers.get('content-length') ?? '');
        if (Number.isFinite(declaredLength) && declaredLength > FETCH_IMAGE_MAX_BYTES) {
          logger.warn(
            `[security] Blocked app:fetch-image-base64 oversized content-length: ${declaredLength}`
          );
          return null;
        }

        // Stream body with a running byte count so we never allocate more than
        // FETCH_IMAGE_MAX_BYTES regardless of whether Content-Length was present.
        if (!res.body) return null;
        const reader = res.body.getReader();
        const chunks: Uint8Array[] = [];
        let totalBytes = 0;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          totalBytes += value.byteLength;
          if (totalBytes > FETCH_IMAGE_MAX_BYTES) {
            await reader.cancel();
            logger.warn(
              `[security] Blocked app:fetch-image-base64 oversized stream: >${FETCH_IMAGE_MAX_BYTES} bytes`
            );
            return null;
          }
          chunks.push(value);
        }
        const buffer = Buffer.concat(chunks.map(c => Buffer.from(c)));

        // Strip any parameters from content-type (e.g. "image/jpeg; charset=x")
        // before echoing into the data URL — keeps the result canonical.
        const mime = contentTypeHeader.split(';')[0].trim() || 'image/jpeg';
        return `data:${mime};base64,${buffer.toString('base64')}`;
      } catch (error) {
        logger.warn(`Failed to fetch image: ${url}`, error);
        return null;
      }
    },
    () => null,
    { schema: appFetchImageBase64Schema }
  );

  handle(
    'app:clipboard-write-image',
    (_event, pngBase64) => {
      const image = nativeImage.createFromBuffer(Buffer.from(pngBase64, 'base64'));
      if (image.isEmpty()) {
        throw new Error('Failed to create image from provided data');
      }
      clipboard.writeImage(image);
    },
    { schema: appClipboardWriteImageSchema }
  );

  handle(
    'app:save-file-binary',
    async (_event, filePath, base64Data) => {
      const resolved = resolve(filePath);
      const allowedDirs = [
        app.getPath('documents'),
        app.getPath('downloads'),
        app.getPath('desktop'),
        app.getPath('pictures'),
      ];
      const isAllowed = allowedDirs.some(dir => resolved.startsWith(dir + sep) || resolved === dir);
      if (!isAllowed) {
        logger.warn(`[security] Blocked save-file-binary outside allowed directories: ${resolved}`);
        throw new Error('File path outside allowed directories');
      }
      await writeFile(resolved, Buffer.from(base64Data, 'base64'));
      return { success: true };
    },
    { schema: appSaveFileBinarySchema }
  );

  handle(
    'app:get-auto-launch',
    () => {
      logger.debug('app:get-auto-launch invoked');
      return app.getLoginItemSettings().openAtLogin;
    },
    { schema: appGetAutoLaunchSchema }
  );

  handle(
    'app:set-auto-launch',
    (_event, enabled) => {
      logger.debug(`app:set-auto-launch invoked: ${enabled}`);
      app.setLoginItemSettings({ openAtLogin: enabled });
      return app.getLoginItemSettings().openAtLogin;
    },
    { schema: appSetAutoLaunchSchema }
  );

  handle(
    'app:get-backend-port',
    () => {
      logger.debug('app:get-backend-port invoked');
      return getBackendPort();
    },
    { schema: appGetBackendPortSchema }
  );

  handleWithFallback(
    'app:list-log-files',
    async () => {
      logger.debug('app:list-log-files invoked');
      const logsDir = getLogsDir();
      if (!existsSync(logsDir)) return [];

      const entries = await readdir(logsDir);
      const logFiles: { name: string; size: number; lastModified: number }[] = [];

      for (const entry of entries) {
        if (!entry.startsWith(LOG_FILE_PREFIX)) continue;
        if (!entry.endsWith('.log') && !entry.endsWith('.log.gz')) continue;
        const fileStat = await stat(join(logsDir, entry));
        if (!fileStat.isFile()) continue;
        logFiles.push({
          name: entry,
          size: fileStat.size,
          lastModified: fileStat.mtimeMs,
        });
      }

      return logFiles.sort((a, b) => b.lastModified - a.lastModified);
    },
    () => [],
    { schema: appListLogFilesSchema }
  );

  // app:log-write — MUST never throw back to the renderer. We deliberately do
  // NOT attach a Zod schema here (BAD_REQUEST bypasses the fallback path);
  // instead we keep the original permissive shape check and silently drop
  // invalid payloads.
  handleWithFallback(
    'app:log-write',
    (event, payload: unknown) => {
      // Rate-limit per sender so a runaway renderer can't flood the log file.
      // `event.sender.id` is stable per webContents; the bucket self-resets each
      // LOG_WRITE_WINDOW_MS. In tests the mock passes `{}` as the event — guard
      // against a missing sender so the handler stays permissive there.
      const senderId: number | undefined = event?.sender?.id;
      if (typeof senderId === 'number' && !shouldAcceptLogWrite(senderId)) {
        return;
      }

      if (!payload || typeof payload !== 'object') return;
      const entry = payload as {
        level?: unknown;
        context?: unknown;
        message?: unknown;
        data?: unknown;
      };

      const rawLevel = typeof entry.level === 'string' ? entry.level.toLowerCase() : '';
      if (!ALLOWED_LOG_LEVELS.has(rawLevel as AllowedLogLevel)) return;
      const level = rawLevel as AllowedLogLevel;

      if (typeof entry.context !== 'string' || entry.context.length === 0) return;
      if (typeof entry.message !== 'string') return;

      const message = clampString(entry.message, RENDERER_LOG_MESSAGE_MAX);
      const forwardLogger = getRendererForwardLogger(entry.context);

      if (entry.data === undefined) {
        forwardLogger[level](message);
      } else {
        forwardLogger[level](message, clampSerializedData(entry.data));
      }
    },
    () => undefined
  );

  handleWithFallback(
    'app:set-log-level',
    (_event, payload) => {
      const requested = payload?.level;
      const rawLevel = typeof requested === 'string' ? requested.toLowerCase() : '';
      if (!ALLOWED_LOG_LEVELS.has(rawLevel as AllowedLogLevel)) {
        return { ok: false, level: logLevelName(getLogLevel()) };
      }
      setLogLevel(rawLevel);
      const current = logLevelName(getLogLevel());
      logger.debug(`app:set-log-level → ${current}`);
      return { ok: current === rawLevel, level: current };
    },
    () => ({ ok: false, level: logLevelName(getLogLevel()) }),
    { schema: appSetLogLevelSchema }
  );

  handle(
    'app:read-log-file',
    async (_event, fileName) => {
      logger.debug(`app:read-log-file invoked for "${fileName}"`);

      // Security: reject path traversal, null bytes, and invalid filenames.
      // Allowlist matches both `.log` and `.log.gz` rotated siblings.
      const isGzipped = fileName.endsWith('.log.gz');
      const hasValidSuffix = fileName.endsWith('.log') || isGzipped;
      if (
        fileName.includes('\0') ||
        fileName.includes('/') ||
        fileName.includes('\\') ||
        fileName.includes('..') ||
        !fileName.startsWith(LOG_FILE_PREFIX) ||
        !hasValidSuffix
      ) {
        throw new Error('Invalid log file name');
      }

      const filePath = join(getLogsDir(), fileName);

      // For uncompressed `.log`, enforce the cap against on-disk size before
      // reading. For `.log.gz`, the on-disk size is post-compression so we have
      // to decompress first; the cap is then applied to the decompressed length
      // and we truncate (with a trailing JSONL warn line) instead of rejecting.
      let fileStat: Awaited<ReturnType<typeof stat>>;
      try {
        fileStat = await stat(filePath);
      } catch (err: unknown) {
        if (
          err instanceof Error &&
          'code' in err &&
          (err as NodeJS.ErrnoException).code === 'ENOENT'
        ) {
          throw new Error('Log file not found', { cause: err });
        }
        throw err;
      }

      if (!isGzipped) {
        if (fileStat.size > LOG_MAX_FILE_SIZE) {
          throw new Error(`Log file exceeds ${LOG_MAX_FILE_SIZE / (1024 * 1024)}MB limit`);
        }
        return readFile(filePath, 'utf-8');
      }

      // Compressed branch: gunzip, then enforce the cap on decompressed bytes.
      const compressed = await readFile(filePath);
      let decompressed: Buffer;
      try {
        decompressed = gunzipSync(compressed);
      } catch (err) {
        throw new Error('Failed to decompress log file', { cause: err });
      }

      if (decompressed.length <= LOG_MAX_FILE_SIZE) {
        return decompressed.toString('utf-8');
      }

      const truncationNotice =
        JSON.stringify({
          level: 'warn',
          context: 'LogFile',
          message: `truncated at ${LOG_MAX_FILE_SIZE} bytes`,
        }) + '\n';
      // Reserve room for the notice so the total payload stays under the cap.
      const noticeBytes = Buffer.byteLength(truncationNotice, 'utf-8');
      const sliceLen = Math.max(0, LOG_MAX_FILE_SIZE - noticeBytes);
      let head = decompressed.subarray(0, sliceLen).toString('utf-8');
      // Don't leave a partial JSONL line dangling — chop back to the last `\n`
      // so the caller still sees well-formed lines before the notice.
      const lastNewline = head.lastIndexOf('\n');
      if (lastNewline >= 0) head = head.slice(0, lastNewline + 1);
      return head + truncationNotice;
    },
    { schema: appReadLogFileSchema }
  );
}

/**
 * Clean up app-related IPC handlers
 */
export function cleanupAppHandlers(): void {
  ipcMain.removeHandler('app:get-path');
  ipcMain.removeHandler('app:get-version');
  ipcMain.removeHandler('app:get-system-info');
  ipcMain.removeHandler('app:open-logs-folder');
  ipcMain.removeHandler('app:clipboard-write');
  ipcMain.removeHandler('app:clipboard-write-image');
  ipcMain.removeHandler('app:save-file-binary');
  ipcMain.removeHandler('app:get-auto-launch');
  ipcMain.removeHandler('app:set-auto-launch');
  ipcMain.removeHandler('app:get-backend-port');
  ipcMain.removeHandler('app:list-log-files');
  ipcMain.removeHandler('app:read-log-file');
  ipcMain.removeHandler('app:log-write');
  ipcMain.removeHandler('app:set-log-level');
}
