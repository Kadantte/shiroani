import { memo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import type { LocalSeries, SeriesProgressSummary } from '@shiroani/shared';
import { PosterImage } from '../posters/PosterImage';

interface SeriesCardProps {
  series: LocalSeries;
  progress?: SeriesProgressSummary;
  onSelect: (id: number) => void;
}

function formatLastWatched(iso: string | null): string | null {
  if (!iso) return null;
  try {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return null;
    const diffMs = Date.now() - date.getTime();
    const day = 24 * 60 * 60 * 1000;
    if (diffMs < day) return 'Dziś';
    if (diffMs < 2 * day) return 'Wczoraj';
    if (diffMs < 7 * day) return `${Math.floor(diffMs / day)} dni temu`;
    return date.toLocaleDateString('pl-PL', { day: '2-digit', month: 'short' });
  } catch {
    return null;
  }
}

const SeriesCard = memo(function SeriesCard({ series, progress, onSelect }: SeriesCardProps) {
  const title = series.displayTitle ?? series.parsedTitle;

  const watched = progress?.watchedCount ?? 0;
  const total = progress?.totalCount ?? 0;
  const lastWatched = formatLastWatched(progress?.lastWatchedAt ?? null);

  const handleClick = useCallback(() => onSelect(series.id), [onSelect, series.id]);
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSelect(series.id);
      }
    },
    [onSelect, series.id]
  );

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={title}
      className={cn(
        'group relative rounded-lg overflow-hidden cursor-pointer',
        'bg-card/80 border border-border-glass',
        'transition-shadow duration-200',
        'hover:shadow-primary-glow focus-visible:shadow-primary-glow',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
      )}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      {/* Poster area — fixed 3/4 aspect so the artwork box is always the same
          size regardless of whether PosterImage renders an <img> or the
          placeholder gradient. Badges + progress bar live as overlays here. */}
      <div className="relative aspect-[3/4] overflow-hidden">
        <PosterImage
          series={series}
          kind="poster"
          showIcon
          className="transition-transform duration-300 group-hover:scale-105"
        />

        {total > 0 && watched > 0 && (
          <div className="absolute top-2 right-2">
            <div className="rounded-full bg-background/80 backdrop-blur-sm px-2 py-0.5 text-[10px] font-medium text-foreground/90 border border-border/40">
              {watched}/{total}
            </div>
          </div>
        )}

        {series.matchStatus === 'unmatched' && (
          <div className="absolute top-2 left-2">
            <div className="rounded-full bg-amber-500/80 backdrop-blur-sm px-1.5 py-0.5 text-[9px] uppercase tracking-wide font-semibold text-amber-950">
              Niedopasowane
            </div>
          </div>
        )}

        {total > 0 && watched > 0 && (
          <div className="absolute bottom-0 inset-x-0 h-0.5 bg-background/30">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${Math.min(100, (watched / Math.max(1, total)) * 100)}%` }}
            />
          </div>
        )}
      </div>

      {/* Title + meta below the poster. Kept outside the aspect-ratio box so
          it stays readable even when the placeholder gradient fills the
          artwork area. */}
      <div className="px-2.5 py-2 space-y-0.5">
        <h3 className="text-xs font-medium text-foreground leading-tight line-clamp-2">{title}</h3>
        <p className="text-[10px] text-muted-foreground/80 flex items-center gap-1.5 truncate">
          <span>{total > 0 ? `${watched} / ${total} odc.` : 'Brak odcinków'}</span>
          {lastWatched && (
            <>
              <span className="opacity-40">•</span>
              <span className="truncate">{lastWatched}</span>
            </>
          )}
        </p>
      </div>
    </div>
  );
});

export { SeriesCard };
