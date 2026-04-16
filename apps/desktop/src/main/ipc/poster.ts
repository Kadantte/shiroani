/**
 * Custom `shiroani-poster://` protocol that serves artwork cached by the
 * local-library feature. Same pattern as `shiroani-bg://` — scheme is
 * registered as privileged before app.ready, then wired up with `protocol.handle`
 * after app.ready.
 *
 * URL format:
 *   shiroani-poster://<kind>/<seriesId>
 *
 * where `<kind>` is `poster` or `banner`. A query string like `?v=<mtime>` is
 * accepted (and ignored by the handler) so the renderer can bust the browser
 * image cache after a user changes the artwork.
 */

import { app, net, protocol } from 'electron';
import { join } from 'path';
import { existsSync, readdirSync } from 'fs';
import { createMainLogger } from '../logger';

const logger = createMainLogger('Poster');

const ALLOWED_KINDS = new Set(['posters', 'banners']);

function getCacheDir(kind: 'posters' | 'banners'): string {
  return join(app.getPath('userData'), 'library-cache', kind);
}

/**
 * Resolve the absolute cached file path for a series id. We don't know the
 * extension up-front (the cache keeps the source extension), so we list the
 * directory and pick the first match.
 */
function resolveCachedArtwork(kind: 'posters' | 'banners', seriesId: number): string | null {
  const dir = getCacheDir(kind);
  if (!existsSync(dir)) return null;
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return null;
  }
  const prefix = `${seriesId}.`;
  const match = entries.find(name => name.startsWith(prefix));
  return match ? join(dir, match) : null;
}

/**
 * Register the shiroani-poster:// protocol handler. Must be called after
 * app.ready, same as the background protocol.
 */
export function registerPosterProtocol(): void {
  protocol.handle('shiroani-poster', request => {
    const url = new URL(request.url);
    // The "kind" is stored in URL.hostname (because shiroani-poster://<kind>/<id>
    // treats <kind> as the host part). Fall back to pathname segment 0 for the
    // `shiroani-poster:/<kind>/<id>` variant.
    const hostFromUrl = url.hostname || '';
    const pathSegments = url.pathname.split('/').filter(Boolean);

    let kindSegment: string;
    let idSegment: string;

    if (hostFromUrl) {
      // shiroani-poster://posters/42 -> host='posters', path='/42'
      const subKind =
        hostFromUrl === 'poster' ? 'posters' : hostFromUrl === 'banner' ? 'banners' : hostFromUrl;
      kindSegment = subKind;
      idSegment = pathSegments[0] ?? '';
    } else {
      kindSegment = pathSegments[0] ?? '';
      idSegment = pathSegments[1] ?? '';
    }

    if (!ALLOWED_KINDS.has(kindSegment)) {
      logger.warn(`Blocked poster request with unknown kind: "${kindSegment}"`);
      return new Response('Forbidden', { status: 403 });
    }

    const seriesId = Number.parseInt(idSegment, 10);
    if (!Number.isFinite(seriesId) || seriesId <= 0) {
      logger.warn(`Blocked poster request with invalid series id: "${idSegment}"`);
      return new Response('Forbidden', { status: 403 });
    }

    const filePath = resolveCachedArtwork(kindSegment as 'posters' | 'banners', seriesId);
    if (!filePath || !existsSync(filePath)) {
      return new Response('Not Found', { status: 404 });
    }

    return net.fetch(`file://${filePath}`);
  });

  logger.info('Poster protocol (shiroani-poster://) registered');
}
