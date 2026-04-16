import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { useLocalLibraryStore } from '@/stores/useLocalLibraryStore';
import { FfmpegSetupDialog } from '@/components/local-library/ffmpeg/FfmpegSetupDialog';
import { PlayerTopBar } from './PlayerTopBar';
import { PlayerBottomBar } from './PlayerBottomBar';
import { PlayerErrorOverlay } from './PlayerErrorOverlay';
import { PlayerLoadingOverlay } from './PlayerLoadingOverlay';
import { useJassub } from './useJassub';
import { usePlayerKeyboard } from './usePlayerKeyboard';
import { usePlayerProgress } from './usePlayerProgress';
import { usePlayerSession } from './usePlayerSession';
import {
  clampPlaybackPosition,
  getAbsolutePlaybackPosition,
  getStreamPlaybackTime,
} from './timeline';
import type { PlayerSubtitleTrack } from '@shiroani/shared';

interface LocalPlayerProps {
  episodeId: number;
}

const IDLE_HIDE_MS = 2500;
/** Seeks shorter than this use client-side `<video>.currentTime = t`. */
const SMALL_SEEK_THRESHOLD_SECONDS = 2;

function pickDefaultSubtitleTrack(tracks: PlayerSubtitleTrack[]): PlayerSubtitleTrack | null {
  const renderable = tracks.filter(t => t.subsUrl !== null);
  if (renderable.length === 0) return null;
  const byDefault = renderable.find(t => t.isDefault);
  return byDefault ?? renderable[0];
}

/**
 * Phase 4b top-level player surface. Owns:
 *
 *   - video element + session lifecycle (via `usePlayerSession`)
 *   - subtitle rendering (via `useJassub`)
 *   - chrome visibility (auto-hide after idle)
 *   - keyboard shortcuts + fullscreen
 *   - playback progress writes (via `usePlayerProgress`)
 *
 * Intentionally a chunky component — the controls, overlays, and menus are
 * their own files, but the glue between them is hard to split without
 * introducing ref plumbing that adds more complexity than it removes. The
 * hooks above carry most of the real logic.
 */
