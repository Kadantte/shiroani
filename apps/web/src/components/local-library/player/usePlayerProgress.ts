import { useCallback, useEffect, useRef, type RefObject } from 'react';
import { LocalLibraryEvents, createLogger } from '@shiroani/shared';
import { emitAsync } from '@/lib/socketHelpers';
import type {
  LocalLibrarySetEpisodeProgressPayload,
  LocalLibrarySetEpisodeProgressResult,
} from '@shiroani/shared';
import { getAbsolutePlaybackPosition } from './timeline';

const logger = createLogger('PlayerProgress');

/**
 * Minimum wall-clock interval between throttled progress writes while the
 * video is playing. The server deduplicates anyway, but this keeps the socket
 * traffic cheap.
 */
const THROTTLE_MS = 10_000;

export interface UsePlayerProgressOptions {
  episodeId: number;
  durationSeconds: number;
  /** Absolute episode position that maps to `video.currentTime === 0`. */
  streamStartSeconds: number;
  /** Ref to the `<video>` element so we can read `currentTime` on demand. */
  videoRef: RefObject<HTMLVideoElement | null>;
}

export interface UsePlayerProgressResult {
  /**
   * Force-emit progress now. Called on pause, manual seek, audio-switch,
   * `ended`, component unmount. The throttle doesn't apply to these.
   */
  flush: () => void;
}

/**
 * Wires up progress persistence for one episode.
 *
 * While the video is playing we emit `SET_EPISODE_PROGRESS` at most every
 * `THROTTLE_MS` ms. Callers should also invoke `flush()` on discrete events
 * (pause / seek / audio switch / ended / unmount) so resume points are
 * accurate even when the user doesn't reach the throttle window.
 */
export function usePlayerProgress({
  episodeId,
  durationSeconds,
  streamStartSeconds,
  videoRef,
}: UsePlayerProgressOptions): UsePlayerProgressResult {
  // Wall-clock timestamp (ms) of the last emit. Zero = never emitted.
  const lastEmitAtRef = useRef(0);
  // Cached duration — falls back to the video's own `duration` if the session
  // didn't provide one. The server uses this to flip `completed` at 90%.
  const durationRef = useRef(durationSeconds);
  useEffect(() => {
    durationRef.current = durationSeconds;
  }, [durationSeconds]);

  const streamStartRef = useRef(streamStartSeconds);
  useEffect(() => {
    streamStartRef.current = streamStartSeconds;
  }, [streamStartSeconds]);

  const emit = useCallback(
    (positionSeconds: number) => {
      const video = videoRef.current;
      const dur = durationRef.current || video?.duration || 0;
      if (!Number.isFinite(dur) || dur <= 0) return;
      if (!Number.isFinite(positionSeconds) || positionSeconds < 0) return;

      lastEmitAtRef.current = Date.now();
      emitAsync<LocalLibrarySetEpisodeProgressPayload, LocalLibrarySetEpisodeProgressResult>(
        LocalLibraryEvents.SET_EPISODE_PROGRESS,
        { episodeId, positionSeconds, durationSeconds: dur }
      ).catch(err => {
        const message = err instanceof Error ? err.message : String(err);
        logger.warn('SET_EPISODE_PROGRESS failed:', message);
      });
    },
    [episodeId, videoRef]
  );

  const flush = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    emit(
      getAbsolutePlaybackPosition(streamStartRef.current, video.currentTime, durationRef.current)
    );
  }, [emit, videoRef]);

  // Throttled tick: attach a `timeupdate` listener (~4 Hz from the browser)
  // and gate emits on the wall-clock throttle. Using `timeupdate` keeps us off
  // the main-thread rAF loop the controls use.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTimeUpdate = () => {
      if (video.paused || video.ended) return;
      const now = Date.now();
      if (now - lastEmitAtRef.current < THROTTLE_MS) return;
      emit(
        getAbsolutePlaybackPosition(streamStartRef.current, video.currentTime, durationRef.current)
      );
    };

    const onEnded = () =>
      emit(
        getAbsolutePlaybackPosition(streamStartRef.current, video.currentTime, durationRef.current)
      );
    const onPause = () =>
      emit(
        getAbsolutePlaybackPosition(streamStartRef.current, video.currentTime, durationRef.current)
      );

    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('ended', onEnded);
    video.addEventListener('pause', onPause);
    return () => {
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('ended', onEnded);
      video.removeEventListener('pause', onPause);
    };
  }, [emit, videoRef]);

  // Final flush on unmount — the video's `pause` event may not fire if the
  // element is removed before the browser processes it.
  useEffect(() => {
    return () => {
      const video = videoRef.current;
      if (!video) return;
      // Read directly — `flush()` would be captured with a stale closure by
      // the cleanup; `emit` is stable via useCallback deps.
      emit(
        getAbsolutePlaybackPosition(streamStartRef.current, video.currentTime, durationRef.current)
      );
    };
  }, [emit, videoRef]);

  return { flush };
}
