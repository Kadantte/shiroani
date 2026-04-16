/**
 * Streaming filesystem walker built on `readdirp`.
 *
 * readdirp emits a `warn` event when it encounters a per-entry error (EACCES,
 * ENOENT mid-walk, broken symlinks, …). We catch those, count them, and keep
 * going so a single un-readable subdirectory doesn't abort the scan.
 */

import { readdirp } from 'readdirp';
import path from 'node:path';
import { ANIME_VIDEO_EXTENSIONS } from './parse-filename';

export interface WalkedFile {
  fullPath: string;
  size: number;
  /** ISO string — `fs.Stats.mtime.toISOString()`. */
  mtime: string;
}

export interface WalkResult {
  files: WalkedFile[];
  inaccessibleDirs: number;
}

export interface WalkOptions {
  /** Called with the file being processed (best-effort; throttled upstream). */
  onProgress?: (filesSeen: number, currentPath: string) => void;
  /** Checked between dirents to allow mid-walk cancellation. */
  shouldCancel?: () => boolean;
  /** Max recursion depth (defaults to 50 — deep enough for any sane layout). */
  depth?: number;
}

/**
 * Walk `root` recursively, yielding every anime video file found.
 *
 * Cancellation: the caller passes `shouldCancel` and we bail out on the next
 * dirent — readdirp itself doesn't expose a native cancel, but destroying the
 * stream is enough for our purposes.
 */
export async function walkRoot(root: string, options: WalkOptions = {}): Promise<WalkResult> {
  const { onProgress, shouldCancel, depth = 50 } = options;

  const stream = readdirp(root, {
    type: 'files',
    depth,
    alwaysStat: true,
    fileFilter: entry => {
      const ext = path.extname(entry.basename).toLowerCase();
      return ANIME_VIDEO_EXTENSIONS.includes(ext as (typeof ANIME_VIDEO_EXTENSIONS)[number]);
    },
  });

  const files: WalkedFile[] = [];
  let inaccessibleDirs = 0;

  stream.on('warn', () => {
    inaccessibleDirs += 1;
  });

  try {
    for await (const entry of stream) {
      if (shouldCancel?.()) {
        stream.destroy();
        break;
      }
      const stats = entry.stats;
      // alwaysStat: true guarantees stats; guard just in case.
      const size = stats?.size ?? 0;
      const mtime =
        stats?.mtime instanceof Date ? stats.mtime.toISOString() : new Date().toISOString();
      files.push({ fullPath: entry.fullPath, size, mtime });

      if (files.length % 50 === 0) {
        onProgress?.(files.length, entry.fullPath);
      }
    }
  } catch (err) {
    // readdirp can throw on catastrophic failures (root missing, EPERM on the
    // root itself). Propagate those — they're fatal.
    if (
      (err as NodeJS.ErrnoException).code === 'ENOENT' ||
      (err as NodeJS.ErrnoException).code === 'EPERM'
    ) {
      throw err;
    }
    // Other errors (e.g. stream destroyed after cancel) are benign.
  }

  return { files, inaccessibleDirs };
}
