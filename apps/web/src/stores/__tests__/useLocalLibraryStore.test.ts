import { describe, it, expect, beforeEach, vi } from 'vitest';
import type {
  LocalSeries,
  SeriesProgressSummary,
  LocalLibraryEpisodeProgressUpdatedPayload,
  LocalLibrarySeriesRemovedPayload,
} from '@shiroani/shared';
import { LocalLibraryEvents } from '@shiroani/shared';

// ---------------------------------------------------------------------------
// Socket mocks — created before the store imports anything.
// ---------------------------------------------------------------------------

const socketHandlers = new Map<string, (data: unknown) => void>();
const fakeSocket = {
  connected: true,
  recovered: false,
  on: vi.fn((event: string, handler: (data: unknown) => void) => {
    socketHandlers.set(event, handler);
  }),
  off: vi.fn((event: string, _handler: unknown) => {
    socketHandlers.delete(event);
  }),
  emit: vi.fn(),
};

vi.mock('@/lib/socket', () => ({
  getSocket: () => fakeSocket,
  connectSocket: vi.fn(async () => fakeSocket),
  emitWithErrorHandling: vi.fn(async () => ({})),
}));

vi.mock('@/lib/platform', () => ({
  IS_ELECTRON: false,
}));

// ---------------------------------------------------------------------------

import { useLocalLibraryStore, getFilteredSeries } from '../useLocalLibraryStore';

