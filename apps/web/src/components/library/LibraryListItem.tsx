import { cn } from '@/lib/utils';
import { CountdownBadge } from '@/components/library/CountdownBadge';
import { formatEpisodeProgress } from '@/lib/anime-utils';
import { STATUS_FILTER_OPTIONS } from '@/lib/constants';
import type { AnimeEntry } from '@shiroani/shared';

interface LibraryListItemProps {
  entry: AnimeEntry;
  nextAiring?: { episode: number; airingAt: number } | null;
  onClick: () => void;
}

export function LibraryListItem({ entry, nextAiring, onClick }: LibraryListItemProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 p-2.5 rounded-xl cursor-pointer',
        'hover:bg-accent/40 transition-all duration-150',
        'border border-transparent hover:border-border-glass',
        'group/list-item'
      )}
    >
      {entry.coverImage ? (
        <img
          src={entry.coverImage}
          alt={entry.title}
          className="w-10 h-14 rounded-lg object-cover shrink-0 border border-border-glass"
          loading="lazy"
        />
      ) : (
        <div className="w-10 h-14 rounded-lg bg-muted/50 shrink-0 border border-border-glass" />
      )}
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-medium truncate group-hover/list-item:text-primary transition-colors">
          {entry.title}
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          {formatEpisodeProgress(entry.currentEpisode, entry.episodes)} &middot;{' '}
          {STATUS_FILTER_OPTIONS.find(f => f.value === entry.status)?.label ?? entry.status}
        </p>
      </div>
      {nextAiring && (
        <div className="shrink-0">
          <CountdownBadge airingAt={nextAiring.airingAt} episode={nextAiring.episode} />
        </div>
      )}
      {entry.score != null && entry.score > 0 && (
        <span className="text-xs font-semibold text-primary/80 shrink-0 tabular-nums">
          {entry.score}/10
        </span>
      )}
    </div>
  );
}
