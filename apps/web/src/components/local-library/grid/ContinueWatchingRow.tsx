import { useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ContinueWatchingItem } from '@shiroani/shared';
import { ContinueWatchingCard } from './ContinueWatchingCard';

interface ContinueWatchingRowProps {
  items: ContinueWatchingItem[];
  onPlay: (episodeId: number) => void;
  onOpenSeries: (seriesId: number) => void;
}

/**
 * Horizontal scroller of "Continue watching" cards. Uses native horizontal
 * overflow + snap scroll — plenty fast for the ~20 item cap and avoids the
 * complexity of a carousel lib.
 */
export function ContinueWatchingRow({ items, onPlay, onOpenSeries }: ContinueWatchingRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollBy = useCallback((delta: number) => {
    scrollRef.current?.scrollBy({ left: delta, behavior: 'smooth' });
  }, []);

  if (items.length === 0) return null;

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between px-5">
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-primary/70" />
          <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground/80">
            Kontynuuj oglądanie
          </h2>
          <span className="text-[10px] text-muted-foreground/50">({items.length})</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground/60 hover:text-foreground"
            onClick={() => scrollBy(-300)}
            aria-label="Przewiń w lewo"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground/60 hover:text-foreground"
            onClick={() => scrollBy(300)}
            aria-label="Przewiń w prawo"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto px-5 pb-2 snap-x snap-mandatory scroll-smooth"
        style={{ scrollbarWidth: 'thin' }}
      >
        {items.map(item => (
          <div key={item.episode.id} className="snap-start">
            <ContinueWatchingCard item={item} onPlay={onPlay} onOpenSeries={onOpenSeries} />
          </div>
        ))}
      </div>
    </section>
  );
}
