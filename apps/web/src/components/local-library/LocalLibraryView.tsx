import { useEffect } from 'react';
import { useLocalLibraryStore } from '@/stores/useLocalLibraryStore';
import { LibraryGridView } from './grid/LibraryGridView';
import { SeriesDetailView } from './detail/SeriesDetailView';
import { LocalPlayer } from './player/LocalPlayer';

/**
 * Top-level local library surface. Acts as a lightweight router: the actual
 * screen selection is driven by `useLocalLibraryStore` state (no react-router)
 * because the rest of the app navigates via `useAppStore.activeView`.
 *
 *   activeSeriesId == null && playingEpisodeId == null → Grid
 *   playingEpisodeId != null                           → Player
 *   otherwise                                          → Detail
 *
 * Escape unwinds one level at a time: player → detail → grid.
 */
export function LocalLibraryView() {
  const activeSeriesId = useLocalLibraryStore(s => s.activeSeriesId);
  const playingEpisodeId = useLocalLibraryStore(s => s.playingEpisodeId);
  const backToGrid = useLocalLibraryStore(s => s.backToGrid);
  const closePlayer = useLocalLibraryStore(s => s.closePlayer);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (playingEpisodeId !== null) {
        closePlayer();
        e.preventDefault();
      } else if (activeSeriesId !== null) {
        backToGrid();
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeSeriesId, playingEpisodeId, backToGrid, closePlayer]);

  if (playingEpisodeId !== null) {
    return <LocalPlayer episodeId={playingEpisodeId} />;
  }
  if (activeSeriesId !== null) {
    return <SeriesDetailView seriesId={activeSeriesId} />;
  }
  return <LibraryGridView />;
}
