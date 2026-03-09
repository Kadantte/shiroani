import { useState } from 'react';
import { Play, Pencil, Trash2, Film } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import type { AnimeEntry } from '@shiroani/shared';
import { STATUS_CONFIG } from '@/lib/constants';

interface AnimeCardProps {
  entry: AnimeEntry;
  onSelect: (entry: AnimeEntry) => void;
  onContinue?: (entry: AnimeEntry) => void;
  onRemove?: (entry: AnimeEntry) => void;
}

export function AnimeCard({ entry, onSelect, onContinue, onRemove }: AnimeCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const progressText = entry.episodes
    ? `Odc. ${entry.currentEpisode}/${entry.episodes}`
    : `Odc. ${entry.currentEpisode}`;

  const progressPercent = entry.episodes
    ? Math.round((entry.currentEpisode / entry.episodes) * 100)
    : 0;

  return (
    <div
      className={cn(
        'group relative rounded-lg overflow-hidden cursor-pointer',
        'bg-card/80 backdrop-blur-sm border border-border-glass',
        'transition-all duration-200',
        'hover:shadow-primary-glow hover:scale-[1.02]'
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onSelect(entry)}
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
            <span className="text-muted-foreground/50 text-2xs font-medium">Brak okladki</span>
          </div>
        )}

        {/* Status indicator */}
        <div className="absolute top-2 left-2">
          <div className={cn('w-2.5 h-2.5 rounded-full', STATUS_CONFIG[entry.status].color)} />
        </div>

        {/* Episode progress badge */}
        <div className="absolute top-2 right-2">
          <Badge variant="secondary" className="text-2xs bg-black/70 text-white border-0">
            {progressText}
          </Badge>
        </div>

        {/* Score badge */}
        {entry.score != null && entry.score > 0 && (
          <div className="absolute bottom-12 right-2">
            <Badge className="text-2xs bg-primary/90 border-0">{entry.score}/10</Badge>
          </div>
        )}

        {/* Bottom gradient overlay with title */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 pt-8">
          <h3 className="text-sm font-medium text-white truncate-2 leading-tight">{entry.title}</h3>
          <p className="text-2xs text-white/60 mt-0.5">{STATUS_CONFIG[entry.status].label}</p>
        </div>

        {/* Progress bar at the very bottom */}
        {entry.episodes && entry.episodes > 0 && (
          <div className="absolute bottom-0 inset-x-0 h-1 bg-black/30">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}

        {/* Hover overlay with action buttons */}
        <div
          className={cn(
            'absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-black/10',
            'backdrop-blur-[2px] flex items-center justify-center gap-2.5',
            'transition-all duration-250',
            isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'
          )}
        >
          {onContinue && entry.resumeUrl && (
            <button
              onClick={e => {
                e.stopPropagation();
                onContinue(entry);
              }}
              className={cn(
                'w-8 h-8 rounded-full bg-primary text-primary-foreground shadow-md',
                'flex items-center justify-center',
                'hover:bg-primary/90 hover:scale-110 active:scale-95',
                'transition-all duration-150'
              )}
              title="Kontynuuj"
            >
              <Play className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={e => {
              e.stopPropagation();
              onSelect(entry);
            }}
            className={cn(
              'w-8 h-8 rounded-full bg-accent text-accent-foreground shadow-md',
              'flex items-center justify-center',
              'hover:bg-accent/90 hover:scale-110 active:scale-95',
              'transition-all duration-150'
            )}
            title="Edytuj"
          >
            <Pencil className="w-3 h-3" />
          </button>
          {onRemove && (
            <button
              onClick={e => {
                e.stopPropagation();
                onRemove(entry);
              }}
              className={cn(
                'w-8 h-8 rounded-full bg-destructive text-destructive-foreground shadow-md',
                'flex items-center justify-center',
                'hover:bg-destructive/90 hover:scale-110 active:scale-95',
                'transition-all duration-150'
              )}
              title="Usun"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
