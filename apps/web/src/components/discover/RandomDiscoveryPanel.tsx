import { memo, useCallback } from 'react';
import { Sparkles, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/EmptyState';
import { useDiscoverStore, type DiscoverMedia } from '@/stores/useDiscoverStore';
import { RandomFiltersPanel } from './random/RandomFiltersPanel';
import { RandomShowcaseCard } from './random/RandomShowcaseCard';
import { RandomPeekChip } from './random/RandomPeekChip';
import { RandomSkeleton } from './random/RandomSkeleton';
import { useRandomCarousel } from './random/useRandomCarousel';
import { buildShowcaseMeta } from './random/random-utils';

interface RandomDiscoveryPanelProps {
  libraryIds: Set<number>;
  onCardClick: (media: DiscoverMedia) => void;
  onError: () => void;
}

export const RandomDiscoveryPanel = memo(function RandomDiscoveryPanel({
  libraryIds,
  onCardClick,
  onError,
}: RandomDiscoveryPanelProps) {
  const pool = useDiscoverStore(s => s.randomShuffled);
  const included = useDiscoverStore(s => s.randomIncludedGenres);
  const excluded = useDiscoverStore(s => s.randomExcludedGenres);
  const isLoading = useDiscoverStore(s => s.isRandomLoading);
  const error = useDiscoverStore(s => s.error);

  const { index, current, peekPrev, peekNext, prev, next } = useRandomCarousel(pool);

  const handleRefetch = useCallback(() => {
    useDiscoverStore.getState().fetchRandomPool();
  }, []);

  const handleGenresChange = useCallback((inc: string[], exc: string[]) => {
    useDiscoverStore.getState().setRandomGenres(inc, exc);
  }, []);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
        <p className="text-sm text-center max-w-xs">{error}</p>
        <Button variant="outline" size="sm" onClick={onError} className="gap-2 text-xs">
          <RefreshCw className="w-3.5 h-3.5" />
          Spróbuj ponownie
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <RandomFiltersPanel
        included={included}
        excluded={excluded}
        disabled={isLoading}
        onChange={handleGenresChange}
      />

      {isLoading && pool.length === 0 ? (
        <RandomSkeleton />
      ) : pool.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="Brak losowań"
          subtitle="Wybierz inne gatunki lub spróbuj ponownie."
        />
      ) : current ? (
        <div className="relative">
          {/* Banner backdrop */}
          <div className="absolute inset-0 -z-10 overflow-hidden rounded-3xl">
            {(() => {
              const banner = buildShowcaseMeta(current).banner;
              return banner ? (
                <img
                  src={banner}
                  alt=""
                  aria-hidden
                  className="w-full h-full object-cover opacity-20 blur-xl scale-110"
                />
              ) : null;
            })()}
            <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/60 to-background/95" />
          </div>

          <div className="relative rounded-3xl border border-border-glass bg-card/40 backdrop-blur-sm overflow-hidden">
            <RandomShowcaseCard
              media={current}
              index={index}
              total={pool.length}
              inLibrary={libraryIds.has(current.id)}
              isLoading={isLoading}
              onPrev={prev}
              onNext={next}
              onRefetch={handleRefetch}
              onOpenDetails={() => onCardClick(current)}
            />

            {(peekPrev || peekNext) && (
              <div className="border-t border-border-glass/60 bg-background/20 flex items-center justify-between gap-3 px-4 py-3">
                {peekPrev ? (
                  <RandomPeekChip
                    media={peekPrev}
                    direction="prev"
                    onClick={prev}
                    inLibrary={libraryIds.has(peekPrev.id)}
                  />
                ) : (
                  <div />
                )}
                {peekNext ? (
                  <RandomPeekChip
                    media={peekNext}
                    direction="next"
                    onClick={next}
                    inLibrary={libraryIds.has(peekNext.id)}
                  />
                ) : (
                  <div />
                )}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
});
