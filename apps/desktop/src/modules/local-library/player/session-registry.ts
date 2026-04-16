/**
 * Player session registry.
 *
 * Keeps at most {@link MAX_CONCURRENT_SESSIONS} active sessions in memory.
 * When the renderer opens a new session above the cap, the least-recently-
 * used session is force-closed to reclaim ffmpeg + tmp-dir resources.
 *
 * The registry is purely in-memory — a renderer reload / app restart forgets
 * every session, which is what we want (ffmpeg children exit with the main
 * process, leaving zero state to reconcile).
 */

import type { ExtractedFont } from './font-extractor';
import type { FfmpegSession } from './ffmpeg-session';
import type { PlayerProbeResult, PlayerProbedAudioTrack, PlayerProbedSubtitleTrack } from './probe';

/** How many player sessions may be active at once. */
export const MAX_CONCURRENT_SESSIONS = 3;

/** How long a session may sit with no HTTP activity before GC kicks it. */
export const STALE_SESSION_TIMEOUT_MS = 5 * 60 * 1000;

/** How often to sweep for stale sessions. */
export const SWEEP_INTERVAL_MS = 60 * 1000;

/** Fully hydrated in-memory state for one open player session. */
export interface PlayerSessionState {
  sessionId: string;
  episodeId: number;
  filePath: string;
  /** Absolute path to the per-session tmp directory (fonts, subs). */
  tmpDir: string;
  /** The probe result cached on open, used for seek/switch pipeline rebuilds. */
  probe: PlayerProbeResult;
  /** Which audio track is currently mapped. */
  audioTrack: PlayerProbedAudioTrack | undefined;
  /** Relative index of the audio track (kept in sync with `audioTrack.relativeIndex`). */
  audioRelativeIndex: number;
  /** The current `-ss` seconds the ffmpeg process was spawned with. */
  currentStartSeconds: number;
  /**
   * Subtitle tracks that survived extraction — includes nulls for image
   * subs so the renderer still sees them disabled in its picker.
   */
  subtitleTracks: Array<{ track: PlayerProbedSubtitleTrack; extractedPath: string | null }>;
  /** Fonts extracted from the container (empty for MP4/etc.). */
  fonts: ExtractedFont[];
  /** Owning ffmpeg process (may be stopped/dead between requests). */
  ffmpeg: FfmpegSession;
  /** Wall-clock timestamp of the last HTTP request on any session route. */
  lastActivityMs: number;
}

/**
 * Slim in-memory registry — a Map<sessionId, state> with insertion-order
 * iteration used for LRU eviction (touching a session re-inserts it to the
 * tail).
 */
export class SessionRegistry {
  private readonly sessions = new Map<string, PlayerSessionState>();

  size(): number {
    return this.sessions.size;
  }

  has(sessionId: string): boolean {
    return this.sessions.has(sessionId);
  }

  get(sessionId: string): PlayerSessionState | undefined {
    return this.sessions.get(sessionId);
  }

  /** Snapshot — used by the sweep. */
  values(): PlayerSessionState[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Register a new session. Returns the id of an LRU session the caller
   * should close, or `null` when the registry had spare capacity.
   */
  add(state: PlayerSessionState): { evict: string | null } {
    // Evict the LRU (first-inserted) session when at capacity. We return the
    // id so the caller can run async teardown before finally calling
    // `remove` — this keeps the registry synchronous.
    let evict: string | null = null;
    if (this.sessions.size >= MAX_CONCURRENT_SESSIONS) {
      const firstKey = this.sessions.keys().next().value;
      if (firstKey) evict = firstKey;
    }
    this.sessions.set(state.sessionId, state);
    return { evict };
  }

  /**
   * Mark the session as just-used — re-insert at the tail so we don't
   * evict it next.
   */
  touch(sessionId: string): void {
    const state = this.sessions.get(sessionId);
    if (!state) return;
    state.lastActivityMs = Date.now();
    this.sessions.delete(sessionId);
    this.sessions.set(sessionId, state);
  }

  /** Remove without teardown — the caller is responsible for tmp/process cleanup. */
  remove(sessionId: string): PlayerSessionState | undefined {
    const state = this.sessions.get(sessionId);
    if (!state) return undefined;
    this.sessions.delete(sessionId);
    return state;
  }

  /** Return ids of sessions with no activity for `timeoutMs`. */
  findStale(timeoutMs: number): string[] {
    const cutoff = Date.now() - timeoutMs;
    const stale: string[] = [];
    for (const state of this.sessions.values()) {
      if (state.lastActivityMs < cutoff) {
        stale.push(state.sessionId);
      }
    }
    return stale;
  }
}
