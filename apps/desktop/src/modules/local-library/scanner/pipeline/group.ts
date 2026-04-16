/**
 * Group parsed files into tentative series.
 *
 * Grouping key: `${titleKey}::${season ?? 1}::${year ?? ''}`.
 *
 * We use `titleKey` (normalized lowercase, punctuation stripped) rather than
 * the raw title so that "Bocchi the Rock!" and "Bocchi the Rock" collapse
 * into the same series. Season defaults to 1 — most filenames don't include
 * a season when the show has only one.
 *
 * The series `folder_path` is picked as the *deepest* shared ancestor of the
 * grouped files. For the common layout `<root>/<show>/<ep>.mkv` this collapses
 * to `<root>/<show>`. For the flat layout where all files sit at the root,
 * we use the root itself (handled by the caller). We never walk above the
 * scan root.
 */

import path from 'node:path';
import type { ParsedFilename } from './parse-filename';
import type { WalkedFile } from './walk';
import type { ProbeResult } from './probe';

export interface ParsedEpisodeRecord {
  file: WalkedFile;
  parsed: ParsedFilename;
  probe: ProbeResult | null;
  probeError: string | null;
}

export interface SeriesGroup {
  key: string;
  parsedTitle: string;
  season: number | null;
  year: number | null;
  folderPath: string;
  episodes: ParsedEpisodeRecord[];
}

export interface GroupOptions {
  /** The scan root — used as the lower bound for common-ancestor walking. */
  rootPath: string;
}

function makeKey(p: ParsedFilename): string {
  return `${p.titleKey}::${p.season ?? 1}::${p.year ?? ''}`;
}

/**
 * Pick the representative display title for a series group. We prefer the
 * first non-empty title that came from Anitomy (i.e. wasn't a folder fallback)
 * so "My Show/My Show - 01.mkv" uses "My Show" even if some files in the
 * group failed to parse a title.
 */
function pickDisplayTitle(records: ParsedEpisodeRecord[]): string {
  const fromAnitomy = records.find(r => r.parsed.titleFromAnitomy);
  if (fromAnitomy) return fromAnitomy.parsed.title;
  return records[0]?.parsed.title ?? 'Unknown';
}

/**
 * Compute the longest common directory path among a list of file paths.
 * Returns null if `paths` is empty.
 */
export function longestCommonDirectory(paths: string[]): string | null {
  if (paths.length === 0) return null;
  if (paths.length === 1) return path.normalize(path.dirname(paths[0]));

  const splitPaths = paths.map(p => path.dirname(p).split(/[\\/]/));
  const first = splitPaths[0];
  let commonLen = first.length;
  for (let i = 1; i < splitPaths.length; i++) {
    const cur = splitPaths[i];
    const maxLen = Math.min(commonLen, cur.length);
    let j = 0;
    while (j < maxLen && cur[j] === first[j]) {
      j++;
    }
    commonLen = j;
    if (commonLen === 0) break;
  }

  if (commonLen === 0) return null;
  const joined = first.slice(0, commonLen).join(path.sep);
  // path.dirname + split can produce odd results on Windows ("C:") — normalize.
  return path.normalize(joined);
}

/**
 * Determine the folder path for a group. Picks the longest common directory
 * of the grouped file paths, but never ascends above `rootPath`.
 */
export function pickFolderPath(files: string[], rootPath: string): string {
  const normalizedRoot = path.resolve(rootPath);
  const common = longestCommonDirectory(files);
  if (!common) return normalizedRoot;

  const resolvedCommon = path.resolve(common);
  // If the common ancestor ends up at or above the scan root, use the root.
  const rel = path.relative(normalizedRoot, resolvedCommon);
  if (rel.startsWith('..') || rel === '') {
    return normalizedRoot;
  }
  return resolvedCommon;
}

/**
 * Group parsed file records into tentative series.
 */
export function groupEpisodes(
  records: ParsedEpisodeRecord[],
  options: GroupOptions
): SeriesGroup[] {
  const buckets = new Map<string, ParsedEpisodeRecord[]>();

  for (const record of records) {
    // Skip files that have absolutely no identifying info — rare, but
    // possible for e.g. a stray `.mkv` named by hash with no folder context.
    if (!record.parsed.title) continue;
    const key = makeKey(record.parsed);
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.push(record);
    } else {
      buckets.set(key, [record]);
    }
  }

  const groups: SeriesGroup[] = [];
  for (const [key, bucketRecords] of buckets) {
    const representative = bucketRecords[0].parsed;
    const folderPath = pickFolderPath(
      bucketRecords.map(r => r.file.fullPath),
      options.rootPath
    );
    groups.push({
      key,
      parsedTitle: pickDisplayTitle(bucketRecords),
      season: representative.season,
      year: representative.year,
      folderPath,
      episodes: bucketRecords,
    });
  }

  return groups;
}
