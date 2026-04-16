import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import { cn } from '@/lib/utils';
import type { PlayerChapter } from '@shiroani/shared';

interface PlayerSeekBarProps {
  /** Total duration in seconds. Required (0 disables the bar). */
  durationSeconds: number;
  /**
   * Current playback time in seconds. This is fed imperatively via `setTime`
   * on a ref from the parent's rAF loop — we avoid rendering every frame.
   */
  initialTime: number;
  chapters: PlayerChapter[];
  /**
   * Fires once the user releases the drag (or clicks somewhere to seek). This
   * is the *commit* — intermediate drag positions are broadcast via
   * `onPreview`.
   */
  onSeek: (positionSeconds: number) => void;
  /**
   * Fires on every drag / hover frame with the tentative position. Consumers
   * use it to render the JASSUB canvas at a preview timestamp without
   * triggering a backend round-trip.
   */
  onPreview?: (positionSeconds: number | null) => void;
  /** Bind this setter from the parent to push currentTime imperatively. */
  bindSetTime?: (setter: (t: number) => void) => void;
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
 * Custom scrubber. Differs from a stock Radix Slider in three ways we need:
 *
 *   1. **Imperative time updates.** The parent pushes `currentTime` through
 *      `setTime` on every rAF tick; we only re-render when drag or hover
 *      state actually changes. Scrubbers updated through React state are a
 *      classic perf trap.
 *   2. **Chapter markers.** Thin notches painted over the track. Hover on the
 *      track shows the chapter title in the timecode tooltip.
 *   3. **Commit vs preview distinction.** Dragging shouldn't hammer the
 *      backend — we surface intermediate positions to the parent via
 *      `onPreview` and only call `onSeek` on release.
 */
export function PlayerSeekBar({
  durationSeconds,
  initialTime,
  chapters,
  onSeek,
  onPreview,
  bindSetTime,
}: PlayerSeekBarProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  // Imperative time — written via `setTime()` from the parent's rAF loop.
  const [time, setTime] = useState(initialTime);
  const timeRef = useRef(initialTime);

  // Hover + drag state.
  const [hoverPosition, setHoverPosition] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragPosition, setDragPosition] = useState<number | null>(null);

  // Expose `setTime` to the parent. Done once — the identity of `setTime`
  // doesn't change across renders because React's state setters are stable.
  useEffect(() => {
    if (!bindSetTime) return;
    const setter = (next: number) => {
      timeRef.current = next;
      setTime(next);
    };
    bindSetTime(setter);
  }, [bindSetTime]);

  // Fire preview when hover or drag position changes.
  useEffect(() => {
    const preview = isDragging ? dragPosition : hoverPosition;
    onPreview?.(preview);
  }, [hoverPosition, dragPosition, isDragging, onPreview]);

  const computePositionFromClientX = useCallback(
    (clientX: number): number => {
      const track = trackRef.current;
      if (!track || durationSeconds <= 0) return 0;
      const rect = track.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return ratio * durationSeconds;
    },
    [durationSeconds]
  );

  const onTrackMouseMove = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (isDragging) return;
    setHoverPosition(computePositionFromClientX(e.clientX));
  };

  const onTrackMouseLeave = () => {
    if (!isDragging) setHoverPosition(null);
  };

  const onTrackMouseDown = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (durationSeconds <= 0) return;
    e.preventDefault();
    const pos = computePositionFromClientX(e.clientX);
    setIsDragging(true);
    setDragPosition(pos);

    const onMove = (ev: MouseEvent) => {
      setDragPosition(computePositionFromClientX(ev.clientX));
    };
    const onUp = (ev: MouseEvent) => {
      const final = computePositionFromClientX(ev.clientX);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      setIsDragging(false);
      setDragPosition(null);
      setHoverPosition(null);
      onSeek(final);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  const effectiveTime = isDragging && dragPosition !== null ? dragPosition : time;
  const playedPct = durationSeconds > 0 ? (effectiveTime / durationSeconds) * 100 : 0;
  const tooltipPct =
    durationSeconds > 0
      ? (((isDragging ? dragPosition : hoverPosition) ?? 0) / durationSeconds) * 100
      : 0;

  const hoverOrDrag = isDragging ? dragPosition : hoverPosition;

  // Resolve which chapter the hovered position falls inside (for the tooltip).
  const hoveredChapter =
    hoverOrDrag !== null
      ? chapters.find(
          c => hoverOrDrag >= c.startSeconds && hoverOrDrag < (c.endSeconds || durationSeconds)
        )
      : undefined;

  return (
    <div className="relative w-full select-none">
      {/* Floating tooltip */}
      {hoverOrDrag !== null && durationSeconds > 0 && (
        <div
          className="pointer-events-none absolute -top-11 z-10 -translate-x-1/2 whitespace-nowrap rounded-md border border-white/10 bg-black/80 px-2 py-1 text-[11px] font-medium text-white/90 shadow-lg backdrop-blur"
          style={{ left: `${tooltipPct}%` }}
        >
          <span className="tabular-nums">{formatTimecode(hoverOrDrag)}</span>
          {hoveredChapter?.title && (
            <span className="ml-2 text-white/60">{hoveredChapter.title}</span>
          )}
        </div>
      )}

      {/* Track */}
      <div
        ref={trackRef}
        onMouseMove={onTrackMouseMove}
        onMouseLeave={onTrackMouseLeave}
        onMouseDown={onTrackMouseDown}
        role="slider"
        aria-label="Postęp odtwarzania"
        aria-valuemin={0}
        aria-valuemax={Math.round(durationSeconds)}
        aria-valuenow={Math.round(effectiveTime)}
        tabIndex={0}
        className={cn(
          'group relative h-6 w-full cursor-pointer items-center',
          durationSeconds <= 0 && 'pointer-events-none opacity-50'
        )}
      >
        {/* Visual track — slim by default, thicker on hover/drag */}
        <div
          className={cn(
            'absolute left-0 right-0 top-1/2 h-[3px] -translate-y-1/2 overflow-hidden rounded-full bg-white/20 transition-all duration-150',
            '[.group:hover_&]:h-[5px]',
            isDragging && 'h-[5px]'
          )}
        >
          {/* Played range */}
          <div
            className="absolute inset-y-0 left-0 bg-primary"
            style={{ width: `${playedPct}%` }}
          />
          {/* Hover ghost */}
          {hoverOrDrag !== null && !isDragging && (
            <div
              className="absolute inset-y-0 left-0 bg-white/20"
              style={{ width: `${tooltipPct}%` }}
            />
          )}
        </div>

        {/* Chapter markers */}
        {durationSeconds > 0 &&
          chapters.map((chapter, idx) => {
            if (idx === 0 && chapter.startSeconds <= 0) return null;
            const pct = (chapter.startSeconds / durationSeconds) * 100;
            if (pct <= 0 || pct >= 100) return null;
            return (
              <div
                key={`${chapter.startSeconds}-${idx}`}
                className="absolute top-1/2 h-[7px] w-[2px] -translate-x-1/2 -translate-y-1/2 rounded bg-black/70"
                style={{ left: `${pct}%` }}
              />
            );
          })}

        {/* Thumb */}
        <div
          className={cn(
            'absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-md transition-opacity',
            'opacity-0 group-hover:opacity-100',
            isDragging && 'scale-125 opacity-100'
          )}
          style={{ left: `${playedPct}%` }}
        />
      </div>
    </div>
  );
}
