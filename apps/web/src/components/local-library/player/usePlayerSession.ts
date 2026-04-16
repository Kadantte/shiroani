import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createLogger,
  LocalLibraryEvents,
  type PlayerClosePayload,
  type PlayerOpenErrorCode,
  type PlayerOpenSessionPayload,
  type PlayerOpenSessionResult,
  type PlayerSeekPayload,
  type PlayerSeekResult,
  type PlayerSession,
  type PlayerSwitchAudioPayload,
} from '@shiroani/shared';
import { emitAsync } from '@/lib/socketHelpers';

const logger = createLogger('PlayerSession');

/**
 * Raw error shape we expose to the UI. Machine code + human message. Maps
 * backend error codes that aren't per-session-recoverable (INVALID_PAYLOAD,
 * INTERNAL_ERROR) down to a generic UNKNOWN so the error overlay stays tidy.
 */
export interface PlayerSessionError {
  code: 'FFMPEG_NOT_INSTALLED' | 'FILE_NOT_FOUND' | 'PROBE_FAILED' | 'UNKNOWN';
  message: string;
}

function normalizeErrorCode(code: PlayerOpenErrorCode): PlayerSessionError['code'] {
  if (code === 'FFMPEG_NOT_INSTALLED') return 'FFMPEG_NOT_INSTALLED';
  if (code === 'FILE_NOT_FOUND') return 'FILE_NOT_FOUND';
  if (code === 'PROBE_FAILED') return 'PROBE_FAILED';
  return 'UNKNOWN';
}

export interface UsePlayerSessionResult {
  session: PlayerSession | null;
  error: PlayerSessionError | null;
  isOpening: boolean;
  /**
   * Monotonically incremented whenever the session gets a new stream (initial
   * open, after seek / audio switch). Consumers use it to force the `<video>`
   * element to re-src with a cache-busting query param.
   */
  streamGeneration: number;
  /** Re-emit `OPEN_PLAYER_SESSION` — used by the error overlay retry button. */
  reopen: () => void;
  /** Fire-and-forget: gracefully ask the backend to tear down the ffmpeg pipe. */
  closeSession: () => void;
  /**
   * Large seek — kills and re-spawns the ffmpeg stream. Resolves when the new
   * stream is ready (or returns false if the backend rejected).
   */
  seek: (positionSeconds: number) => Promise<boolean>;
  /** Swap active audio track; also re-spawns ffmpeg at `atPositionSeconds`. */
  switchAudio: (trackIndex: number, atPositionSeconds: number) => Promise<boolean>;
}

/**
 * Owns the lifecycle of one `PlayerSession` against the Phase 4a backend.
 *
 * The backend returns a fresh stream on open / seek / switch-audio. We bump
 * `streamGeneration` on each of those events so the video element can reset
 * its `src` (cache-busting via `?t=…`) without re-rendering the whole player.
 *
 * The hook never touches the DOM directly — the consuming component wires the
 * session + generation counter into the `<video>` tag itself.
 */