function makeSeries(overrides: Partial<LocalSeries> & Pick<LocalSeries, 'id'>): LocalSeries {
  return {
    rootId: 1,
    folderPath: `/lib/${overrides.id}`,
    parsedTitle: `Series ${overrides.id}`,
    displayTitle: null,
    anilistId: null,
    matchStatus: 'unmatched',
    matchConfidence: null,
    posterPath: null,
    bannerPath: null,
    synopsis: null,
    genres: null,
    season: null,
    year: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function freshStore() {
  useLocalLibraryStore.setState({
    roots: [],
    series: [],
    continueWatching: [],
    episodes: {},
    seriesProgress: {},
    episodeProgress: {},
    isAddingRoot: false,
    scanProgress: {},
    activeSeriesId: null,
    playingEpisodeId: null,
    filters: { search: '', rootIds: [], matchStatus: 'all', sort: 'recent' },
    error: null,
    isLoading: false,
    listenersInitialized: false,
  });
}

describe('useLocalLibraryStore - sub-navigation', () => {
  beforeEach(() => {
    freshStore();
  });

  it('openSeries sets activeSeriesId and leaves the player closed', () => {
    const { openSeries } = useLocalLibraryStore.getState();
    openSeries(42);
    const { activeSeriesId, playingEpisodeId } = useLocalLibraryStore.getState();
    expect(activeSeriesId).toBe(42);
    expect(playingEpisodeId).toBeNull();
  });

  it('backToGrid clears both activeSeriesId and playingEpisodeId', () => {
    useLocalLibraryStore.setState({ activeSeriesId: 10, playingEpisodeId: 99 });
    useLocalLibraryStore.getState().backToGrid();
    const { activeSeriesId, playingEpisodeId } = useLocalLibraryStore.getState();
    expect(activeSeriesId).toBeNull();
    expect(playingEpisodeId).toBeNull();
  });

  it('openPlayer keeps activeSeriesId intact so back lands on detail', () => {
    useLocalLibraryStore.setState({ activeSeriesId: 10 });
    useLocalLibraryStore.getState().openPlayer(200);
    expect(useLocalLibraryStore.getState().activeSeriesId).toBe(10);
    expect(useLocalLibraryStore.getState().playingEpisodeId).toBe(200);
  });

  it('closePlayer only clears playingEpisodeId', () => {
    useLocalLibraryStore.setState({ activeSeriesId: 10, playingEpisodeId: 200 });
    useLocalLibraryStore.getState().closePlayer();
    const { activeSeriesId, playingEpisodeId } = useLocalLibraryStore.getState();
    expect(activeSeriesId).toBe(10);
    expect(playingEpisodeId).toBeNull();
  });
});

describe('useLocalLibraryStore - filters', () => {
  beforeEach(() => {
    freshStore();
  });

  it('updateFilters merges the patch into existing filters', () => {
    useLocalLibraryStore.getState().updateFilters({ search: 'frieren' });
    expect(useLocalLibraryStore.getState().filters.search).toBe('frieren');
    expect(useLocalLibraryStore.getState().filters.sort).toBe('recent'); // untouched
  });

  it('resetFilters restores defaults', () => {
    useLocalLibraryStore.setState({
      filters: {
        search: 'something',
        rootIds: [1, 2],
        matchStatus: 'unmatched',
        sort: 'alphabetical',
      },
    });
    useLocalLibraryStore.getState().resetFilters();
    const { filters } = useLocalLibraryStore.getState();
    expect(filters.search).toBe('');
    expect(filters.rootIds).toEqual([]);
    expect(filters.matchStatus).toBe('all');
    expect(filters.sort).toBe('recent');
  });
});

describe('getFilteredSeries', () => {
  const allSeries: LocalSeries[] = [
    makeSeries({ id: 1, parsedTitle: 'Frieren', updatedAt: '2026-03-01T00:00:00Z' }),
    makeSeries({
      id: 2,
      parsedTitle: 'Bleach',
      matchStatus: 'auto',
      updatedAt: '2026-02-01T00:00:00Z',
    }),
    makeSeries({
      id: 3,
      parsedTitle: 'Another show',
      rootId: 2,
      updatedAt: '2026-04-01T00:00:00Z',
    }),
  ];

  it('filters by search (case-insensitive, partial title match)', () => {
    const result = getFilteredSeries({
      series: allSeries,
      filters: { search: 'fri', rootIds: [], matchStatus: 'all', sort: 'recent' },
      seriesProgress: {},
    });
    expect(result.map(s => s.id)).toEqual([1]);
  });

  it('filters by matchStatus = unmatched', () => {
    const result = getFilteredSeries({
      series: allSeries,
      filters: { search: '', rootIds: [], matchStatus: 'unmatched', sort: 'recent' },
      seriesProgress: {},
    });
    expect(result.map(s => s.id).sort()).toEqual([1, 3]);
  });

  it('filters by selected rootIds', () => {
    const result = getFilteredSeries({
      series: allSeries,
      filters: { search: '', rootIds: [2], matchStatus: 'all', sort: 'recent' },
      seriesProgress: {},
    });
    expect(result.map(s => s.id)).toEqual([3]);
  });

  it('sorts alphabetically', () => {
    const result = getFilteredSeries({
      series: allSeries,
      filters: { search: '', rootIds: [], matchStatus: 'all', sort: 'alphabetical' },
      seriesProgress: {},
    });
    expect(result.map(s => s.parsedTitle)).toEqual(['Another show', 'Bleach', 'Frieren']);
  });

  it('sorts by recently-watched using progress summaries', () => {
    const progress: Record<number, SeriesProgressSummary> = {
      1: {
        seriesId: 1,
        watchedCount: 1,
        totalCount: 5,
        lastWatchedAt: '2026-04-15T00:00:00Z',
        resumeEpisodeId: null,
        resumePositionSeconds: null,
        resumeDurationSeconds: null,
      },
      3: {
        seriesId: 3,
        watchedCount: 1,
        totalCount: 1,
        lastWatchedAt: '2026-04-10T00:00:00Z',
        resumeEpisodeId: null,
        resumePositionSeconds: null,
        resumeDurationSeconds: null,
      },
    };
    const result = getFilteredSeries({
      series: allSeries,
      filters: { search: '', rootIds: [], matchStatus: 'all', sort: 'recently-watched' },
      seriesProgress: progress,
    });
    expect(result.map(s => s.id)).toEqual([1, 3, 2]);
  });
});

describe('useLocalLibraryStore - socket listeners', () => {
  beforeEach(() => {
    freshStore();
    socketHandlers.clear();
    fakeSocket.on.mockClear();
    fakeSocket.off.mockClear();
    // Register listeners
    useLocalLibraryStore.getState().initListeners();
  });

  it('drops removed series from state on SERIES_REMOVED', () => {
    useLocalLibraryStore.setState({
      series: [makeSeries({ id: 1 }), makeSeries({ id: 2 }), makeSeries({ id: 3 })],
      activeSeriesId: 2,
    });

    const handler = socketHandlers.get(LocalLibraryEvents.SERIES_REMOVED);
    expect(handler).toBeDefined();

    const payload: LocalLibrarySeriesRemovedPayload = {
      rootId: 1,
      seriesIds: [2, 3],
    };
    handler!(payload);

    const { series, activeSeriesId } = useLocalLibraryStore.getState();
    expect(series.map(s => s.id)).toEqual([1]);
    // The detail view was open on a now-removed series — kick back to grid.
    expect(activeSeriesId).toBeNull();
  });

  it('updates episodeProgress cache on EPISODE_PROGRESS_UPDATED', () => {
    const handler = socketHandlers.get(LocalLibraryEvents.EPISODE_PROGRESS_UPDATED);
    expect(handler).toBeDefined();

    const payload: LocalLibraryEpisodeProgressUpdatedPayload = {
      episodeId: 7,
      seriesId: 1,
      progress: {
        episodeId: 7,
        positionSeconds: 300,
        durationSeconds: 1400,
        completed: false,
        completedAt: null,
        watchCount: 0,
        updatedAt: '2026-04-17T12:00:00Z',
      },
    };
    handler!(payload);

    expect(useLocalLibraryStore.getState().episodeProgress[7]).toMatchObject({
      episodeId: 7,
      positionSeconds: 300,
      completed: false,
    });
  });

  it('ignores EPISODE_PROGRESS_UPDATED with no progress payload', () => {
    const handler = socketHandlers.get(LocalLibraryEvents.EPISODE_PROGRESS_UPDATED);
    handler!({ episodeId: 7, seriesId: 1 });
    expect(useLocalLibraryStore.getState().episodeProgress).toEqual({});
  });
});
