/**
 * Helpers for the on-disk poster/banner cache.
 *
 * Each local series owns at most one poster and one banner. The files live
 * under `<userData>/library-cache/{posters,banners}/<seriesId>.<ext>` with
 * the source extension preserved (we avoid transcoding — the renderer handles
 * whatever the browser supports).
 *
 * These helpers run in the main Electron process (they depend on
 * `electron.app`) and are invoked by the local-library gateway after a user
 * confirms a selection in the poster picker dialog.
 */

import { app } from 'electron';
import { existsSync, mkdirSync } from 'fs';
import { copyFile, readdir, stat, unlink, writeFile } from 'fs/promises';
import { extname, join } from 'path';
import { createLogger } from '@shiroani/shared';
import type { PosterKind } from '@shiroani/shared';

const logger = createLogger('PosterCache');

const ALLOWED_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp']);
const MAX_FILE_SIZE = 20 * 1024 * 1024;
/** AniList CDN images are under a megabyte, but give URL downloads a bit of headroom. */
const MAX_DOWNLOAD_SIZE = 20 * 1024 * 1024;

function getCacheSubdir(kind: PosterKind): string {
  return kind === 'poster' ? 'posters' : 'banners';
}

/** Ensure `<userData>/library-cache/<subdir>/` exists and return its path. */
export function getArtworkDir(kind: PosterKind): string {
  const dir = join(app.getPath('userData'), 'library-cache', getCacheSubdir(kind));
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function normalizeExtension(source: string): string {
  const ext = extname(source).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    throw new Error(
      `Nieobsługiwany format obrazu: ${ext || '(brak rozszerzenia)'}. Dozwolone: .png, .jpg, .jpeg, .webp`
    );
  }
  return ext;
}

/**
 * Delete any previously-cached file for this series + kind, regardless of
 * extension. Called before writing a new one so we don't end up with stale
 * `<id>.png` next to a fresh `<id>.webp`.
 */
async function removeExistingFiles(seriesId: number, kind: PosterKind): Promise<void> {
  const dir = getArtworkDir(kind);
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return;
  }
  const prefix = `${seriesId}.`;
  await Promise.all(
    entries
      .filter(name => name.startsWith(prefix))
      .map(name =>
        unlink(join(dir, name)).catch(err => {
          logger.warn(`Failed to remove stale artwork ${name}: ${String(err)}`);
        })
      )
  );
}

/**
 * Copy a user-picked local image into the cache and return its absolute path.
 */
export async function savePosterFromLocalFile(
  seriesId: number,
  srcAbsPath: string,
  kind: PosterKind
): Promise<string> {
  if (typeof srcAbsPath !== 'string' || srcAbsPath.length === 0) {
    throw new Error('Brak ścieżki do pliku');
  }
  const ext = normalizeExtension(srcAbsPath);

  const srcStat = await stat(srcAbsPath);
  if (!srcStat.isFile()) {
    throw new Error('Wybrana ścieżka nie jest plikiem');
  }
  if (srcStat.size > MAX_FILE_SIZE) {
    throw new Error('Plik jest za duży (maksymalnie 20 MB)');
  }

  await removeExistingFiles(seriesId, kind);

  const destPath = join(getArtworkDir(kind), `${seriesId}${ext}`);
  await copyFile(srcAbsPath, destPath);
  logger.info(`Saved ${kind} for series ${seriesId} from local file → ${destPath}`);
  return destPath;
}

/**
 * Download an AniList image URL into the cache and return its absolute path.
 * Extension is inferred from the URL; if unrecognised we default to .jpg.
 */
export async function savePosterFromUrl(
  seriesId: number,
  url: string,
  kind: PosterKind
): Promise<string> {
  if (typeof url !== 'string' || url.length === 0) {
    throw new Error('Brak adresu URL');
  }
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error('Niepoprawny adres URL');
  }
  if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
    throw new Error('Adres URL musi używać HTTP/HTTPS');
  }

  // Infer extension from the pathname; AniList uses .jpg/.png.
  const pathExt = extname(parsedUrl.pathname).toLowerCase();
  const ext = ALLOWED_EXTENSIONS.has(pathExt) ? pathExt : '.jpg';

  const response = await fetch(parsedUrl.toString(), {
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) {
    throw new Error(`Pobieranie obrazu nie powiodło się: HTTP ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length === 0) {
    throw new Error('Pobrany plik jest pusty');
  }
  if (buffer.length > MAX_DOWNLOAD_SIZE) {
    throw new Error('Pobrany plik jest za duży');
  }

  await removeExistingFiles(seriesId, kind);

  const destPath = join(getArtworkDir(kind), `${seriesId}${ext}`);
  await writeFile(destPath, buffer);
  logger.info(`Saved ${kind} for series ${seriesId} from URL → ${destPath}`);
  return destPath;
}

/** Remove any cached artwork for the series. Safe to call when nothing exists. */
export async function removePoster(seriesId: number, kind: PosterKind): Promise<void> {
  await removeExistingFiles(seriesId, kind);
  logger.info(`Removed ${kind} for series ${seriesId}`);
}

/**
 * Look up the cached file for the given series + kind, if any. Returns the
 * absolute path so the custom protocol can stream it back to the renderer.
 */
export async function findCachedArtwork(
  seriesId: number,
  kind: PosterKind
): Promise<string | null> {
  const dir = getArtworkDir(kind);
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return null;
  }
  const prefix = `${seriesId}.`;
  const match = entries.find(name => name.startsWith(prefix));
  return match ? join(dir, match) : null;
}
