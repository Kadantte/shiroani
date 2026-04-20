import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Variant of the timeline dot marker.
 *
 * - `solid`   — filled with the accent color; paired with a glow ring.
 * - `outline` — transparent centre with a colored stroke (default).
 * - `dashed`  — dashed stroke; used for the tail / end-of-history marker.
 */
export type TimelineMarkerVariant = 'solid' | 'outline' | 'dashed';

export interface TimelineEntry {
  /** Stable React key. Also used as the anchor id. */
  id: string;
  /** Optional fully custom marker node. When supplied, `markerVariant` is ignored. */
  marker?: ReactNode;
  /** Default dot-style marker variant. Defaults to `outline`. */
  markerVariant?: TimelineMarkerVariant;
  /**
   * Optional headline rendered in the left column (appears above `timestamp`).
   * In the changelog this is the version number (`v0.5.0`); in the diary it
   * could be the day-of-week label.
   */
  title?: ReactNode;
  /** Small mono-uppercase label rendered below `title` in the left column. */
  timestamp?: ReactNode;
  /** Main content — right column. */
  children: ReactNode;
}

export interface TimelineProps {
  entries: TimelineEntry[];
  /** Optional outer className. */
  className?: string;
  /**
   * Fixed width of the left column in px (timestamp / title area).
   * Default 76. On narrow screens the layout collapses to a single column.
   */
  sideWidth?: number;
  /** Horizontal gap in px between the vertical line and the content column. Default 48. */
  gap?: number;
}

/**
 * Timeline — a reusable vertical timeline primitive.
 *
 * Layout: a two-column grid. Left column is a narrow label (timestamp + title),
 * the middle is a 1-px vertical line with colored dots at each entry, and the
 * right column holds arbitrary content.
 *
 * Used by the Changelog view today; the Diary view will extend it later.
 *
 * Keep this component dumb: it only draws the structure. Colors come from
 * tokens (`--border-glass`, `--primary`, `--muted-foreground`) and individual
 * entries may override the dot via the `marker` slot.
 */
export function Timeline({ entries, className, sideWidth = 76, gap = 48 }: TimelineProps) {
  // The vertical line sits a comfortable 20px right of the label column so
  // the marker's 4px background halo never bleeds into the title text. Must
  // stay smaller than `gap` so the content column still clears the dot.
  const linePosition = sideWidth + 20;
  const contentPadding = sideWidth + gap;

  return (
    <div
      className={cn('relative', className)}
      style={{
        // Expose line position so child entries line up with it
        ['--timeline-line-x' as string]: `${linePosition}px`,
      }}
    >
      {/* Vertical rail */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-0 bottom-0 w-px bg-border-glass"
        style={{ left: linePosition }}
      />

      {entries.map(entry => (
        <section
          key={entry.id}
          id={entry.id}
          className="relative pb-14 last:pb-4"
          style={{ paddingLeft: contentPadding }}
        >
          {/* Left column — timestamp + title */}
          <div
            className="absolute top-[2px] text-right font-mono text-[10.5px] uppercase leading-[1.5] tracking-[0.12em] text-muted-foreground"
            style={{ left: 0, width: sideWidth }}
          >
            {entry.title && (
              <b className="mb-1 block font-sans text-[16px] font-extrabold normal-case tracking-[-0.01em] text-foreground">
                {entry.title}
              </b>
            )}
            {entry.timestamp && <span>{entry.timestamp}</span>}
          </div>

          {/* Marker */}
          <div
            aria-hidden
            className="absolute top-2 z-[1] -translate-x-1/2"
            style={{ left: linePosition }}
          >
            {entry.marker ?? <TimelineDot variant={entry.markerVariant ?? 'outline'} />}
          </div>

          {/* Content */}
          <div>{entry.children}</div>
        </section>
      ))}
    </div>
  );
}

interface TimelineDotProps {
  variant?: TimelineMarkerVariant;
}

/**
 * Default circular marker used by the timeline.
 *
 * - `outline`: hollow accent-ringed dot with a subtle halo.
 * - `solid`:   filled accent dot with a stronger halo (used for the latest entry).
 * - `dashed`:  muted dashed stroke (used at the end of a closed history).
 */
function TimelineDot({ variant = 'outline' }: TimelineDotProps) {
  if (variant === 'dashed') {
    return (
      <span
        className={cn(
          'block h-3 w-3 rounded-full border-2 border-dashed border-border-glass',
          'bg-background'
        )}
        style={{ boxShadow: '0 0 0 4px var(--background)' }}
      />
    );
  }
  if (variant === 'solid') {
    return (
      <span
        className="block h-3 w-3 rounded-full bg-primary"
        style={{
          boxShadow:
            '0 0 0 4px var(--background), 0 0 18px oklch(from var(--primary) l c h / 0.55)',
        }}
      />
    );
  }
  return (
    <span
      className="block h-3 w-3 rounded-full border-2 border-primary bg-background"
      style={{
        boxShadow: '0 0 0 4px var(--background), 0 0 12px oklch(from var(--primary) l c h / 0.35)',
      }}
    />
  );
}
