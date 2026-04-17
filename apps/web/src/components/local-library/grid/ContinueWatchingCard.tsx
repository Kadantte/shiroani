import { memo, useCallback } from 'react';
import { Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ContinueWatchingItem } from '@shiroani/shared';

interface ContinueWatchingCardProps {
  item: ContinueWatchingItem;
  onPlay: (episodeId: number) => void;
  onOpenSeries: (seriesId: number) => void;
}

function formatSeasonEpisode(season: number | null, episode: number | null): string {
  const s = season ?? 1;
  const e = episode ?? null;
  if (e === null) return `S${String(s).padStart(2, '0')}`;
  return `S${String(s).padStart(2, '0')}E${String(e).padStart(2, '0')}`;
}

function hueOf(title: string): number {
  let hash = 0;
  for (let i = 0; i < title.length; i += 1) {
    hash = (hash * 31 + title.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % 360;
}

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

const ContinueWatchingCard = memo(function ContinueWatchingCard({
  item,
  onPlay,
  onOpenSeries,
}: ContinueWatchingCardProps) {
  const { series, episode, progress } = item;
  const title = series.displayTitle ?? series.parsedTitle;
  const label = formatSeasonEpisode(episode.parsedSeason, episode.parsedEpisodeNumber);
  const pct =
    progress.durationSeconds > 0
      ? Math.min(100, Math.max(0, (progress.positionSeconds / progress.durationSeconds) * 100))
      : 0;
  const hue = hueOf(title);
  const initials = initialsOf(title);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onPlay(episode.id);
    },
    [onPlay, episode.id]
  );

  const handleTitleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onOpenSeries(series.id);
    },
    [onOpenSeries, series.id]
  );

  return (
    <div
      className={cn(
        'group relative shrink-0 w-[260px] rounded-lg overflow-hidden cursor-pointer',
        'bg-card/80 border border-border-glass',
        'transition-shadow duration-200',
        'hover:shadow-primary-glow focus-within:shadow-primary-glow'
      )}
      onClick={handleClick}
    >
      <div className="relative aspect-video overflow-hidden">
        {series.bannerPath ? (
          <img
            src={series.bannerPath}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, hsl(${hue}, 45%, 25%) 0%, hsl(${(hue + 50) % 360}, 35%, 15%) 100%)`,
            }}
          >
            <div className="w-12 h-12 rounded-full bg-background/25 backdrop-blur-sm flex items-center justify-center">
              <span className="text-base font-semibold text-foreground/90">{initials}</span>
            </div>
          </div>
        )}

        {/* Play overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-background/70 via-transparent to-background/30 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <div className="w-12 h-12 rounded-full bg-primary/95 text-primary-foreground flex items-center justify-center shadow-lg">
            <Play className="w-5 h-5 translate-x-0.5" fill="currentColor" />
          </div>
        </div>

        <div className="absolute top-2 left-2">
          <div className="rounded-md bg-background/80 backdrop-blur-sm px-2 py-0.5 text-[10px] font-semibold text-foreground border border-border/40">
            {label}
          </div>
        </div>

        {/* Progress on the thumbnail bottom only — avoids overlapping the title block below */}
        <div className="absolute bottom-0 inset-x-0 h-[3px] bg-background/40">
          <div
            className="h-full bg-primary"
            style={{ width: `${pct}%` }}
            aria-label={`${Math.round(pct)}% obejrzane`}
          />
        </div>
      </div>

      <div className="px-3 py-2">
        <button
          type="button"
          onClick={handleTitleClick}
          className="block w-full text-left text-xs font-medium text-foreground/90 truncate hover:text-primary transition-colors"
          title={title}
        >
          {title}
        </button>
        <p className="text-[10px] text-muted-foreground/70 truncate mt-0.5">
          {episode.parsedTitle || `Odcinek ${episode.parsedEpisodeNumber ?? '?'}`}
        </p>
      </div>
    </div>
  );
});

export { ContinueWatchingCard };
