import { ArrowLeft, PlayCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocalLibraryStore } from '@/stores/useLocalLibraryStore';

interface PlayerPlaceholderProps {
  episodeId: number;
}

/**
 * Phase 4 will replace this file with the real video surface. For now it
 * owns the same back-button plumbing the real player will use, so the
 * Escape-closes-player flow already works end-to-end.
 */
export function PlayerPlaceholder({ episodeId }: PlayerPlaceholderProps) {
  const closePlayer = useLocalLibraryStore(s => s.closePlayer);
  const episode = useLocalLibraryStore(s =>
    Object.values(s.episodes)
      .flat()
      .find(e => e.id === episodeId)
  );
  const continueWatchingItem = useLocalLibraryStore(s =>
    s.continueWatching.find(item => item.episode.id === episodeId)
  );
  const series = useLocalLibraryStore(s =>
    continueWatchingItem
      ? continueWatchingItem.series
      : s.series.find(x => episode && x.id === episode.seriesId)
  );

  const title = series?.displayTitle ?? series?.parsedTitle ?? 'Odcinek';
  const epLabel = episode
    ? `S${String(episode.parsedSeason ?? 1).padStart(2, '0')}E${String(episode.parsedEpisodeNumber ?? '?').padStart(2, '0')}`
    : '';

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background">
      <div className="shrink-0 px-5 py-3 border-b border-border/60 bg-card/20 backdrop-blur-sm">
        <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={closePlayer}>
          <ArrowLeft className="w-3.5 h-3.5" />
          Powrót do serii
        </Button>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center space-y-4 max-w-md">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
            <PlayCircle className="w-10 h-10 text-primary/60" strokeWidth={1.5} />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-foreground">
              Odtwarzacz pojawi się w fazie 4
            </h2>
            <p className="text-xs text-muted-foreground/70 leading-relaxed">
              {title} {epLabel && <span className="font-mono">• {epLabel}</span>}
            </p>
            <p className="text-xs text-muted-foreground/50 leading-relaxed pt-2">
              Nawigacja i kontrola postępu są już gotowe — w kolejnej fazie ten ekran pokaże
              rzeczywisty odtwarzacz wideo z kontrolą napisów i ścieżki dźwiękowej.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
