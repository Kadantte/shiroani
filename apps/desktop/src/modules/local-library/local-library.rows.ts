/**
 * Row-shape types + pure mappers for the local-library tables.
 *
 * Pulled out of `local-library.service.ts` so the scanner worker can import
 * them without dragging in the Nest service (which transitively imports
 * `electron` — unavailable in worker threads).
 */

import type {
  LocalEpisode,
  LocalEpisodeKind,
  LocalMatchStatus,
  LibraryRoot,
  LocalSeries,
} from '@shiroani/shared';

export interface LibraryRootRow {
  id: number;
  path: string;
  label: string | null;
  enabled: number;
  added_at: string;
  last_scanned_at: string | null;
}

export interface LocalSeriesRow {
  id: number;
  root_id: number;
  folder_path: string;
  parsed_title: string;
  display_title: string | null;
  anilist_id: number | null;
  match_status: string;
  match_confidence: number | null;
  poster_path: string | null;
  banner_path: string | null;
  synopsis: string | null;
  genres_json: string | null;
  season: number | null;
  year: number | null;
  created_at: string;
  updated_at: string;
}

export interface LocalEpisodeRow {
  id: number;
  series_id: number;
  file_path: string;
  file_size: number;
  file_hash: string | null;
  duration_seconds: number | null;
  width: number | null;
  height: number | null;
  video_codec: string | null;
  audio_tracks_json: string | null;
  subtitle_tracks_json: string | null;
  parsed_episode_number: number | null;
  parsed_season: number | null;
  parsed_title: string | null;
  release_group: string | null;
  kind: string;
  mtime: string;
  created_at: string;
}

export function rootRowToRoot(row: LibraryRootRow): LibraryRoot {
  return {
    id: row.id,
    path: row.path,
    label: row.label,
    enabled: row.enabled === 1,
    addedAt: row.added_at,
    lastScannedAt: row.last_scanned_at,
  };
}

function parseJsonArray(raw: string | null): unknown[] | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function seriesRowToSeries(row: LocalSeriesRow): LocalSeries {
  let genres: string[] | null = null;
  if (row.genres_json) {
    try {
      const parsed: unknown = JSON.parse(row.genres_json);
      if (Array.isArray(parsed)) {
        genres = parsed.filter((v): v is string => typeof v === 'string');
      }
    } catch {
      genres = null;
    }
  }

  return {
    id: row.id,
    rootId: row.root_id,
    folderPath: row.folder_path,
    parsedTitle: row.parsed_title,
    displayTitle: row.display_title,
    anilistId: row.anilist_id,
    matchStatus: row.match_status as LocalMatchStatus,
    matchConfidence: row.match_confidence,
    posterPath: row.poster_path,
    bannerPath: row.banner_path,
    synopsis: row.synopsis,
    genres,
    season: row.season,
    year: row.year,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function episodeRowToEpisode(row: LocalEpisodeRow): LocalEpisode {
  return {
    id: row.id,
    seriesId: row.series_id,
    filePath: row.file_path,
    fileSize: row.file_size,
    fileHash: row.file_hash,
    durationSeconds: row.duration_seconds,
    width: row.width,
    height: row.height,
    videoCodec: row.video_codec,
    audioTracks: parseJsonArray(row.audio_tracks_json),
    subtitleTracks: parseJsonArray(row.subtitle_tracks_json),
    parsedEpisodeNumber: row.parsed_episode_number,
    parsedSeason: row.parsed_season,
    parsedTitle: row.parsed_title,
    releaseGroup: row.release_group,
    kind: row.kind as LocalEpisodeKind,
    mtime: row.mtime,
    createdAt: row.created_at,
  };
}
