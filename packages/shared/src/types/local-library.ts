/**
 * Local Library Types
 *
 * Type contracts for the local anime library feature (importing, scanning, and
 * eventually playing back local video files). Separate from the AniList tracker
 * library — no data sharing in v1.
 */

/** How a local series was matched to an AniList entry. */
export type LocalMatchStatus = 'unmatched' | 'auto' | 'manual' | 'ignored';

/** Classification of a local episode file. */
export type LocalEpisodeKind = 'episode' | 'ova' | 'movie' | 'special' | 'nced' | 'nceed' | 'extra';

/** Status of a scan job. */
export type LibraryScanStatus = 'running' | 'completed' | 'failed' | 'cancelled';

/** Represents a folder the user has registered as a source of local anime. */
export interface LibraryRoot {
  id: number;
  path: string;
  label: string | null;
  enabled: boolean;
  addedAt: string;
  lastScannedAt: string | null;
}

/** A local anime series (a folder under a {@link LibraryRoot}). */
export interface LocalSeries {
  id: number;
  rootId: number;
  folderPath: string;
  parsedTitle: string;
  displayTitle: string | null;
  anilistId: number | null;
  matchStatus: LocalMatchStatus;
  matchConfidence: number | null;
  posterPath: string | null;
  bannerPath: string | null;
  synopsis: string | null;
  genres: string[] | null;
  season: number | null;
  year: number | null;
  createdAt: string;
  updatedAt: string;
}

/** A local episode file belonging to a {@link LocalSeries}. */
export interface LocalEpisode {
  id: number;
  seriesId: number;
  filePath: string;
  fileSize: number;
  fileHash: string | null;
  durationSeconds: number | null;
  width: number | null;
  height: number | null;
  videoCodec: string | null;
  audioTracks: unknown[] | null;
  subtitleTracks: unknown[] | null;
  parsedEpisodeNumber: number | null;
  parsedSeason: number | null;
  parsedTitle: string | null;
  releaseGroup: string | null;
  kind: LocalEpisodeKind;
  mtime: string;
  createdAt: string;
}

/** Persistent playback position for a local episode. */
export interface PlaybackProgress {
  episodeId: number;
  positionSeconds: number;
  durationSeconds: number;
  completed: boolean;
  completedAt: string | null;
  watchCount: number;
  updatedAt: string;
}

/** A historical scan run for a library root. */
export interface LibraryScan {
  id: number;
  rootId: number;
  startedAt: string;
  finishedAt: string | null;
  status: LibraryScanStatus;
  filesSeen: number;
  filesAdded: number;
  filesRemoved: number;
  error: string | null;
}

// ============================================
// Gateway payloads
// ============================================

export interface LocalLibraryAddRootPayload {
  path: string;
  label?: string;
}

export interface LocalLibraryRemoveRootPayload {
  id: number;
}

export interface LocalLibraryListSeriesPayload {
  rootId?: number;
}

export interface LocalLibraryStartScanPayload {
  rootId: number;
}

export interface LocalLibraryCancelScanPayload {
  rootId: number;
}

/** High-level phase of a scan run. */
export type LocalLibraryScanPhase =
  | 'starting'
  | 'discovering'
  | 'parsing'
  | 'probing'
  | 'persisting'
  | 'cleanup'
  | 'done';

export interface LocalLibraryScanStartedPayload {
  rootId: number;
  scanId: number;
}

export interface LocalLibraryScanProgressPayload {
  rootId: number;
  scanId: number;
  phase: LocalLibraryScanPhase;
  filesSeen: number;
  filesDone: number;
  filesTotal: number;
  filesSkipped: number;
  currentPath: string | null;
  seriesCount: number;
}

export interface LocalLibraryScanDonePayload {
  rootId: number;
  scanId: number;
  filesAdded: number;
  filesRemoved: number;
  filesSkipped: number;
  seriesCount: number;
}

export interface LocalLibraryScanFailedPayload {
  rootId: number;
  scanId: number | null;
  error: string;
  code?: string;
}

export interface LocalLibraryScanCancelledPayload {
  rootId: number;
  scanId: number;
}

export interface LocalLibrarySeriesUpdatedPayload {
  rootId: number;
  series: LocalSeries[];
}

/** Broadcast when a scan orphans series (zero episodes remaining). */
export interface LocalLibrarySeriesRemovedPayload {
  rootId: number;
  seriesIds: number[];
}

// ============================================
// Episodes + progress
// ============================================

export interface LocalLibraryListEpisodesPayload {
  seriesId: number;
}

export interface LocalLibraryEpisodesResult {
  seriesId: number;
  episodes: LocalEpisode[];
}

export interface LocalLibraryListContinueWatchingPayload {
  limit?: number;
}

/** Item shown on the "Continue watching" rail — series + episode + progress. */
export interface ContinueWatchingItem {
  series: LocalSeries;
  episode: LocalEpisode;
  progress: PlaybackProgress;
}

export interface LocalLibraryContinueWatchingResult {
  items: ContinueWatchingItem[];
}

/** Aggregate progress info for a single series. */
export interface SeriesProgressSummary {
  seriesId: number;
  watchedCount: number;
  totalCount: number;
  lastWatchedAt: string | null;
  /** Episode id to resume on, if any in-progress episode exists. */
  resumeEpisodeId: number | null;
  resumePositionSeconds: number | null;
  resumeDurationSeconds: number | null;
}

export interface LocalLibraryGetSeriesProgressPayload {
  seriesId: number;
}

export interface LocalLibrarySeriesProgressResult {
  summary: SeriesProgressSummary;
}

export interface LocalLibraryMarkEpisodeWatchedPayload {
  episodeId: number;
  watched: boolean;
}

export interface LocalLibraryMarkSeriesWatchedPayload {
  seriesId: number;
  watched: boolean;
}

export interface LocalLibrarySetEpisodeProgressPayload {
  episodeId: number;
  positionSeconds: number;
  durationSeconds: number;
}

export interface LocalLibraryEpisodeProgressUpdatedPayload {
  episodeId: number;
  seriesId: number;
  progress: PlaybackProgress;
}

export interface LocalLibraryMarkEpisodeWatchedResult {
  episodeId: number;
  seriesId: number;
  progress: PlaybackProgress | null;
  error?: string;
}

export interface LocalLibraryMarkSeriesWatchedResult {
  seriesId: number;
  affectedEpisodes: number;
  error?: string;
}

export interface LocalLibrarySetEpisodeProgressResult {
  episodeId: number;
  progress: PlaybackProgress | null;
  error?: string;
}

export interface LocalLibraryStartScanResult {
  scanId: number | null;
  error?: string;
  code?: string;
}

export interface LocalLibraryCancelScanResult {
  success: boolean;
  error?: string;
}

export interface LocalLibraryRootsResult {
  roots: LibraryRoot[];
}

export interface LocalLibrarySeriesResult {
  series: LocalSeries[];
}

export interface LocalLibraryRootAddedResult {
  root: LibraryRoot;
}

export interface LocalLibraryRootRemovedResult {
  id: number;
  success: boolean;
}

// ============================================
// Folder picker bridge
// ============================================

export interface PickFolderResult {
  cancelled: boolean;
  path?: string;
}

/**
 * Result of a native file picker — used when the user needs to point at a
 * specific binary (e.g. a system ffmpeg) rather than a folder.
 */
export interface PickFileResult {
  cancelled: boolean;
  path?: string;
}
