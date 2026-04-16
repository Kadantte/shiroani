import { memo, useCallback } from 'react';
import { Film } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LocalSeries, SeriesProgressSummary } from '@shiroani/shared';

interface SeriesCardProps {
  series: LocalSeries;
  progress?: SeriesProgressSummary;
  onSelect: (id: number) => void;
}

/** Extract up to two uppercase initials from a title for the poster fallback. */
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

/** Deterministic hue from the title so every card has its own placeholder color. */
function hueOf(title: string): number {
  let hash = 0;
  for (let i = 0; i < title.length; i += 1) {
    hash = (hash * 31 + title.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % 360;
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
  const initials = initialsOf(title);
  const hue = hueOf(title);

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
      <div className="relative aspect-[3/4] overflow-hidden">
        {series.posterPath ? (
          <img
            src={series.posterPath}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div
            className="w-full h-full flex flex-col items-center justify-center gap-3"
            style={{
              background: `linear-gradient(135deg, hsl(${hue}, 45%, 28%) 0%, hsl(${(hue + 40) % 360}, 35%, 18%) 100%)`,
            }}
          >
            <div className="w-14 h-14 rounded-2xl bg-background/20 backdrop-blur-sm flex items-center justify-center">
              <span className="text-xl font-semibold text-foreground/90">{initials}</span>
            </div>
            <Film className="w-4 h-4 text-foreground/30" />
          </div>
        )}

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

        {/* Bottom gradient overlay with title + meta */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/95 via-background/60 to-transparent p-3 pt-10">
          <h3 className="text-sm font-medium text-foreground leading-tight truncate-2">{title}</h3>
          <p className="text-[10px] text-muted-foreground/80 mt-1 flex items-center gap-1.5 truncate">
            <span>{total > 0 ? `${watched} / ${total} odc.` : 'Brak odcinków'}</span>
            {lastWatched && (
              <>
                <span className="opacity-40">•</span>
                <span className="truncate">{lastWatched}</span>
              </>
            )}
          </p>
        </div>

        {total > 0 && watched > 0 && (
          <div className="absolute bottom-0 inset-x-0 h-0.5 bg-background/30">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${Math.min(100, (watched / Math.max(1, total)) * 100)}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
});

export { SeriesCard };
