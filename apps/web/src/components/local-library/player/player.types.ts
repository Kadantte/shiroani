/**
 * Phase 4b player contract — consumed by `LocalPlayer` and its hooks.
 *
 * These types mirror the Phase 4a backend (ffmpeg session server) contract.
 * They live here temporarily because 4a and 4b are built in parallel worktrees.
 *
 * TODO: remove once `@shiroani/shared` re-exports these from
 * `packages/shared/src/types/local-library.ts` (or a dedicated player types
 * module). The parent agent reconciles during merge.
 */

/** How the backend is delivering the stream to the browser. */
export type PlayerSessionMode = 'remux' | 'transcode-video' | 'transcode-audio' | 'transcode-both';

export interface PlayerAudioTrack {
  index: number;
  codec: string | null;
  language: string | null;
  title: string | null;
  channels: number | null;
  isDefault: boolean;
}

export interface PlayerSubtitleTrack {
  index: number;
  codec: string | null;
  language: string | null;
  title: string | null;
  isForced: boolean;
  isDefault: boolean;
  /** null for image subs (PGS/VobSub) that can't be rendered via libass. */
  subsUrl: string | null;
}

export interface PlayerChapter {
  startSeconds: number;
  endSeconds: number;
  title: string | null;
}

export interface PlayerSession {
  sessionId: string;
  episodeId: number;
  streamUrl: string;
  mode: PlayerSessionMode;
  durationSeconds: number;
  videoCodec: string | null;
  width: number | null;
  height: number | null;
  audioTracks: PlayerAudioTrack[];
  subtitleTracks: PlayerSubtitleTrack[];
  chapters: PlayerChapter[];
  /** URLs for fonts extracted from the MKV (served by the backend). */
  fontUrls: string[];
  /** Resume position persisted by the progress store. */
  resumePositionSeconds: number;
}

// ---------------------------------------------------------------------------
// Socket payloads (match Phase 4a backend gateway)
// ---------------------------------------------------------------------------

export interface OpenPlayerSessionPayload {
  episodeId: number;
}

export interface OpenPlayerSessionResult {
  ok: boolean;
  session?: PlayerSession;
  /** When `ok === false`. Stable machine codes the UI switches on. */
  code?:
    | 'FFMPEG_NOT_INSTALLED'
    | 'FILE_NOT_FOUND'
    | 'PROBE_FAILED'
    | 'EPISODE_NOT_FOUND'
    | 'UNKNOWN';
  error?: string;
}

export interface ClosePlayerSessionPayload {
  sessionId: string;
}

export interface SeekPlayerSessionPayload {
  sessionId: string;
  positionSeconds: number;
}

export interface SwitchAudioTrackPayload {
  sessionId: string;
  trackIndex: number;
  atPositionSeconds: number;
}

/**
 * Both `SEEK_PLAYER_SESSION` and `SWITCH_AUDIO_TRACK` reuse this result. The
 * backend kills the running ffmpeg stream and re-spawns at the new position,
 * so the frontend must re-set `<video>.src` (with a cache-busting query param).
 */
export interface SeekResult {
  ok: boolean;
  sessionId: string;
  /** Where the new stream starts — echoes the request or clamps to duration. */
  positionSeconds: number;
  /** Present when `ok === false`. */
  code?: 'SESSION_NOT_FOUND' | 'FFMPEG_FAILED' | 'UNKNOWN';
  error?: string;
}

// ---------------------------------------------------------------------------
// Player-session socket event names
//
// These are intentionally kept here as string constants so the frontend can
// emit without depending on the shared package exporting them yet. The Phase 4a
// backend uses the same strings — drop this block once 4a lands and re-export
// from `LocalLibraryEvents`.
// ---------------------------------------------------------------------------

export const PlayerSessionEvents = {
  OPEN: 'local-library:open-player-session',
  OPEN_RESULT: 'local-library:open-player-session-result',
  CLOSE: 'local-library:close-player-session',
  SEEK: 'local-library:seek-player-session',
  SEEK_RESULT: 'local-library:seek-result',
  SWITCH_AUDIO: 'local-library:switch-audio-track',
} as const;
