import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { useLocalLibraryStore } from '@/stores/useLocalLibraryStore';
import type {
  LocalEpisode,
  LocalSeries,
  PlaybackProgress,
  SeriesProgressSummary,
} from '@shiroani/shared';

vi.mock('@/lib/socket', () => ({
  getSocket: () => ({
    connected: true,
    recovered: false,
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
  }),
  connectSocket: vi.fn(async () => undefined),
  emitWithErrorHandling: vi.fn(async () => ({})),
}));

vi.mock('@/lib/platform', () => ({ IS_ELECTRON: false }));

import { SeriesDetailView } from '@/components/local-library/detail/SeriesDetailView';

function makeSeries(): LocalSeries {
  return {
    id: 1,
    rootId: 1,
    folderPath: '/lib/frieren',
    parsedTitle: 'Frieren',
    displayTitle: "Frieren: Beyond Journey's End",
    anilistId: null,
    matchStatus: 'manual',
    matchConfidence: null,
    posterPath: null,
    bannerPath: null,
    synopsis: null,
    genres: null,
    season: null,
    year: 2023,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };
}

function makeEpisode(id: number, overrides: Partial<LocalEpisode> = {}): LocalEpisode {
  return {
    id,
    seriesId: 1,
    filePath: `/lib/frieren/${id}.mkv`,
    fileSize: 1024,
    fileHash: null,
    durationSeconds: 1400,
    width: null,
    height: null,
    videoCodec: null,
    audioTracks: null,
    subtitleTracks: null,
    parsedEpisodeNumber: id,
    parsedSeason: 1,
    parsedTitle: `Episode ${id}`,
    releaseGroup: null,
    kind: 'episode',
    mtime: '2026-01-01T00:00:00Z',
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('SeriesDetailView', () => {
  beforeEach(() => {
    useLocalLibraryStore.setState({
      roots: [],
      series: [makeSeries()],
      continueWatching: [],
      episodes: {
        1: [makeEpisode(1), makeEpisode(2), makeEpisode(3)],
      },
      seriesProgress: {
        1: {
          seriesId: 1,
          watchedCount: 1,
          totalCount: 3,
          lastWatchedAt: null,
          resumeEpisodeId: null,
          resumePositionSeconds: null,
          resumeDurationSeconds: null,
        } satisfies SeriesProgressSummary,
      },
      episodeProgress: {
        1: {
          episodeId: 1,
          positionSeconds: 1400,
          durationSeconds: 1400,
          completed: true,
          completedAt: '2026-04-15T00:00:00Z',
          watchCount: 1,
          updatedAt: '2026-04-15T00:00:00Z',
        } satisfies PlaybackProgress,
      },
      isAddingRoot: false,
      scanProgress: {},
      activeSeriesId: 1,
      playingEpisodeId: null,
      filters: { search: '', rootIds: [], matchStatus: 'all', sort: 'recent' },
      error: null,
      isLoading: false,
      listenersInitialized: false,
    });
  });

  it('renders the series title and hero', () => {
    render(<SeriesDetailView seriesId={1} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      "Frieren: Beyond Journey's End"
    );
  });

  it('renders the episode list with entries', () => {
    render(<SeriesDetailView seriesId={1} />);
    expect(screen.getAllByText(/Episode /).length).toBeGreaterThanOrEqual(3);
    expect(screen.getByText('S01E01')).toBeInTheDocument();
    expect(screen.getByText('S01E02')).toBeInTheDocument();
    expect(screen.getByText('S01E03')).toBeInTheDocument();
  });

  it('play button points at the first unwatched episode', () => {
    const openPlayer = vi.fn();
    useLocalLibraryStore.setState({ openPlayer });
    render(<SeriesDetailView seriesId={1} />);
    const playButton = screen.getByRole('button', { name: /Odtwórz S01E02/ });
    playButton.click();
    expect(openPlayer).toHaveBeenCalledWith(2);
  });

  it('falls back to "Series not found" empty state when seriesId is missing', () => {
    useLocalLibraryStore.setState({ series: [] });
    render(<SeriesDetailView seriesId={999} />);
    expect(screen.getByText('Nie znaleziono serii')).toBeInTheDocument();
  });
});
