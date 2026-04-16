/**
 * Localhost HTTP server that fronts the player sessions.
 *
 * Routes (all scoped to one app-wide instance on 127.0.0.1:<random>):
 *   - GET /stream/:sessionId        -> pipes the session's ffmpeg stdout
 *   - GET /subs/:sessionId/:index.ass -> serves an extracted ASS file
 *   - GET /fonts/:sessionId/:name   -> serves an extracted font attachment
 *
 * Security posture:
 *   - bound to 127.0.0.1 only (OS-level loopback restriction)
 *   - additional Host: header check rejects requests not coming from
 *     127.0.0.1 / localhost -- belt-and-suspenders against DNS rebinding
 *     attacks, though Electron's renderer context already makes this
 *     unreachable
 *
 * Content type:
 *   - /stream responds with `video/mp4` (the fragmented-MP4 ffmpeg pipeline
 *     emits), 200 status, no Content-Length (stream is live). Range headers
 *     are ignored -- the renderer seeks via the SEEK_PLAYER_SESSION socket
 *     event which restarts the pipeline.
 *   - /subs responds with `text/x-ssa` and the file bytes.
 *   - /fonts responds with `application/octet-stream` (fonts are font-format
 *     specific, but the renderer's FontFace API infers type from the bytes).
 */

import * as http from 'node:http';
import { createReadStream, promises as fs } from 'node:fs';
import path from 'node:path';
import { createLogger, LOCALHOST } from '@shiroani/shared';
import { isOriginAllowed } from '../../shared/cors.config';

import type { SessionRegistry } from './session-registry';

const logger = createLogger('PlayerHttpServer');

/** MIME for the fragmented-MP4 body produced by the ffmpeg pipeline. */
const STREAM_CONTENT_TYPE = 'video/mp4';
/** MIME JASSUB accepts for ASS (SSA v4+). */
const SUBS_CONTENT_TYPE = 'text/x-ssa; charset=utf-8';
const FONT_CONTENT_TYPE = 'application/octet-stream';

