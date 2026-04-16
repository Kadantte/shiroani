import { Maximize, Minimize, Pause, Play, SkipBack, SkipForward } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PlayerSeekBar } from './PlayerSeekBar';
import { PlayerVolumeControl } from './PlayerVolumeControl';
import { PlayerSpeedMenu } from './PlayerSpeedMenu';
import { PlayerAudioTrackMenu } from './PlayerAudioTrackMenu';
import { PlayerSubtitleTrackMenu } from './PlayerSubtitleTrackMenu';
import type { PlayerAudioTrack, PlayerChapter, PlayerSubtitleTrack } from '@shiroani/shared';

interface PlayerBottomBarProps {
  visible: boolean;
  playing: boolean;
  durationSeconds: number;
  currentTime: number;
  chapters: PlayerChapter[];
  volume: number;
  muted: boolean;
  playbackRate: number;
  audioTracks: PlayerAudioTrack[];
  activeAudioIndex: number;
  subtitleTracks: PlayerSubtitleTrack[];
  activeSubtitleIndex: number | null;
  isFullscreen: boolean;
  onTogglePlay: () => void;
  onSeek: (positionSeconds: number) => void;
  onSeekDelta: (deltaSeconds: number) => void;
  onVolumeChange: (volume: number) => void;
  onToggleMute: () => void;
  onPlaybackRateChange: (rate: number) => void;
  onAudioTrackChange: (trackIndex: number) => void;
  onSubtitleTrackChange: (trackIndex: number) => void;
  onSubtitleOff: () => void;
  onToggleFullscreen: () => void;
  /** Called when a menu opens/closes so the parent can pause auto-hide. */
  onMenuOpenChange?: (open: boolean) => void;
  bindSeekSetTime?: (setter: (t: number) => void) => void;
}

function formatTimecode(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0;
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * The business end of the chrome. Layout rhythm (scrubber above, controls
 * below) mirrors the hero-player convention users already know; colocating
 * the primary playback/seek controls on the left lets the secondary menus
 * (speed/audio/subtitles/fullscreen) sit on the right where the eye
 * naturally scans last.
 */
export function PlayerBottomBar(props: PlayerBottomBarProps) {
  const {
    visible,
    playing,
    durationSeconds,
    currentTime,
    chapters,
    volume,
    muted,
    playbackRate,
    audioTracks,
    activeAudioIndex,
    subtitleTracks,
    activeSubtitleIndex,
    isFullscreen,
    onTogglePlay,
    onSeek,
    onSeekDelta,
    onVolumeChange,
    onToggleMute,
    onPlaybackRateChange,
    onAudioTrackChange,
    onSubtitleTrackChange,
    onSubtitleOff,
    onToggleFullscreen,
    onMenuOpenChange,
    bindSeekSetTime,
  } = props;

  const hasMultipleAudio = audioTracks.length > 1;
  const hasRenderableSubs = subtitleTracks.some(t => t.subsUrl !== null);

  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-x-0 bottom-0 z-20 transition-opacity duration-200',
        'bg-gradient-to-t from-black/85 via-black/60 to-transparent',
        visible ? 'opacity-100' : 'opacity-0'
      )}
    >
      <div className="pointer-events-auto px-5 pb-4 pt-10">
        {/* Scrubber */}
        <PlayerSeekBar
          durationSeconds={durationSeconds}
          initialTime={currentTime}
          chapters={chapters}
          onSeek={onSeek}
          bindSetTime={bindSeekSetTime}
        />

        {/* Controls row */}
        <div className="mt-2 flex items-center gap-1.5">
          <button
            type="button"
            aria-label={playing ? 'Pauza' : 'Odtwarzaj'}
            title={playing ? 'Pauza (Space / K)' : 'Odtwarzaj (Space / K)'}
            onClick={onTogglePlay}
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-md text-white transition-colors',
              'hover:bg-white/10 focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-white/40'
            )}
          >
            {playing ? (
              <Pause className="h-5 w-5" fill="currentColor" />
            ) : (
              <Play className="h-5 w-5" fill="currentColor" />
            )}
          </button>

          <button
            type="button"
            aria-label="Cofnij 10 s"
            title="Cofnij 10 s (J)"
            onClick={() => onSeekDelta(-10)}
            className="flex h-9 w-9 items-center justify-center rounded-md text-white/80 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-white/40"
          >
            <SkipBack className="h-4 w-4" />
          </button>

          <button
            type="button"
            aria-label="Przewiń 10 s"
            title="Przewiń 10 s (L)"
            onClick={() => onSeekDelta(10)}
            className="flex h-9 w-9 items-center justify-center rounded-md text-white/80 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-white/40"
          >
            <SkipForward className="h-4 w-4" />
          </button>

          <PlayerVolumeControl
            volume={volume}
            muted={muted}
            onVolumeChange={onVolumeChange}
            onToggleMute={onToggleMute}
          />

          <div className="ml-2 flex items-center gap-1.5 text-xs tabular-nums text-white/80">
            <span>{formatTimecode(currentTime)}</span>
            <span className="text-white/40">/</span>
            <span className="text-white/60">{formatTimecode(durationSeconds)}</span>
          </div>

          <div className="ml-auto flex items-center gap-0.5">
            <PlayerSpeedMenu
              rate={playbackRate}
              onChange={onPlaybackRateChange}
              onOpenChange={onMenuOpenChange}
            />
            {hasMultipleAudio && (
              <PlayerAudioTrackMenu
                tracks={audioTracks}
                activeIndex={activeAudioIndex}
                onSelect={onAudioTrackChange}
                onOpenChange={onMenuOpenChange}
              />
            )}
            {hasRenderableSubs && (
              <PlayerSubtitleTrackMenu
                tracks={subtitleTracks}
                activeIndex={activeSubtitleIndex}
                onSelect={onSubtitleTrackChange}
                onSelectOff={onSubtitleOff}
                onOpenChange={onMenuOpenChange}
              />
            )}
            <button
              type="button"
              aria-label={isFullscreen ? 'Wyjdź z pełnego ekranu' : 'Pełny ekran'}
              title={isFullscreen ? 'Wyjdź z pełnego ekranu (F)' : 'Pełny ekran (F)'}
              onClick={onToggleFullscreen}
              className="flex h-9 w-9 items-center justify-center rounded-md text-white/80 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-white/40"
            >
              {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
