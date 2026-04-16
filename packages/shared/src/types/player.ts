/**
 * Local player session types.
 *
 * A "session" is a single playback of a local episode through the Electron
 * main-process ffmpeg pipeline. Each session owns:
 *   - a running ffmpeg process (remux or transcode to fragmented MP4)
 *   - a local HTTP URL the renderer's <video> element consumes
 *   - optional pre-extracted ASS subtitles and MKV font attachments for the
 *     JASSUB overlay (Phase 4b)
 *
 * The renderer never talks to ffmpeg directly — it opens a session over the
 * socket, then points `<video>.src` at `streamUrl` and loads subtitles / fonts
 * from `subtitleTracks[i].subsUrl` / `fontUrls[i]`.
 */

/**
 * Which codec path the ffmpeg pipeline is taking for this session.
 *
 * - `remux`           — `-c copy` for both streams; near-zero CPU
 * - `transcode-video` — re-encode video to H.264 AAC audio kept as-is
 * - `transcode-audio` — video kept as-is, audio downmixed to stereo AAC
 * - `transcode-both`  — both streams re-encoded
 */
export type PlayerSessionMode = 'remux' | 'transcode-video' | 'transcode-audio' | 'transcode-both';

/** One audio track exposed to the renderer's track picker. */
export interface PlayerAudioTrack {
  /** ffmpeg stream index — used when the renderer asks to switch audio. */
  index: number;
  codec: string | null;
  language: string | null;
  title: string | null;
  channels: number | null;
  isDefault: boolean;
}

/** One subtitle track. Only text tracks have a non-null `subsUrl`. */
export interface PlayerSubtitleTrack {
  /** ffmpeg stream index. */
  index: number;
  /** `ass`, `srt`, `webvtt`, etc. Image subs (`hdmv_pgs_subtitle`, `dvd_subtitle`) are flagged via `subsUrl: null`. */
  codec: string | null;
  language: string | null;
  title: string | null;
  isForced: boolean;
  isDefault: boolean;
  /**
   * `http://127.0.0.1:PORT/subs/:sessionId/:index.ass` — or `null` if the
   * track is an image-based format (PGS / VobSub) that JASSUB can't render.
   */
  subsUrl: string | null;
}

/** One chapter marker from the container. */
export interface PlayerChapter {
  startSeconds: number;
  endSeconds: number;
  title: string | null;
}

/**
 * Opened-session shape handed back to the renderer. `streamUrl` is stable
 * for the life of the session — seeks / audio-track switches restart the
 * underlying ffmpeg process but the URL stays the same, so the renderer just
 * re-`load()`s the `<video>`.
 */
export interface PlayerSession {
  sessionId: string;
  episodeId: number;
  /** `http://127.0.0.1:PORT/stream/:sessionId` */
  streamUrl: string;
  mode: PlayerSessionMode;
  durationSeconds: number;
  videoCodec: string | null;
  width: number | null;
  height: number | null;
  audioTracks: PlayerAudioTrack[];
  subtitleTracks: PlayerSubtitleTrack[];
  chapters: PlayerChapter[];
  /** Absolute URLs to extracted font attachments (MKV only). Empty on MP4/other. */
  fontUrls: string[];
  /** Seconds into the episode to resume at; 0 when no progress row exists. */
  resumePositionSeconds: number;
}

// ============================================
// Gateway payloads / results
// ============================================

export interface PlayerOpenSessionPayload {
  episodeId: number;
}

/** Typed error codes surfaced to the renderer on session-open failure. */
export type PlayerOpenErrorCode =
  | 'FFMPEG_NOT_INSTALLED'
  | 'FILE_NOT_FOUND'
  | 'PROBE_FAILED'
  | 'INVALID_PAYLOAD'
  | 'INTERNAL_ERROR';

export interface PlayerOpenSessionError {
  code: PlayerOpenErrorCode;
  message: string;
}

export type PlayerOpenSessionResult =
  | { ok: true; session: PlayerSession }
  | { ok: false; error: PlayerOpenSessionError };

export interface PlayerClosePayload {
  sessionId: string;
}

export interface PlayerSeekPayload {
  sessionId: string;
  positionSeconds: number;
}

export interface PlayerSwitchAudioPayload {
  sessionId: string;
  trackIndex: number;
  atPositionSeconds: number;
}

/**
 * Response for seek + audio-switch. `streamUrl` may be identical to the
 * previous one — it's returned so the renderer can unconditionally re-src
 * the `<video>` element.
 */
export interface PlayerSeekResult {
  sessionId: string;
  streamUrl: string;
  positionSeconds: number;
  error?: string;
  code?: PlayerOpenErrorCode;
}

export interface PlayerCloseResult {
  sessionId: string;
  success: boolean;
  error?: string;
}
