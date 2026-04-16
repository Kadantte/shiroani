/**
 * Filename parser — thin wrapper around `anitomy` (yjl9903's TS port).
 *
 * We picked `anitomy` over `anitomyscript` because anitomyscript (WASM) is
 * abandoned (last publish 2019, fails to load its WASM module on modern Node
 * due to an old emscripten shim calling `fetch()` with an unsupported scheme).
 * `anitomy` is a pure-TS port, still maintained as of 2024, and works out of
 * the box in both the main process and worker threads.
 *
 * This module normalizes Anitomy's result into the small shape the rest of
 * the pipeline consumes. Anything not relevant to Phase 2 (episode title,
 * alt episode numbers, volumes, checksums) is dropped here on purpose.
 */

import path from 'node:path';
import { parse as anitomyParse } from 'anitomy';
import type { LocalEpisodeKind } from '@shiroani/shared';

/** Video file extensions the scanner considers an "episode candidate". */
export const ANIME_VIDEO_EXTENSIONS = [
  '.mkv',
  '.mp4',
  '.avi',
  '.webm',
  '.m4v',
  '.mov',
  '.ts',
] as const;

const ANIME_EXT_SET = new Set<string>(ANIME_VIDEO_EXTENSIONS);

/**
 * Tokens Anitomy exposes through `result.type` (lowercased) that we consider
 * to mean "not a regular numbered episode".
 *
 * Anitomy mostly returns things like "OVA", "ONA", "Movie", "Special", "NCOP",
 * "NCED", "Trailer". The `LocalEpisodeKind` schema in migration v6 only allows
 * a smaller set: episode, ova, movie, special, nced, nceed, extra.
 */
function normalizeKind(rawType: string | undefined): LocalEpisodeKind {
  if (!rawType) return 'episode';
  const t = rawType.toLowerCase();
  if (t.includes('ova') || t.includes('ona')) return 'ova';
  if (t.includes('movie') || t.includes('film')) return 'movie';
  if (t.includes('ncop') || t.includes('opening') || t === 'op') return 'nced';
  if (t.includes('nced') || t.includes('ending') || t === 'ed') return 'nceed';
  if (t.includes('special') || t.includes('sp') || t.includes('omake')) return 'special';
  if (t.includes('pv') || t.includes('cm') || t.includes('trailer')) return 'extra';
  return 'episode';
}

function toIntOrNull(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return Math.trunc(v);
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isFinite(n) ? Math.trunc(n) : null;
  }
  return null;
}

function toNumberOrNull(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** Normalize a parsed title into a grouping key. Collapses punctuation + case. */
export function normalizeTitleForGrouping(title: string): string {
  return title
    .toLowerCase()
    .replace(/[\u2018\u2019\u201C\u201D]/g, "'")
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

/** Normalized parse result. */
export interface ParsedFilename {
  /** The parsed show title (may be empty before the folder fallback applies). */
  title: string;
  /** Normalized lowercase form for grouping. */
  titleKey: string;
  /** Episode number (may be fractional for things like "02.5"). */
  episode: number | null;
  /** Season number if present in the filename. */
  season: number | null;
  /** Year if embedded. */
  year: number | null;
  /** Release group (e.g. "SubsPlease"). */
  releaseGroup: string | null;
  /** Resolution string like "1080p". */
  resolution: string | null;
  /** Episode kind — never "episode" unless we could parse a number or the filename has no type hint. */
  kind: LocalEpisodeKind;
  /** Whether anitomy produced a title for this filename at all. */
  titleFromAnitomy: boolean;
}

/**
 * Parse a filename. If Anitomy produces an empty title, fall back to the
 * parent folder name — a real-world scan of `Frieren/Frieren - 01.mkv` would
 * otherwise yield a blank group.
 */
export function parseFilename(fullPath: string): ParsedFilename {
  const base = path.basename(fullPath);
  const parent = path.basename(path.dirname(fullPath));

  const result = anitomyParse(base);

  let title = result?.title?.trim() ?? '';
  const titleFromAnitomy = title.length > 0;

  if (!titleFromAnitomy) {
    title = parent || path.basename(fullPath, path.extname(fullPath));
  }

  return {
    title,
    titleKey: normalizeTitleForGrouping(title),
    episode: toNumberOrNull(result?.episode?.number),
    season: toIntOrNull(result?.season),
    year: toIntOrNull(result?.year),
    releaseGroup: result?.release?.group ?? null,
    resolution: result?.video?.resolution ?? null,
    kind: normalizeKind(result?.type),
    titleFromAnitomy,
  };
}

/** Whether a filename's extension is one the scanner treats as a video file. */
export function isAnimeVideoFile(fullPath: string): boolean {
  return ANIME_EXT_SET.has(path.extname(fullPath).toLowerCase());
}
