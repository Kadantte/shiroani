import { useEffect, useMemo } from 'react';
import { FolderOpen } from 'lucide-react';
import { useLocalLibraryStore } from '@/stores/useLocalLibraryStore';
import { EmptyState } from '@/components/shared/EmptyState';
import type { LocalEpisode } from '@shiroani/shared';
import { SeriesHero } from './SeriesHero';
import { EpisodeList } from './EpisodeList';
import { ExtrasSection } from './ExtrasSection';

interface SeriesDetailViewProps {
  seriesId: number;
}

const MAIN_EPISODE_KINDS = new Set(['episode']);
const EXTRA_EPISODE_KINDS = new Set(['ova', 'movie', 'special', 'nced', 'nceed', 'extra']);

export function SeriesDetailView({ seriesId }: SeriesDetailViewProps) {
  const series = useLocalLibraryStore(s => s.series.find(x => x.id === seriesId));
  const episodes = useLocalLibraryStore(s => s.episodes[seriesId]);
  const summary = useLocalLibraryStore(s => s.seriesProgress[seriesId]);
  const episodeProgress = useLocalLibraryStore(s => s.episodeProgress);

  const refreshEpisodes = useLocalLibraryStore(s => s.refreshEpisodes);
  const refreshSeriesProgress = useLocalLibraryStore(s => s.refreshSeriesProgress);
  const backToGrid = useLocalLibraryStore(s => s.backToGrid);
  const openPlayer = useLocalLibraryStore(s => s.openPlayer);
  const markEpisodeWatched = useLocalLibraryStore(s => s.markEpisodeWatched);
  const markSeriesWatched = useLocalLibraryStore(s => s.markSeriesWatched);

  // Hydrate when the view mounts or the target series changes. The store
  // `openSeries` also kicks this off, but some code paths (e.g. the router
  // landing directly on a detail) might skip it.
  useEffect(() => {
    void refreshEpisodes(seriesId);
    void refreshSeriesProgress(seriesId);
  }, [seriesId, refreshEpisodes, refreshSeriesProgress]);

  const { mainEpisodes, extras } = useMemo(() => {
    const list = episodes ?? [];
    const main: LocalEpisode[] = [];
    const bonus: LocalEpisode[] = [];
    for (const ep of list) {
      if (MAIN_EPISODE_KINDS.has(ep.kind)) main.push(ep);
      else if (EXTRA_EPISODE_KINDS.has(ep.kind)) bonus.push(ep);
      else main.push(ep);
    }
    return { mainEpisodes: main, extras: bonus };
  }, [episodes]);

  const resumeEpisode = useMemo(() => {
    if (!summary?.resumeEpisodeId || !episodes) return null;
    return episodes.find(e => e.id === summary.resumeEpisodeId) ?? null;
  }, [summary?.resumeEpisodeId, episodes]);

  // "Primary" episode when no resume: first unwatched, else first overall.
  const primaryEpisode = useMemo(() => {
    if (mainEpisodes.length === 0) return null;
    const firstUnwatched = mainEpisodes.find(ep => !episodeProgress[ep.id]?.completed);
    return firstUnwatched ?? mainEpisodes[0];
  }, [mainEpisodes, episodeProgress]);

  const totalDurationSeconds = useMemo(() => {
    if (!episodes) return 0;
    return episodes.reduce((sum, ep) => sum + (ep.durationSeconds ?? 0), 0);
  }, [episodes]);

  if (!series) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <EmptyState
          icon={FolderOpen}
          title="Nie znaleziono serii"
          subtitle="Ta seria mogła zostać usunięta po ostatnim skanowaniu."
          action={{
            label: 'Wróć do biblioteki',
            onClick: backToGrid,
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <SeriesHero
        series={series}
        summary={summary}
        resumeEpisode={resumeEpisode}
        primaryEpisode={primaryEpisode}
        totalDurationSeconds={totalDurationSeconds}
        onBack={backToGrid}
        onPlay={openPlayer}
        onMarkAllWatched={() => void markSeriesWatched(seriesId, true)}
        onMarkAllUnwatched={() => void markSeriesWatched(seriesId, false)}
      />

      <div className="px-6 pt-8 pb-20 max-w-5xl mx-auto">
        {mainEpisodes.length === 0 && extras.length === 0 ? (
          <div className="rounded-lg border border-border/60 bg-card/30 px-4 py-10 text-center">
            <p className="text-sm text-muted-foreground/80">
              Brak odcinków. Wykonaj skanowanie ponownie, aby załadować pliki z folderu.
            </p>
          </div>
        ) : (
          <>
            <EpisodeList
              episodes={mainEpisodes}
              progressByEpisode={episodeProgress}
              onPlay={openPlayer}
              onToggleWatched={markEpisodeWatched}
            />
            <ExtrasSection
              extras={extras}
              progressByEpisode={episodeProgress}
              onPlay={openPlayer}
              onToggleWatched={markEpisodeWatched}
            />
          </>
        )}
      </div>
    </div>
  );
}
