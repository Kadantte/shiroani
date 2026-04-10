import { describe, it, expect } from 'vitest';
import { getFilteredDiaryEntries } from '../useDiaryStore';
import type { DiaryEntry } from '@shiroani/shared';
import type { DiarySortBy } from '../useDiaryStore';

const defaultSort = { sortBy: 'createdAt' as DiarySortBy, sortOrder: 'desc' as const };

function makeEntry(overrides: Partial<DiaryEntry> & { id: number; title: string }): DiaryEntry {
  return {
    contentJson: '{}',
    isPinned: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

const entries: DiaryEntry[] = [
  makeEntry({
    id: 1,
    title: 'Great Day',
    mood: 'great',
    tags: ['slice-of-life', 'fun'],
    isPinned: true,
    updatedAt: '2024-03-01T00:00:00Z',
  }),
  makeEntry({
    id: 2,
    title: 'Watched Naruto',
    animeId: 42,
    animeTitle: 'Naruto',
    tags: ['action'],
    updatedAt: '2024-02-01T00:00:00Z',
  }),
  makeEntry({
    id: 3,
    title: 'Random Thoughts',
    updatedAt: '2024-04-01T00:00:00Z',
  }),
  makeEntry({
    id: 4,
    title: 'One Piece Marathon',
    animeId: 99,
    animeTitle: 'One Piece',
    isPinned: true,
    tags: ['marathon'],
    updatedAt: '2024-01-15T00:00:00Z',
  }),
];

describe('getFilteredDiaryEntries', () => {
  it('returns all entries when filter is "all" and no search', () => {
    const result = getFilteredDiaryEntries({
      entries,
      activeFilter: 'all',
      searchQuery: '',
      ...defaultSort,
    });
    expect(result).toHaveLength(4);
  });

  it('sorts pinned entries first', () => {
    const result = getFilteredDiaryEntries({
      entries,
      activeFilter: 'all',
      searchQuery: '',
      ...defaultSort,
    });
    // Pinned entries should be first
    expect(result[0].isPinned).toBe(true);
    expect(result[1].isPinned).toBe(true);
  });

  it('sorts by updatedAt descending within pinned/unpinned groups', () => {
    const result = getFilteredDiaryEntries({
      entries,
      activeFilter: 'all',
      searchQuery: '',
      sortBy: 'updatedAt',
      sortOrder: 'desc',
    });
    // Pinned: id=1 (Mar) then id=4 (Jan 15)
    expect(result[0].id).toBe(1);
    expect(result[1].id).toBe(4);
    // Unpinned: id=3 (Apr) then id=2 (Feb)
    expect(result[2].id).toBe(3);
    expect(result[3].id).toBe(2);
  });

  it('filters by "pinned" to show only pinned entries', () => {
    const result = getFilteredDiaryEntries({
      entries,
      activeFilter: 'pinned',
      searchQuery: '',
      ...defaultSort,
    });
    expect(result).toHaveLength(2);
    expect(result.every(e => e.isPinned)).toBe(true);
  });

  it('filters by "with_anime" to show only entries linked to anime', () => {
    const result = getFilteredDiaryEntries({
      entries,
      activeFilter: 'with_anime',
      searchQuery: '',
      ...defaultSort,
    });
    expect(result).toHaveLength(2);
    expect(result.every(e => e.animeId != null)).toBe(true);
  });

  it('searches by title (case-insensitive)', () => {
    const result = getFilteredDiaryEntries({
      entries,
      activeFilter: 'all',
      searchQuery: 'great day',
      ...defaultSort,
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
  });

  it('searches by animeTitle', () => {
    const result = getFilteredDiaryEntries({
      entries,
      activeFilter: 'all',
      searchQuery: 'naruto',
      ...defaultSort,
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(2);
  });

  it('searches by tags', () => {
    const result = getFilteredDiaryEntries({
      entries,
      activeFilter: 'all',
      searchQuery: 'marathon',
      ...defaultSort,
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(4);
  });

  it('returns empty when search has no matches', () => {
    const result = getFilteredDiaryEntries({
      entries,
      activeFilter: 'all',
      searchQuery: 'nonexistent',
      ...defaultSort,
    });
    expect(result).toHaveLength(0);
  });

  it('ignores whitespace-only search query', () => {
    const result = getFilteredDiaryEntries({
      entries,
      activeFilter: 'all',
      searchQuery: '   ',
      ...defaultSort,
    });
    expect(result).toHaveLength(4);
  });

  it('combines filter and search', () => {
    const result = getFilteredDiaryEntries({
      entries,
      activeFilter: 'with_anime',
      searchQuery: 'one piece',
      ...defaultSort,
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(4);
  });

  it('returns empty for an empty entries list', () => {
    const result = getFilteredDiaryEntries({
      entries: [],
      activeFilter: 'all',
      searchQuery: '',
      ...defaultSort,
    });
    expect(result).toHaveLength(0);
  });

  it('handles entries without optional fields (tags, animeTitle)', () => {
    const result = getFilteredDiaryEntries({
      entries: [makeEntry({ id: 10, title: 'Plain Entry' })],
      activeFilter: 'all',
      searchQuery: 'plain',
      ...defaultSort,
    });
    expect(result).toHaveLength(1);
  });

  it('search does not crash when tags or animeTitle are undefined', () => {
    const result = getFilteredDiaryEntries({
      entries: [makeEntry({ id: 10, title: 'No Tags' })],
      activeFilter: 'all',
      searchQuery: 'something',
      ...defaultSort,
    });
    expect(result).toHaveLength(0);
  });
});
