import { memo, useCallback, useState } from 'react';
import { Check, Film } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { formatScore } from '@/lib/anime-utils';
import { ANILIST_FORMAT_LABELS, ANILIST_STATUS_LABELS } from '@/lib/constants';
import type { DiscoverMedia } from '@/stores/useDiscoverStore';

interface DiscoverCardProps {
  media: DiscoverMedia;
  inLibrary?: boolean;
  onClick?: () => void;
}

function getTitle(title: DiscoverMedia['title']): string {
  return title.english || title.romaji || title.native || '?';
}

const DiscoverCard = memo(function DiscoverCard({ media, inLibrary, onClick }: DiscoverCardProps) {
  const [imgError, setImgError] = useState(false);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClick?.();
      }
    },
    [onClick]
  );

  const handleImageError = useCallback(() => setImgError(true), []);

  const coverUrl = media.coverImage.large || media.coverImage.extraLarge || media.coverImage.medium;
  const title = getTitle(media.title);
  const formatLabel = media.format ? (ANILIST_FORMAT_LABELS[media.format] ?? media.format) : null;
  const statusLabel = media.status ? (ANILIST_STATUS_LABELS[media.status] ?? media.status) : null;

  const episodeInfo = media.episodes ? `${media.episodes} odc.` : null;
  const subtitle = [episodeInfo, statusLabel].filter(Boolean).join(' \u00B7 ');

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
      onClick={onClick}
      onKeyDown={handleKeyDown}
    >
      <div className="relative aspect-[3/4] overflow-hidden">
        {coverUrl && !imgError ? (
          <img
            src={coverUrl}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
            onError={handleImageError}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-muted via-muted/80 to-muted/60 flex flex-col items-center justify-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-background/30 flex items-center justify-center">
              <Film className="w-5 h-5 text-muted-foreground/40" />
            </div>
            <span className="text-muted-foreground/50 text-2xs font-medium">Brak okładki</span>
          </div>
        )}

        {/* Format badge — top-left */}
        {formatLabel && (
          <div className="absolute top-2 left-2">
            <Badge
              variant="secondary"
              className="text-2xs bg-background/70 text-foreground/80 border-0 px-1.5 py-0"
            >
              {formatLabel}
            </Badge>
          </div>
        )}

        {/* Score badge — top-right */}
        {media.averageScore != null && media.averageScore > 0 && (
          <div className="absolute top-2 right-2">
            <Badge className="text-2xs bg-primary/90 border-0 px-1.5 py-0">
              {formatScore(media.averageScore)}
            </Badge>
          </div>
        )}

        {/* In-library indicator */}
        {inLibrary && (
          <div className="absolute bottom-12 right-2">
            <div className="w-5 h-5 rounded-full bg-status-success flex items-center justify-center">
              <Check className="w-3 h-3 text-white" />
            </div>
          </div>
        )}

        {/* Bottom gradient overlay with title */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/90 via-background/50 to-transparent p-3 pt-8">
          <h3 className="text-sm font-medium text-foreground truncate-2 leading-tight">{title}</h3>
          {subtitle && <p className="text-2xs text-foreground/60 mt-0.5 truncate">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
});

export { DiscoverCard };
