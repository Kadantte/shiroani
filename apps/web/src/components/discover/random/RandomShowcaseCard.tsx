import { memo, useEffect, useState } from 'react';
import {
  Shuffle,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Star,
  Tv,
  Calendar,
  Check,
  Film,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { TooltipButton } from '@/components/ui/tooltip-button';
import { Badge } from '@/components/ui/badge';
import { formatScore } from '@/lib/anime-utils';
import type { DiscoverMedia } from '@/stores/useDiscoverStore';
import { buildShowcaseMeta } from './random-utils';

interface RandomShowcaseCardProps {
  media: DiscoverMedia;
  index: number;
  total: number;
  inLibrary: boolean;
  isLoading: boolean;
  onPrev: () => void;
  onNext: () => void;
  onRefetch: () => void;
  onOpenDetails: () => void;
}

export const RandomShowcaseCard = memo(function RandomShowcaseCard({
  media,
  index,
  total,
  inLibrary,
  isLoading,
  onPrev,
  onNext,
  onRefetch,
  onOpenDetails,
}: RandomShowcaseCardProps) {
  const meta = buildShowcaseMeta(media);
  const showRomaji = media.title.romaji && media.title.romaji !== meta.title;

  // Track per-id image loading so we show a blurred LQIP + skeleton while the
  // large cover downloads after navigating to a new pick.
  const [imgLoaded, setImgLoaded] = useState(false);
  useEffect(() => {
    setImgLoaded(false);
  }, [media.id]);
  const lqip = media.coverImage.medium;

  return (
    <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6 p-5 md:p-6">
      {/* Poster column with mobile nav */}
      <div className="flex items-center justify-center gap-2 md:flex-col md:items-stretch">
        <button
          type="button"
          onClick={onPrev}
          aria-label="Poprzednie"
          className="md:hidden p-2 rounded-full bg-background/60 hover:bg-background/90 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div
          role="button"
          tabIndex={0}
          onClick={onOpenDetails}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onOpenDetails();
            }
          }}
          className={cn(
            'group relative aspect-[3/4] w-full max-w-[220px] mx-auto md:max-w-none',
            'rounded-2xl overflow-hidden cursor-pointer',
            'border border-border-glass shadow-lg',
            'transition-all duration-300',
            'hover:shadow-primary-glow hover:scale-[1.02]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
          )}
        >
          {meta.cover ? (
            <>
              {/* Low-res blurred preview — fills instantly while large cover loads */}
              {lqip && lqip !== meta.cover && (
                <img
                  src={lqip}
                  alt=""
                  aria-hidden
                  className={cn(
                    'absolute inset-0 w-full h-full object-cover scale-110 blur-md transition-opacity duration-300',
                    imgLoaded ? 'opacity-0' : 'opacity-100'
                  )}
                />
              )}
              {/* Skeleton shimmer when no LQIP available */}
              {(!lqip || lqip === meta.cover) && !imgLoaded && (
                <div className="absolute inset-0 bg-muted/40 animate-pulse" />
              )}
              <img
                key={media.id}
                src={meta.cover}
                alt={meta.title}
                onLoad={() => setImgLoaded(true)}
                onError={() => setImgLoaded(true)}
                className={cn(
                  'relative w-full h-full object-cover transition-all duration-500 group-hover:scale-105',
                  imgLoaded ? 'opacity-100' : 'opacity-0'
                )}
              />
            </>
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <Film className="w-8 h-8 text-muted-foreground/40" />
            </div>
          )}
          {inLibrary && (
            <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-status-success flex items-center justify-center shadow-md">
              <Check className="w-3.5 h-3.5 text-white" />
            </div>
          )}
          {media.averageScore != null && media.averageScore > 0 && (
            <div className="absolute bottom-2 left-2">
              <Badge className="text-2xs bg-primary/90 border-0 px-1.5 py-0 gap-1">
                <Star className="w-3 h-3 fill-current" />
                {formatScore(media.averageScore)}
              </Badge>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onNext}
          aria-label="Następne"
          className="md:hidden p-2 rounded-full bg-background/60 hover:bg-background/90 transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Info column */}
      <div className="flex flex-col min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-2xs font-medium text-primary/80 uppercase tracking-wider mb-1">
              Losowanie {index + 1} / {total}
            </p>
            <h2
              className="text-xl md:text-2xl font-bold leading-tight text-foreground line-clamp-2 cursor-pointer hover:text-primary transition-colors"
              onClick={onOpenDetails}
            >
              {meta.title}
            </h2>
            {showRomaji && (
              <p className="text-2xs text-muted-foreground/70 mt-0.5 truncate">
                {media.title.romaji}
              </p>
            )}
          </div>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={onPrev}
              aria-label="Poprzednie"
              className="p-1.5 rounded-lg bg-background/40 hover:bg-background/70 border border-border-glass transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onNext}
              aria-label="Następne"
              className="p-1.5 rounded-lg bg-background/40 hover:bg-background/70 border border-border-glass transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3 text-2xs text-muted-foreground">
          {meta.formatLabel && (
            <span className="inline-flex items-center gap-1">
              <Tv className="w-3 h-3" />
              {meta.formatLabel}
            </span>
          )}
          {media.episodes && <span>{media.episodes} odc.</span>}
          {meta.statusLabel && <span>{meta.statusLabel}</span>}
          {meta.yearLabel && (
            <span className="inline-flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {meta.yearLabel}
            </span>
          )}
        </div>

        {/* Genres */}
        {media.genres && media.genres.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {media.genres.slice(0, 6).map(g => (
              <Badge
                key={g}
                variant="secondary"
                className="text-2xs bg-primary/10 text-primary/90 border-0 px-1.5 py-0"
              >
                {g}
              </Badge>
            ))}
          </div>
        )}

        {/* Synopsis */}
        {meta.synopsis && (
          <p className="text-xs leading-relaxed text-foreground/75 mt-3 line-clamp-5">
            {meta.synopsis}
          </p>
        )}

        {/* Action row */}
        <div className="mt-auto pt-4 flex items-center gap-2">
          <Button size="sm" onClick={onNext} disabled={isLoading} className="gap-1.5 text-xs">
            <Shuffle className="w-3.5 h-3.5" />
            Wylosuj ponownie
          </Button>
          <TooltipButton
            size="sm"
            variant="outline"
            onClick={onRefetch}
            disabled={isLoading}
            tooltip="Odśwież propozycje z AniList"
            tooltipSide="top"
            className="px-2"
            aria-label="Odśwież propozycje"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', isLoading && 'animate-spin')} />
          </TooltipButton>
          <Button
            size="sm"
            variant="ghost"
            onClick={onOpenDetails}
            className="gap-1.5 text-xs ml-auto"
          >
            Szczegóły
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
        <p className="text-2xs text-muted-foreground/50 mt-2 hidden sm:block">← → aby przeglądać</p>
      </div>
    </div>
  );
});