/** URL matchers for each route. */
const STREAM_RE = /^\/stream\/([A-Za-z0-9_-]+)\/?$/;
const SUBS_RE = /^\/subs\/([A-Za-z0-9_-]+)\/(\d+)\.ass$/;
const FONTS_RE = /^\/fonts\/([A-Za-z0-9_-]+)\/([^/?#]+)$/;

export interface PlayerHttpServerHandle {
  readonly port: number;
  close(): Promise<void>;
}

/**
 * Start the player HTTP server on a random free port and return a handle.
 * Safe to call exactly once per app lifetime -- the port is published via
 * the handle and consumed by PlayerService when minting session URLs.
 */
export async function startPlayerHttpServer(
  registry: SessionRegistry
): Promise<PlayerHttpServerHandle> {
  const server = http.createServer((req, res) => {
    handleRequest(req, res, registry).catch(err => {
      logger.error(`Request error: ${(err as Error).message}`);
      if (!res.headersSent) {
        res.statusCode = 500;
        res.setHeader('Cache-Control', 'no-store');
        res.end('internal error');
      } else if (!res.writableEnded) {
        res.end();
      }
    });
  });

  server.on('clientError', (err, socket) => {
    logger.debug(`clientError: ${err.message}`);
    socket.destroy();
  });

  await new Promise<void>((resolve, reject) => {
    const onError = (err: Error): void => {
      server.off('listening', onListening);
      reject(err);
    };
    const onListening = (): void => {
      server.off('error', onError);
      resolve();
    };
    server.once('error', onError);
    server.once('listening', onListening);
    // `0` asks the OS for a free port; 127.0.0.1 scopes the bind to loopback.
    server.listen(0, LOCALHOST);
  });

  const addr = server.address();
  if (!addr || typeof addr === 'string') {
    server.close();
    throw new Error(`Failed to get player server port: address() = ${JSON.stringify(addr)}`);
  }
  const port = addr.port;
  logger.info(`Player HTTP server listening on ${LOCALHOST}:${port}`);

  return {
    port,
    close(): Promise<void> {
      return new Promise(resolve => {
        server.close(err => {
          if (err) {
            logger.warn(`Error closing player server: ${err.message}`);
          }
          resolve();
        });
      });
    },
  };
}

async function handleRequest(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  registry: SessionRegistry
): Promise<void> {
  // Host header guard -- second line of defense on top of the loopback bind.
  const host = (req.headers.host ?? '').split(':')[0];
  if (host !== LOCALHOST && host !== 'localhost') {
    logger.warn(`[security] Rejected request from host=${host}`);
    res.statusCode = 403;
    res.setHeader('Cache-Control', 'no-store');
    res.end('forbidden');
    return;
  }

  if (!applyCorsHeaders(req, res)) {
    return;
  }

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.setHeader('Allow', 'GET, HEAD, OPTIONS');
    res.setHeader('Cache-Control', 'no-store');
    res.end();
    return;
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.statusCode = 405;
    res.setHeader('Allow', 'GET, HEAD, OPTIONS');
    res.setHeader('Cache-Control', 'no-store');
    res.end();
    return;
  }

  const url = req.url ?? '';
  // Strip query string -- none of our routes use it.
  const pathname = url.split('?')[0] ?? '';

  const streamMatch = STREAM_RE.exec(pathname);
  if (streamMatch) {
    await handleStream(res, registry, streamMatch[1]!);
    return;
  }

  const subsMatch = SUBS_RE.exec(pathname);
  if (subsMatch) {
    await handleSubs(res, registry, subsMatch[1]!, Number(subsMatch[2]));
    return;
  }

  const fontsMatch = FONTS_RE.exec(pathname);
  if (fontsMatch) {
    await handleFont(res, registry, fontsMatch[1]!, decodeURIComponent(fontsMatch[2]!));
    return;
  }

  res.statusCode = 404;
  res.setHeader('Cache-Control', 'no-store');
  res.end('not found');
}

function applyCorsHeaders(req: http.IncomingMessage, res: http.ServerResponse): boolean {
  const origin = req.headers.origin;
  if (!origin) {
    return true;
  }

  if (!isOriginAllowed(origin)) {
    logger.warn(`[security] Rejected request from origin=${origin}`);
    res.statusCode = 403;
    res.setHeader('Cache-Control', 'no-store');
    res.end('forbidden');
    return false;
  }

  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  const requestedHeaders = req.headers['access-control-request-headers'];
  if (requestedHeaders) {
    res.setHeader('Access-Control-Allow-Headers', requestedHeaders);
  }

  const vary = res.getHeader('Vary');
  if (typeof vary === 'string' && vary.length > 0) {
    res.setHeader('Vary', `${vary}, Origin`);
  } else if (Array.isArray(vary) && vary.length > 0) {
    res.setHeader('Vary', [...vary, 'Origin']);
  } else {
    res.setHeader('Vary', 'Origin');
  }

  return true;
}

function handleStream(
  res: http.ServerResponse,
  registry: SessionRegistry,
  sessionId: string
): Promise<void> {
  const state = registry.get(sessionId);
  if (!state) {
    res.statusCode = 404;
    res.setHeader('Cache-Control', 'no-store');
    res.end('session not found');
    return Promise.resolve();
  }

  // Touch LRU + stale-timestamp before kicking off the pipe.
  registry.touch(sessionId);

  // We deliberately ignore Range headers. The ffmpeg pipeline produces a
  // live fragmented-MP4 stream; partial-content responses don't map onto
  // an indeterminate-length producer. Chromium tolerates a 200 with no
  // Content-Length for fMP4 -- same pattern Jellyfin uses.
  res.statusCode = 200;
  res.setHeader('Content-Type', STREAM_CONTENT_TYPE);
  res.setHeader('Cache-Control', 'no-store');
  // `Accept-Ranges: none` tells Chromium not to retry with a Range on
  // reconnect -- saves a round-trip on seek.
  res.setHeader('Accept-Ranges', 'none');
  res.setHeader('Connection', 'close');

  state.ffmpeg.pipeTo(res);
  return Promise.resolve();
}

async function handleSubs(
  res: http.ServerResponse,
  registry: SessionRegistry,
  sessionId: string,
  streamIndex: number
): Promise<void> {
  const state = registry.get(sessionId);
  if (!state) {
    res.statusCode = 404;
    res.setHeader('Cache-Control', 'no-store');
    res.end('session not found');
    return;
  }

  registry.touch(sessionId);

  const entry = state.subtitleTracks.find(s => s.track.index === streamIndex);
  if (!entry || !entry.extractedPath) {
    res.statusCode = 404;
    res.setHeader('Cache-Control', 'no-store');
    res.end('subtitle track not found');
    return;
  }

  try {
    const stat = await fs.stat(entry.extractedPath);
    res.statusCode = 200;
    res.setHeader('Content-Type', SUBS_CONTENT_TYPE);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Length', stat.size.toString());
    createReadStream(entry.extractedPath).pipe(res);
  } catch {
    res.statusCode = 404;
    res.setHeader('Cache-Control', 'no-store');
    res.end('subtitle file missing');
  }
}

async function handleFont(
  res: http.ServerResponse,
  registry: SessionRegistry,
  sessionId: string,
  filename: string
): Promise<void> {
  const state = registry.get(sessionId);
  if (!state) {
    res.statusCode = 404;
    res.setHeader('Cache-Control', 'no-store');
    res.end('session not found');
    return;
  }

  registry.touch(sessionId);

  // Resolve the filename against the session's fonts dir and verify it
  // hasn't traversed out. Never trust the path string from the URL.
  const fontsDir = path.join(state.tmpDir, 'fonts');
  const resolved = path.resolve(fontsDir, filename);
  const fontsDirResolved = path.resolve(fontsDir) + path.sep;
  if (!(resolved + path.sep).startsWith(fontsDirResolved) && resolved !== path.resolve(fontsDir)) {
    logger.warn(`[security] font path traversal attempt session=${sessionId} filename=${filename}`);
    res.statusCode = 403;
    res.setHeader('Cache-Control', 'no-store');
    res.end('forbidden');
    return;
  }

  const match = state.fonts.find(f => f.absolutePath === resolved);
  if (!match) {
    res.statusCode = 404;
    res.setHeader('Cache-Control', 'no-store');
    res.end('font not found');
    return;
  }

  try {
    const stat = await fs.stat(match.absolutePath);
    res.statusCode = 200;
    res.setHeader('Content-Type', FONT_CONTENT_TYPE);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Length', stat.size.toString());
    createReadStream(match.absolutePath).pipe(res);
  } catch {
    res.statusCode = 404;
    res.setHeader('Cache-Control', 'no-store');
    res.end('font file missing');
  }
}
