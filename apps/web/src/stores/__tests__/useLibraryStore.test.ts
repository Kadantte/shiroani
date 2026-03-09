import { describe, it, expect } from 'vitest';
import { getFilteredEntries } from '../useLibraryStore';
import type { AnimeEntry, AnimeStatus } from '@shiroani/shared';

function makeEntry(overrides: Partial<AnimeEntry> & { id: number; title: string }): AnimeEntry {
  return {
    status: 'watching' as AnimeStatus,
    currentEpisode: 1,
    addedAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeState(overrides: Record<string, unknown> = {}) {
  return {
    entries: [] as AnimeEntry[],
    activeFilter: 'all' as AnimeStatus | 'all',
    searchQuery: '',
    sortBy: 'updatedAt' as const,
    sortOrder: 'desc' as const,
    viewMode: 'grid' as const,
    selectedEntry: null,
    isDetailOpen: false,
    // Stub all action methods
    isConnected: false,
    isLoading: false,
    listenersInitialized: false,
    error: null,
    fetchLibrary: () => {},
    addToLibrary: () => {},
    updateEntry: () => {},
    removeFromLibrary: () => {},
    setFilter: () => {},
    setSearchQuery: () => {},
    setViewMode: () => {},
    setSort: () => {},
    selectEntry: () => {},
    openDetail: () => {},
    closeDetail: () => {},
    setLoading: () => {},
    setError: () => {},
    initListeners: () => {},
    cleanupListeners: () => {},
    ...overrides,
  };
}

const entries: AnimeEntry[] = [
  makeEntry({
    id: 1,
    title: 'Attack on Titan',
    titleRomaji: 'Shingeki no Kyojin',
    status: 'completed',
    score: 9,
    currentEpisode: 75,
    updatedAt: '2024-03-01T00:00:00Z',
  }),
  makeEntry({
    id: 2,
    title: 'My Hero Academia',
    status: 'watching',
    score: 7,
    currentEpisode: 20,
    updatedAt: '2024-02-01T00:00:00Z',
  }),
  makeEntry({
    id: 3,
    title: 'One Piece',
    titleNative: 'ワンピース',
    status: 'watching',
    score: 10,
    currentEpisode: 1100,
    updatedAt: '2024-04-01T00:00:00Z',
  }),
  makeEntry({
    id: 4,
    title: 'Demon Slayer',
    status: 'plan_to_watch',
    score: undefined,
    currentEpisode: 0,
    updatedAt: '2024-01-15T00:00:00Z',
  }),
];

describe('getFilteredEntries', () => {
  it('returns all entries when filter is "all" and no search', () => {
    const state = makeState({ entries, activeFilter: 'all' });
    const result = getFilteredEntries(state as Parameters<typeof getFilteredEntries>[0]);
    expect(result).toHaveLength(4);
  });

  it('filters by status "watching"', () => {
    const state = makeState({ entries, activeFilter: 'watching' });
    const result = getFilteredEntries(state as Parameters<typeof getFilteredEntries>[0]);
    expect(result).toHaveLength(2);
    expect(result.every(e => e.status === 'watching')).toBe(true);
  });

  it('filters by status "completed"', () => {
    const state = makeState({ entries, activeFilter: 'completed' });
    const result = getFilteredEntries(state as Parameters<typeof getFilteredEntries>[0]);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Attack on Titan');
  });

  it('filters by status "plan_to_watch"', () => {
    const state = makeState({ entries, activeFilter: 'plan_to_watch' });
    const result = getFilteredEntries(state as Parameters<typeof getFilteredEntries>[0]);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Demon Slayer');
  });

  it('searches by title (case-insensitive)', () => {
    const state = makeState({ entries, searchQuery: 'one piece' });
    const result = getFilteredEntries(state as Parameters<typeof getFilteredEntries>[0]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(3);
  });

  it('searches by titleRomaji', () => {
    const state = makeState({ entries, searchQuery: 'shingeki' });
    const result = getFilteredEntries(state as Parameters<typeof getFilteredEntries>[0]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
  });

  it('searches by titleNative', () => {
    const state = makeState({ entries, searchQuery: 'ワンピース' });
    const result = getFilteredEntries(state as Parameters<typeof getFilteredEntries>[0]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(3);
  });

  it('returns empty when search has no matches', () => {
    const state = makeState({ entries, searchQuery: 'nonexistent' });
    const result = getFilteredEntries(state as Parameters<typeof getFilteredEntries>[0]);
    expect(result).toHaveLength(0);
  });

  it('sorts by title ascending', () => {
    const state = makeState({ entries, sortBy: 'title', sortOrder: 'asc' });
    const result = getFilteredEntries(state as Parameters<typeof getFilteredEntries>[0]);
    expect(result[0].title).toBe('Attack on Titan');
    expect(result[3].title).toBe('One Piece');
  });

  it('sorts by score descending', () => {
    const state = makeState({ entries, sortBy: 'score', sortOrder: 'desc' });
    const result = getFilteredEntries(state as Parameters<typeof getFilteredEntries>[0]);
    expect(result[0].score).toBe(10);
    expect(result[1].score).toBe(9);
  });

  it('sorts by progress ascending', () => {
    const state = makeState({ entries, sortBy: 'progress', sortOrder: 'asc' });
    const result = getFilteredEntries(state as Parameters<typeof getFilteredEntries>[0]);
    expect(result[0].currentEpisode).toBe(0);
    expect(result[3].currentEpisode).toBe(1100);
  });

  it('sorts by updatedAt descending (default)', () => {
    const state = makeState({ entries, sortBy: 'updatedAt', sortOrder: 'desc' });
    const result = getFilteredEntries(state as Parameters<typeof getFilteredEntries>[0]);
    expect(result[0].id).toBe(3); // Apr
    expect(result[3].id).toBe(4); // Jan 15
  });

  it('combines filter + search + sort', () => {
    const state = makeState({
      entries,
      activeFilter: 'watching',
      searchQuery: 'my',
      sortBy: 'title',
      sortOrder: 'asc',
    });
    const result = getFilteredEntries(state as Parameters<typeof getFilteredEntries>[0]);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('My Hero Academia');
  });

  it('returns empty for an empty library', () => {
    const state = makeState({ entries: [] });
    const result = getFilteredEntries(state as Parameters<typeof getFilteredEntries>[0]);
    expect(result).toHaveLength(0);
  });

  it('ignores whitespace-only search query', () => {
    const state = makeState({ entries, searchQuery: '   ' });
    const result = getFilteredEntries(state as Parameters<typeof getFilteredEntries>[0]);
    expect(result).toHaveLength(4);
  });
});
