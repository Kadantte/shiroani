import { memo } from 'react';
import { Film } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LocalSeries, PosterKind } from '@shiroani/shared';

interface PosterImageProps {
  series: LocalSeries;
  kind: PosterKind;
  /** For banner: when the banner is missing, render the poster instead. */
  fallbackToPoster?: boolean;
  /** Optional className for the wrapper. */
  className?: string;
  /** Whether to show the film icon below the initials in the placeholder. */
  showIcon?: boolean;
  /** HTML alt attribute; defaults to the series title. */
  alt?: string;
}

/** Up to two uppercase initials from the display title. */
function initialsOf(title: string): string {
  return (
    title
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(w => w[0])
      .join('')
      .toUpperCase() || '?'
  );
}

/** Deterministic hue so each series gets its own placeholder gradient. */
function hueOf(title: string): number {
  let hash = 0;
  for (let i = 0; i < title.length; i += 1) {
    hash = (hash * 31 + title.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % 360;
}

/**
 * Parse an ISO-like updatedAt stamp into a short cache-buster suffix.
 * Falls back to the raw string when the timestamp is unparseable.
 */
function cacheBuster(series: LocalSeries): string {
  const raw = series.updatedAt;
  if (!raw) return '';
  const parsed = Date.parse(raw);
  if (Number.isFinite(parsed)) return String(parsed);
  return raw.replace(/[^0-9]/g, '');
}

/**
 * Render a series poster or banner via the `shiroani-poster://` custom
 * protocol. Falls back to a gradient-with-initials placeholder when the
 * series has no cached artwork for the requested kind.
 */
export const PosterImage = memo(function PosterImage({
  series,
  kind,
  fallbackToPoster = false,
  className,
  showIcon = false,
  alt,
}: PosterImageProps) {
  const title = series.displayTitle ?? series.parsedTitle;
  const resolvedAlt = alt ?? title;

  // Pick which artwork the series actually has for the requested kind,
  // honouring the banner -> poster fallback for hero backgrounds.
  const hasPrimary = kind === 'poster' ? !!series.posterPath : !!series.bannerPath;
  const fallbackKind: PosterKind | null =
    !hasPrimary && fallbackToPoster && kind === 'banner' && series.posterPath ? 'poster' : null;

  const effectiveKind = hasPrimary ? kind : fallbackKind;

  if (effectiveKind) {
    const subdir = effectiveKind === 'poster' ? 'posters' : 'banners';
    const src = `shiroani-poster://${subdir}/${series.id}?v=${cacheBuster(series)}`;
    return (
      <img
        src={src}
        alt={resolvedAlt}
        className={cn('w-full h-full object-cover', className)}
        loading="lazy"
        draggable={false}
      />
    );
  }

  // Placeholder gradient with initials. We avoid re-deriving hue in multiple
  // places by keeping the palette logic here.
  const initials = initialsOf(title);
  const hue = hueOf(title);

  return (
    <div
      aria-label={resolvedAlt}
      className={cn('w-full h-full flex flex-col items-center justify-center gap-3', className)}
      style={{
        background: `linear-gradient(135deg, hsl(${hue}, 45%, 28%) 0%, hsl(${(hue + 40) % 360}, 35%, 18%) 100%)`,
      }}
    >
      <div className="w-14 h-14 rounded-2xl bg-background/20 backdrop-blur-sm flex items-center justify-center">
        <span className="text-xl font-semibold text-foreground/90">{initials}</span>
      </div>
      {showIcon && <Film className="w-4 h-4 text-foreground/30" />}
    </div>
  );
});
