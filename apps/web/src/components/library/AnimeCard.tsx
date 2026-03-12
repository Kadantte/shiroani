import { memo, useCallback } from 'react';
import { Play, Pencil, Trash2, Film } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { CountdownBadge } from '@/components/library/CountdownBadge';
import type { AnimeEntry } from '@shiroani/shared';
import { STATUS_CONFIG } from '@/lib/constants';

interface AnimeCardProps {
  entry: AnimeEntry;
  nextAiring?: { airingAt: number; episode: number } | null;
  onSelect: (entry: AnimeEntry) => void;
  onContinue?: (entry: AnimeEntry) => void;
  onRemove?: (entry: AnimeEntry) => void;
}

const AnimeCard = memo(function AnimeCard({
  entry,
  nextAiring,
  onSelect,
  onContinue,
  onRemove,
}: AnimeCardProps) {
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSelect(entry);
      }
    },
    [onSelect, entry]
  );

  const progressText = entry.episodes
    ? `Odc. ${entry.currentEpisode}/${entry.episodes}`
    : `Odc. ${entry.currentEpisode}`;

  const progressPercent = entry.episodes
    ? Math.round((entry.currentEpisode / entry.episodes) * 100)
    : 0;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${entry.title} — ${STATUS_CONFIG[entry.status].label}`}
      className={cn(
        'group relative rounded-lg overflow-hidden cursor-pointer',
        'bg-card/80 border border-border-glass',
        'transition-shadow duration-200',
        'hover:shadow-primary-glow focus-visible:shadow-primary-glow',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
      )}
      onClick={() => onSelect(entry)}
      onKeyDown={handleKeyDown}
    >
      {/* Cover image */}
      <div className="relative aspect-[3/4] overflow-hidden">
        {entry.coverImage ? (
          <img
            src={entry.coverImage}
            alt={entry.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-muted via-muted/80 to-muted/60 flex flex-col items-center justify-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-background/30 flex items-center justify-center">
              <Film className="w-5 h-5 text-muted-foreground/40" />
            </div>
            <span className="text-muted-foreground/50 text-2xs font-medium">Brak okładki</span>
          </div>
        )}

        {/* Status indicator */}
        <div className="absolute top-2 left-2">
          <div
            className={cn('w-2.5 h-2.5 rounded-full', STATUS_CONFIG[entry.status].color)}
            aria-label={STATUS_CONFIG[entry.status].label}
            role="img"
          />
        </div>

        {/* Episode progress badge */}
        <div className="absolute top-2 right-2">
          <Badge variant="secondary" className="text-2xs bg-background/70 text-foreground border-0">
            {progressText}
          </Badge>
        </div>

        {/* Score badge */}
        {entry.score != null && entry.score > 0 && (
          <div className="absolute bottom-12 right-2">
            <Badge className="text-2xs bg-primary/90 border-0">{entry.score}/10</Badge>
          </div>
        )}

        {/* Next episode countdown badge */}
        {nextAiring && (
          <div className="absolute bottom-12 left-2">
            <CountdownBadge airingAt={nextAiring.airingAt} episode={nextAiring.episode} />
          </div>
        )}

        {/* Bottom gradient overlay with title */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/90 via-background/50 to-transparent p-3 pt-8">
          <h3 className="text-sm font-medium text-foreground truncate-2 leading-tight">
            {entry.title}
          </h3>
          <p className="text-2xs text-foreground/60 mt-0.5">{STATUS_CONFIG[entry.status].label}</p>
        </div>

        {/* Progress bar at the very bottom */}
        {entry.episodes && entry.episodes > 0 && (
          <div className="absolute bottom-0 inset-x-0 h-1 bg-background/30">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}

        {/* Hover/focus overlay with action buttons */}
        <div
          className={cn(
            'absolute inset-0 bg-gradient-to-t from-background/60 via-background/30 to-background/10',
            'flex items-center justify-center gap-2.5',
            'transition-opacity duration-250',
            'opacity-0 pointer-events-none',
            'group-hover:opacity-100 group-hover:pointer-events-auto',
            'group-focus-within:opacity-100 group-focus-within:pointer-events-auto'
          )}
        >
          {onContinue && entry.resumeUrl && (
            <button
              onClick={e => {
                e.stopPropagation();
                onContinue(entry);
              }}
              aria-label="Kontynuuj"
              className={cn(
                'w-8 h-8 rounded-full bg-primary text-primary-foreground shadow-md',
                'flex items-center justify-center',
                'hover:bg-primary/90 active:scale-95',
                'transition-colors duration-150'
              )}
            >
              <Play className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={e => {
              e.stopPropagation();
              onSelect(entry);
            }}
            aria-label="Edytuj"
            className={cn(
              'w-8 h-8 rounded-full bg-accent text-accent-foreground shadow-md',
              'flex items-center justify-center',
              'hover:bg-accent/90 active:scale-95',
              'transition-colors duration-150'
            )}
          >
            <Pencil className="w-3 h-3" />
          </button>
          {onRemove && (
            <button
              onClick={e => {
                e.stopPropagation();
                onRemove(entry);
              }}
              aria-label="Usuń"
              className={cn(
                'w-8 h-8 rounded-full bg-destructive text-destructive-foreground shadow-md',
                'flex items-center justify-center',
                'hover:bg-destructive/90 active:scale-95',
                'transition-colors duration-150'
              )}
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

export { AnimeCard };
