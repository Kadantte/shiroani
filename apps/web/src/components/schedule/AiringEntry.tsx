import { memo } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { formatTime, getAnimeTitle, getCoverUrl } from './schedule-utils';
import { formatEpisodeProgress, formatScore } from '@/lib/anime-utils';
import { SubscribeBellButton } from './SubscribeBellButton';
import type { AiringAnime } from '@shiroani/shared';

export interface AiringEntryProps {
  anime: AiringAnime;
}

/** A single airing entry row used in the daily view */
const AiringEntry = memo(function AiringEntry({ anime }: AiringEntryProps) {
  const title = getAnimeTitle(anime.media);
  const coverUrl = getCoverUrl(anime.media);

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-2.5 rounded-lg',
        'bg-background/40 backdrop-blur-sm border border-border-glass',
        'hover:bg-background/60 hover:border-border-glass/80 transition-all duration-200',
        'group'
      )}
    >
      {/* Time */}
      <div className="shrink-0 w-12 text-center">
        <span className="text-xs tabular-nums tracking-tight font-medium text-primary">
          {formatTime(anime.airingAt)}
        </span>
      </div>

      {/* Cover thumbnail */}
      {coverUrl ? (
        <img
          src={coverUrl}
          alt={title}
          className="w-10 h-14 rounded-lg border border-border-glass object-cover shrink-0"
          loading="lazy"
        />
      ) : (
        <div className="w-10 h-14 rounded-lg border border-border-glass bg-muted shrink-0" />
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-medium truncate">{title}</h4>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-muted-foreground">
            {formatEpisodeProgress(anime.episode, anime.media.episodes)}
          </span>
          {anime.media.format && (
            <Badge variant="secondary" className="text-2xs py-0 h-4 rounded-full">
              {anime.media.format}
            </Badge>
          )}
        </div>
        {anime.media.genres.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {anime.media.genres.slice(0, 3).map(genre => (
              <span key={genre} className="text-2xs text-muted-foreground/70">
                {genre}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Score */}
      {anime.media.averageScore != null && (
        <span className="text-xs font-semibold text-primary/80 shrink-0 tabular-nums">
          {formatScore(anime.media.averageScore)}
        </span>
      )}

      {/* Bell subscription button */}
      <SubscribeBellButton anime={anime} className="shrink-0 w-7 h-7" tooltipSide="left" />
    </div>
  );
});

export { AiringEntry };