export function LocalPlayer({ episodeId }: LocalPlayerProps) {
  const closePlayer = useLocalLibraryStore(s => s.closePlayer);
  const setPlayerMode = useLocalLibraryStore(s => s.setPlayerMode);
  const startScan = useLocalLibraryStore(s => s.startScan);

  // Episode + series from the store (for the top bar titles).
  const episode = useLocalLibraryStore(s =>
    Object.values(s.episodes)
      .flat()
      .find(e => e.id === episodeId)
  );
  const continueWatchingItem = useLocalLibraryStore(s =>
    s.continueWatching.find(item => item.episode.id === episodeId)
  );
  const series = useLocalLibraryStore(s =>
    continueWatchingItem
      ? continueWatchingItem.series
      : s.series.find(x => episode && x.id === episode.seriesId)
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // ---- Session lifecycle ----
  const {
    session,
    error,
    isOpening,
    streamStartSeconds,
    streamGeneration,
    reopen,
    closeSession,
    seek,
    switchAudio,
  } = usePlayerSession(episodeId);

  // Mirror mode to the store so the shell can show a hint elsewhere if it
  // ever wants to.
  useEffect(() => {
    setPlayerMode(session?.mode ?? null);
    return () => setPlayerMode(null);
  }, [session?.mode, setPlayerMode]);

  // ---- Playback state ----
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  // Kept as React state only so the bottom bar timestamp updates. The seek
  // bar itself gets pushed values imperatively via `seekSetTimeRef` to avoid
  // re-rendering it every rAF tick.
  const [displayTime, setDisplayTime] = useState(0);
  // Shown while we await the backend's SEEK_RESULT. Independent from
  // session-level isOpening.
  const [isSeeking, setIsSeeking] = useState(false);

  // Active track indices (local UI state — the backend doesn't push these).
  const [activeAudioIndex, setActiveAudioIndex] = useState<number>(() => 0);
  const [activeSubtitleIndex, setActiveSubtitleIndex] = useState<number | null>(null);

  // Seed track selections once when the session arrives.
  const hydratedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!session) return;
    if (hydratedRef.current === session.sessionId) return;
    hydratedRef.current = session.sessionId;

    const defaultAudio = session.audioTracks.find(t => t.isDefault) ?? session.audioTracks[0];
    setActiveAudioIndex(defaultAudio?.index ?? 0);

    const defaultSub = pickDefaultSubtitleTrack(session.subtitleTracks);
    setActiveSubtitleIndex(defaultSub?.index ?? null);
  }, [session]);

  const activeSubtitleTrack = useMemo(() => {
    if (!session || activeSubtitleIndex === null) return null;
    return session.subtitleTracks.find(t => t.index === activeSubtitleIndex) ?? null;
  }, [session, activeSubtitleIndex]);

  // ---- JASSUB subtitles ----
  useJassub({
    videoRef,
    subsUrl: activeSubtitleTrack?.subsUrl ?? null,
    fonts: session?.fontUrls,
    // Bump on session change so JASSUB fully re-initializes (new video
    // element lifecycle, new fonts).
    resetKey: streamGeneration,
  });

  // ---- Video src management ----
  // When `streamGeneration` ticks (initial open, seek, audio switch) we
  // re-apply the stream URL with a cache-busting query param so the element
  // tears down the old MediaSource + HTTP connection cleanly.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !session) return;
    const busted = `${session.streamUrl}${session.streamUrl.includes('?') ? '&' : '?'}gen=${streamGeneration}`;
    video.src = busted;
    video.load();
  }, [session, streamGeneration]);

  // ---- Resume position ----
  // Apply once per stream generation (initial only — subsequent generations
  // already start from the seek target via ffmpeg).
  const resumedForGenRef = useRef(-1);
  useEffect(() => {
    if (!session) return;
    if (resumedForGenRef.current === streamGeneration) return;

    const video = videoRef.current;
    if (!video) return;
    const apply = () => {
      // Only apply the stored resume on the *first* generation; later
      // generations come from explicit seeks that the backend already
      // positioned the stream at.
      if (streamGeneration === 1) {
        if (session.resumePositionSeconds > 0) {
          // Clamp to just under duration to avoid landing on the credits flip.
          const target = Math.min(
            session.resumePositionSeconds,
            session.durationSeconds > 0
              ? session.durationSeconds - 1
              : session.resumePositionSeconds
          );
          try {
            video.currentTime = Math.max(0, target);
          } catch {
            /* video element may not be ready — retry on next metadata event */
          }
        }
      }
      resumedForGenRef.current = streamGeneration;
      // Autoplay: most browsers allow muted autoplay unconditionally, but
      // our video starts unmuted because the user just clicked Play on the
      // previous screen (user gesture). If autoplay is blocked anyway, the
      // user can press Space.
      video.play().catch(() => {
        /* autoplay may be blocked — UI will offer the play button */
      });
    };

    if (video.readyState >= 1) {
      apply();
    } else {
      video.addEventListener('loadedmetadata', apply, { once: true });
      return () => video.removeEventListener('loadedmetadata', apply);
    }
  }, [session, streamGeneration]);

  useEffect(() => {
    if (!session || streamStartSeconds <= 0) return;

    const video = videoRef.current;
    if (!video) return;

    const normalize = () => {
      if (video.currentTime <= 0.001) return;
      try {
        // Keep the media timeline stream-relative; absolute episode position is
        // tracked separately via `streamStartSeconds`.
        video.currentTime = 0;
      } catch {
        /* non-seekable live fragment â€” leave as-is */
      }
    };

    if (video.readyState >= 1) {
      normalize();
    } else {
      video.addEventListener('loadedmetadata', normalize, { once: true });
      return () => video.removeEventListener('loadedmetadata', normalize);
    }
  }, [session, streamGeneration, streamStartSeconds]);

  // ---- Video event wiring ----
  // rAF-driven imperative update of the seek bar so we're not re-rendering
  // the whole player every ~33ms. React state (`displayTime`) only ticks
  // ~twice per second so the timecode refreshes without thrashing.
  const seekSetTimeRef = useRef<((t: number) => void) | null>(null);
  const bindSeekSetTime = useCallback((setter: (t: number) => void) => {
    seekSetTimeRef.current = setter;
  }, []);

  const streamStartRef = useRef(streamStartSeconds);
  useEffect(() => {
    streamStartRef.current = streamStartSeconds;
  }, [streamStartSeconds]);

  const durationSecondsRef = useRef(session?.durationSeconds ?? 0);
  useEffect(() => {
    durationSecondsRef.current = session?.durationSeconds ?? 0;
  }, [session?.durationSeconds]);

  useEffect(() => {
    if (!session) return;
    const absolute = clampPlaybackPosition(streamStartSeconds, session.durationSeconds);
    setDisplayTime(absolute);
    seekSetTimeRef.current?.(absolute);
  }, [session, streamStartSeconds, streamGeneration]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let rafId: number | null = null;
    let lastReactTick = 0;

    const tick = () => {
      const absolute = getAbsolutePlaybackPosition(
        streamStartRef.current,
        video.currentTime,
        durationSecondsRef.current
      );
      seekSetTimeRef.current?.(absolute);
      const now = performance.now();
      if (now - lastReactTick > 500) {
        lastReactTick = now;
        setDisplayTime(absolute);
      }
      rafId = requestAnimationFrame(tick);
    };

    const onPlay = () => {
      setIsPlaying(true);
      if (rafId === null) rafId = requestAnimationFrame(tick);
    };
    const onPause = () => {
      setIsPlaying(false);
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      // Make sure the UI reflects the final paused time exactly.
      const absolute = getAbsolutePlaybackPosition(
        streamStartRef.current,
        video.currentTime,
        durationSecondsRef.current
      );
      setDisplayTime(absolute);
      seekSetTimeRef.current?.(absolute);
    };
    const onEnded = () => {
      setIsPlaying(false);
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    };
    const onVolumeChange = () => {
      setVolume(video.volume);
      setMuted(video.muted);
    };
    const onRateChange = () => setPlaybackRate(video.playbackRate);

    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('ended', onEnded);
    video.addEventListener('volumechange', onVolumeChange);
    video.addEventListener('ratechange', onRateChange);

    // Init state from element (in case browser persisted values).
    setVolume(video.volume);
    setMuted(video.muted);
    setPlaybackRate(video.playbackRate);

    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('ended', onEnded);
      video.removeEventListener('volumechange', onVolumeChange);
      video.removeEventListener('ratechange', onRateChange);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
    // Re-bind when the element remounts (stream generation causes a `load()`
    // but the element itself doesn't remount, so a once-on-session effect is
    // sufficient).
  }, [session?.sessionId]);

  // ---- Fullscreen ----
  useEffect(() => {
    const onChange = () => setIsFullscreen(document.fullscreenElement != null);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {
        /* user-gesture required or already exiting */
      });
    } else {
      el.requestFullscreen().catch(() => {
        /* blocked — no action */
      });
    }
  }, []);

  // ---- Progress writes ----
  const { flush: flushProgress } = usePlayerProgress({
    episodeId,
    durationSeconds: session?.durationSeconds ?? 0,
    streamStartSeconds,
    videoRef,
  });

  // ---- Control handlers ----
  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {
        /* ignore */
      });
    } else {
      video.pause();
    }
  }, []);

  // Forward ref to the seek handler — we want `applySeek` defined below to be
  // callable from the `applySeekDelta` callback without making `session` the
  // only dependency. Using a ref here avoids a circular useCallback chain.
  const applySeekRef = useRef<(target: number) => void>(() => {});

  const applySeekDelta = useCallback(
    (delta: number) => {
      const video = videoRef.current;
      if (!video || !session) return;
      const currentAbsolute = getAbsolutePlaybackPosition(
        streamStartRef.current,
        video.currentTime,
        session.durationSeconds
      );
      const target = clampPlaybackPosition(currentAbsolute + delta, session.durationSeconds);
      applySeekRef.current(target);
    },
    [session]
  );

  const applySeek = useCallback(
    async (target: number) => {
      const video = videoRef.current;
      if (!video || !session) return;
      const absoluteTarget = clampPlaybackPosition(target, session.durationSeconds);
      const currentAbsolute = getAbsolutePlaybackPosition(
        streamStartRef.current,
        video.currentTime,
        session.durationSeconds
      );
      const distance = Math.abs(absoluteTarget - currentAbsolute);
      const canClientSeek = absoluteTarget >= streamStartRef.current;

      // Small seeks: assume the buffered range contains the target and just
      // move the element's currentTime. Cheap and responsive.
      if (distance <= SMALL_SEEK_THRESHOLD_SECONDS && canClientSeek) {
        try {
          video.currentTime = getStreamPlaybackTime(streamStartRef.current, absoluteTarget);
          setDisplayTime(absoluteTarget);
          seekSetTimeRef.current?.(absoluteTarget);
          // Persist the new position on manual seek — the throttled tick
          // might otherwise skip an emit between the jump and the next
          // `timeupdate`.
          flushProgress();
        } catch {
          /* ignore */
        }
        return;
      }

      // Large seeks: kill + re-spawn the ffmpeg stream at the new position.
      setIsSeeking(true);
      setDisplayTime(absoluteTarget);
      seekSetTimeRef.current?.(absoluteTarget);
      flushProgress();
      const ok = await seek(absoluteTarget);
      setIsSeeking(false);
      if (!ok) {
        // Session refused the seek — reset the display time back to where the
        // video actually is so the UI doesn't lie.
        const absolute = getAbsolutePlaybackPosition(
          streamStartRef.current,
          video.currentTime,
          session.durationSeconds
        );
        setDisplayTime(absolute);
        seekSetTimeRef.current?.(absolute);
      }
    },
    [session, seek, flushProgress]
  );

  // Keep the ref in sync so callbacks that can't depend directly on `applySeek`
  // (without destabilising their own deps) still call the latest version.
  useEffect(() => {
    applySeekRef.current = applySeek;
  }, [applySeek]);

  const applySeekToFraction = useCallback(
    (fraction: number) => {
      if (!session) return;
      applySeek(fraction * session.durationSeconds);
    },
    [applySeek, session]
  );

  const applyVolumeDelta = useCallback((delta: number) => {
    const video = videoRef.current;
    if (!video) return;
    const next = Math.max(0, Math.min(1, video.volume + delta));
    video.volume = next;
    if (video.muted && next > 0) video.muted = false;
  }, []);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
  }, []);

  const applyVolume = useCallback((next: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = Math.max(0, Math.min(1, next));
    if (video.muted && next > 0) video.muted = false;
  }, []);

  const applyPlaybackRate = useCallback((next: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = next;
  }, []);

  const cyclePlaybackRate = useCallback(
    (delta: 1 | -1) => {
      const SPEED_SEQUENCE = [0.5, 0.75, 1, 1.25, 1.5, 2];
      const currentIdx = SPEED_SEQUENCE.indexOf(playbackRate);
      const fallbackIdx = currentIdx === -1 ? 2 : currentIdx;
      const nextIdx = Math.max(0, Math.min(SPEED_SEQUENCE.length - 1, fallbackIdx + delta));
      applyPlaybackRate(SPEED_SEQUENCE[nextIdx]);
    },
    [playbackRate, applyPlaybackRate]
  );

  const handleAudioTrackChange = useCallback(
    async (trackIndex: number) => {
      if (!session) return;
      if (trackIndex === activeAudioIndex) return;
      const video = videoRef.current;
      const at = video
        ? getAbsolutePlaybackPosition(
            streamStartRef.current,
            video.currentTime,
            session.durationSeconds
          )
        : streamStartRef.current;
      setActiveAudioIndex(trackIndex);
      setIsSeeking(true);
      flushProgress();
      const ok = await switchAudio(trackIndex, at);
      setIsSeeking(false);
      if (!ok) {
        // Roll back the UI selection if the backend rejected.
        setActiveAudioIndex(activeAudioIndex);
      }
    },
    [session, activeAudioIndex, switchAudio, flushProgress]
  );

  const cycleAudioTrack = useCallback(() => {
    if (!session || session.audioTracks.length <= 1) return;
    const sortedIdx = session.audioTracks.map(t => t.index);
    const currentPos = sortedIdx.indexOf(activeAudioIndex);
    const nextPos = (currentPos + 1) % sortedIdx.length;
    void handleAudioTrackChange(sortedIdx[nextPos]);
  }, [session, activeAudioIndex, handleAudioTrackChange]);

  const cycleSubtitleTrack = useCallback(() => {
    if (!session) return;
    const renderable = session.subtitleTracks.filter(t => t.subsUrl !== null);
    if (renderable.length === 0) {
      setActiveSubtitleIndex(null);
      return;
    }
    // Off → first → ... → last → Off
    if (activeSubtitleIndex === null) {
      setActiveSubtitleIndex(renderable[0].index);
      return;
    }
    const currentPos = renderable.findIndex(t => t.index === activeSubtitleIndex);
    if (currentPos === -1 || currentPos === renderable.length - 1) {
      setActiveSubtitleIndex(null);
      return;
    }
    setActiveSubtitleIndex(renderable[currentPos + 1].index);
  }, [session, activeSubtitleIndex]);

  // ---- Back handler ----
  const handleBack = useCallback(() => {
    flushProgress();
    closeSession();
    closePlayer();
  }, [flushProgress, closeSession, closePlayer]);

  // ---- Keyboard shortcuts ----
  const keyboardHandlers = useMemo(
    () => ({
      onTogglePlay: togglePlay,
      onSeekDelta: applySeekDelta,
      onSeekToFraction: applySeekToFraction,
      onVolumeDelta: applyVolumeDelta,
      onToggleMute: toggleMute,
      onToggleFullscreen: toggleFullscreen,
      onCycleSubtitleTrack: cycleSubtitleTrack,
      onCycleAudioTrack: cycleAudioTrack,
      onSpeedDelta: cyclePlaybackRate,
      onClose: handleBack,
    }),
    [
      togglePlay,
      applySeekDelta,
      applySeekToFraction,
      applyVolumeDelta,
      toggleMute,
      toggleFullscreen,
      cycleSubtitleTrack,
      cycleAudioTrack,
      cyclePlaybackRate,
      handleBack,
    ]
  );
  // Disable shortcuts while the session is still opening (otherwise Escape
  // from the global LocalLibraryView handler and the player handler fight).
  usePlayerKeyboard(keyboardHandlers, !!session);

  // ---- Chrome auto-hide ----
  const [chromeVisible, setChromeVisible] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const hideTimerRef = useRef<number | null>(null);

  const revealChrome = useCallback(() => {
    setChromeVisible(true);
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    // Don't hide if the video isn't playing, a menu is open, or an error
    // overlay is up — those states need sustained user attention.
    if (!isPlaying || menuOpen || error || isOpening || isSeeking) return;
    hideTimerRef.current = window.setTimeout(() => {
      setChromeVisible(false);
      hideTimerRef.current = null;
    }, IDLE_HIDE_MS);
  }, [isPlaying, menuOpen, error, isOpening, isSeeking]);

  useEffect(() => {
    // Recompute visibility when any of the "should stay visible" conditions
    // flip. E.g. pausing should reveal the chrome immediately.
    revealChrome();
  }, [revealChrome]);

  useEffect(() => {
    return () => {
      if (hideTimerRef.current !== null) {
        window.clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    };
  }, []);

  // ---- Ffmpeg setup + rescan handoff ----
  const [ffmpegDialogOpen, setFfmpegDialogOpen] = useState(false);
  const handleRescan = useCallback(() => {
    // The series' rootId is the right target. Fire-and-forget.
    if (series) {
      void startScan(series.rootId);
    }
    closePlayer();
  }, [series, startScan, closePlayer]);

  // ---- Title bits for the top bar ----
  const seriesTitle = series?.displayTitle ?? series?.parsedTitle ?? 'Odcinek';
  const episodeBadge = useMemo(() => {
    if (!episode) return null;
    const s = episode.parsedSeason ?? 1;
    const e = episode.parsedEpisodeNumber;
    if (e === null) return `S${String(s).padStart(2, '0')}`;
    return `S${String(s).padStart(2, '0')}E${String(e).padStart(2, '0')}`;
  }, [episode]);
  const episodeTitle = episode?.parsedTitle ?? null;

  return (
    <>
      <div
        ref={containerRef}
        className={cn(
          'relative flex flex-1 flex-col overflow-hidden bg-black',
          !chromeVisible && 'cursor-none'
        )}
        onMouseMove={revealChrome}
      >
        {/* Video. Controls attr is intentionally absent — we own them all. */}
        <video
          ref={videoRef}
          // `playsInline` is critical on iOS-based webkit; we render inside an
          // Electron window but using the Chrome engine, so it's harmless here.
          playsInline
          preload="auto"
          className="absolute inset-0 h-full w-full bg-black"
          // Click the video to toggle play/pause like any mainstream player.
          onClick={togglePlay}
        />

        {session && (
          <>
            <PlayerTopBar
              seriesTitle={seriesTitle}
              episodeTitle={episodeTitle}
              episodeBadge={episodeBadge}
              mode={session.mode}
              onBack={handleBack}
              visible={chromeVisible}
            />
            <PlayerBottomBar
              visible={chromeVisible}
              playing={isPlaying}
              durationSeconds={session.durationSeconds}
              currentTime={displayTime}
              chapters={session.chapters}
              volume={volume}
              muted={muted}
              playbackRate={playbackRate}
              audioTracks={session.audioTracks}
              activeAudioIndex={activeAudioIndex}
              subtitleTracks={session.subtitleTracks}
              activeSubtitleIndex={activeSubtitleIndex}
              isFullscreen={isFullscreen}
              onTogglePlay={togglePlay}
              onSeek={applySeek}
              onSeekDelta={applySeekDelta}
              onVolumeChange={applyVolume}
              onToggleMute={toggleMute}
              onPlaybackRateChange={applyPlaybackRate}
              onAudioTrackChange={handleAudioTrackChange}
              onSubtitleTrackChange={setActiveSubtitleIndex}
              onSubtitleOff={() => setActiveSubtitleIndex(null)}
              onToggleFullscreen={toggleFullscreen}
              onMenuOpenChange={setMenuOpen}
              bindSeekSetTime={bindSeekSetTime}
            />
          </>
        )}

        {/* Opening spinner — don't block chrome once session exists. */}
        {isOpening && !error && (
          <PlayerLoadingOverlay
            label="Przygotowywanie odtwarzacza"
            sublabel="Sprawdzam ścieżki audio, napisy i rozdziały…"
          />
        )}
        {isSeeking && !error && (
          <PlayerLoadingOverlay
            label="Wyszukiwanie…"
            sublabel="FFmpeg przygotowuje nowy strumień"
          />
        )}
        {error && (
          <PlayerErrorOverlay
            error={error}
            onRetry={reopen}
            onBack={handleBack}
            onOpenFfmpegSetup={() => setFfmpegDialogOpen(true)}
            onRescan={series ? handleRescan : null}
          />
        )}
      </div>

      <FfmpegSetupDialog
        open={ffmpegDialogOpen}
        onOpenChange={setFfmpegDialogOpen}
        onReady={() => {
          setFfmpegDialogOpen(false);
          // Once FFmpeg is ready, re-open the session automatically.
          reopen();
        }}
      />
    </>
  );
}