export function usePlayerSession(episodeId: number): UsePlayerSessionResult {
  const [session, setSession] = useState<PlayerSession | null>(null);
  const [error, setError] = useState<PlayerSessionError | null>(null);
  const [isOpening, setIsOpening] = useState(true);
  const [streamGeneration, setStreamGeneration] = useState(0);

  // Active sessionId — kept in a ref so the unmount cleanup can reach it
  // without re-binding the close callback on every render.
  const sessionIdRef = useRef<string | null>(null);
  // Guards against a race where the component unmounts mid-open and the
  // OPEN result still arrives: we don't want to leak a session we won't use.
  const unmountedRef = useRef(false);
  // Re-open trigger bumped by the retry button.
  const [openAttempt, setOpenAttempt] = useState(0);

  useEffect(() => {
    unmountedRef.current = false;
    setIsOpening(true);
    setError(null);

    let cancelled = false;
    (async () => {
      try {
        const result = await emitAsync<PlayerOpenSessionPayload, PlayerOpenSessionResult>(
          LocalLibraryEvents.OPEN_PLAYER_SESSION,
          { episodeId },
          { timeout: 30_000 }
        );
        if (cancelled) {
          if (result.ok) {
            emitAsync<PlayerClosePayload, unknown>(LocalLibraryEvents.CLOSE_PLAYER_SESSION, {
              sessionId: result.session.sessionId,
            }).catch(() => {
              /* best effort */
            });
          }
          return;
        }

        if (!result.ok) {
          setSession(null);
          sessionIdRef.current = null;
          setError({
            code: normalizeErrorCode(result.error.code),
            message: result.error.message || 'Failed to open player session.',
          });
          setIsOpening(false);
          return;
        }

        sessionIdRef.current = result.session.sessionId;
        setSession(result.session);
        setError(null);
        setStreamGeneration(g => g + 1);
        setIsOpening(false);
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : String(err);
        logger.error('OPEN_PLAYER_SESSION failed:', message);
        setSession(null);
        sessionIdRef.current = null;
        setError({ code: 'UNKNOWN', message });
        setIsOpening(false);
      }
    })();

    return () => {
      cancelled = true;
      unmountedRef.current = true;
      const sid = sessionIdRef.current;
      if (sid) {
        sessionIdRef.current = null;
        emitAsync<PlayerClosePayload, unknown>(LocalLibraryEvents.CLOSE_PLAYER_SESSION, {
          sessionId: sid,
        }).catch(() => {
          /* teardown — no retry */
        });
      }
    };
  }, [episodeId, openAttempt]);

  const reopen = useCallback(() => {
    const sid = sessionIdRef.current;
    sessionIdRef.current = null;
    if (sid) {
      emitAsync<PlayerClosePayload, unknown>(LocalLibraryEvents.CLOSE_PLAYER_SESSION, {
        sessionId: sid,
      }).catch(() => {
        /* best effort */
      });
    }
    setOpenAttempt(n => n + 1);
  }, []);

  const closeSession = useCallback(() => {
    const sid = sessionIdRef.current;
    if (!sid) return;
    sessionIdRef.current = null;
    emitAsync<PlayerClosePayload, unknown>(LocalLibraryEvents.CLOSE_PLAYER_SESSION, {
      sessionId: sid,
    }).catch(() => {
      /* best effort */
    });
  }, []);

  const seek = useCallback(async (positionSeconds: number): Promise<boolean> => {
    const sid = sessionIdRef.current;
    if (!sid) return false;
    try {
      const result = await emitAsync<PlayerSeekPayload, PlayerSeekResult>(
        LocalLibraryEvents.SEEK_PLAYER_SESSION,
        { sessionId: sid, positionSeconds },
        { timeout: 20_000 }
      );
      if (result.error || result.code) {
        logger.warn('SEEK rejected:', result.error ?? result.code ?? 'unknown');
        return false;
      }
      setStreamGeneration(g => g + 1);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error('SEEK_PLAYER_SESSION failed:', message);
      return false;
    }
  }, []);

  const switchAudio = useCallback(
    async (trackIndex: number, atPositionSeconds: number): Promise<boolean> => {
      const sid = sessionIdRef.current;
      if (!sid) return false;
      try {
        const result = await emitAsync<PlayerSwitchAudioPayload, PlayerSeekResult>(
          LocalLibraryEvents.SWITCH_AUDIO_TRACK,
          { sessionId: sid, trackIndex, atPositionSeconds },
          { timeout: 20_000 }
        );
        if (result.error || result.code) {
          logger.warn('SWITCH_AUDIO rejected:', result.error ?? result.code ?? 'unknown');
          return false;
        }
        setStreamGeneration(g => g + 1);
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error('SWITCH_AUDIO_TRACK failed:', message);
        return false;
      }
    },
    []
  );

  return { session, error, isOpening, streamGeneration, reopen, closeSession, seek, switchAudio };
}
