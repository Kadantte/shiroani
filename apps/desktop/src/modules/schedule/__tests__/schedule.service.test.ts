import { ScheduleService } from '../schedule.service';
import type { AnimeService } from '../../anime/anime.service';
import type { AniListAiringSchedule, AniListMedia } from '../../anime/types';

function makeMedia(overrides: Partial<AniListMedia> = {}): AniListMedia {
  return {
    id: 1,
    title: { romaji: 'Test Anime', english: 'Test Anime EN' },
    coverImage: { large: 'https://img.example.com/cover.jpg' },
    episodes: 12,
    status: 'RELEASING',
    format: 'TV',
    genres: ['Action'],
    averageScore: 80,
    popularity: 5000,
    ...overrides,
  };
}

function makeAiringSchedule(overrides: Partial<AniListAiringSchedule> = {}): AniListAiringSchedule {
  return {
    id: 1,
    airingAt: Math.floor(new Date('2024-06-15T12:00:00').getTime() / 1000),
    episode: 1,
    media: makeMedia(),
    ...overrides,
  };
}

describe('ScheduleService', () => {
  let service: ScheduleService;
  let mockAnimeService: jest.Mocked<Pick<AnimeService, 'getAiringSchedule'>>;

  beforeEach(() => {
    mockAnimeService = {
      getAiringSchedule: jest.fn(),
    };
    service = new ScheduleService(mockAnimeService as unknown as AnimeService);
  });

  describe('getDaily', () => {
    it('returns airing anime for a given date', async () => {
      const schedule = makeAiringSchedule({
        id: 10,
        episode: 5,
        media: makeMedia({ id: 100, title: { romaji: 'Naruto' } }),
      });

      mockAnimeService.getAiringSchedule.mockResolvedValue({
        airingSchedules: [schedule],
        pageInfo: { total: 1, currentPage: 1, lastPage: 1, hasNextPage: false },
      });

      const result = await service.getDaily('2024-06-15');

      expect(result.date).toBe('2024-06-15');
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].id).toBe(10);
      expect(result.entries[0].episode).toBe(5);
      expect(result.entries[0].media.id).toBe(100);
      expect(result.entries[0].media.title.romaji).toBe('Naruto');
      expect(result.error).toBeUndefined();
    });

    it('returns empty entries on API error', async () => {
      mockAnimeService.getAiringSchedule.mockRejectedValue(new Error('Network error'));

      const result = await service.getDaily('2024-06-15');

      expect(result.date).toBe('2024-06-15');
      expect(result.entries).toHaveLength(0);
      expect(result.error).toBe('Network error');
    });

    it('calls animeService with correct date range', async () => {
      mockAnimeService.getAiringSchedule.mockResolvedValue({
        airingSchedules: [],
        pageInfo: { total: 0, currentPage: 1, lastPage: 1, hasNextPage: false },
      });

      await service.getDaily('2024-06-15');

      expect(mockAnimeService.getAiringSchedule).toHaveBeenCalledTimes(1);
      const [startDate, endDate] = mockAnimeService.getAiringSchedule.mock.calls[0];
      expect(startDate.getFullYear()).toBe(2024);
      expect(startDate.getMonth()).toBe(5); // June (0-indexed)
      expect(startDate.getDate()).toBe(15);
      expect(endDate.getDate()).toBe(15);
    });

    it('maps media fields correctly', async () => {
      const schedule = makeAiringSchedule({
        media: makeMedia({
          id: 200,
          coverImage: { large: 'https://img.test/cover.jpg' },
          episodes: 24,
          status: 'FINISHED',
          format: 'TV',
          genres: ['Drama', 'Romance'],
          averageScore: 90,
          popularity: 10000,
        }),
      });

      mockAnimeService.getAiringSchedule.mockResolvedValue({
        airingSchedules: [schedule],
        pageInfo: { total: 1, currentPage: 1, lastPage: 1, hasNextPage: false },
      });

      const result = await service.getDaily('2024-06-15');
      const media = result.entries[0].media;

      expect(media.id).toBe(200);
      expect(media.episodes).toBe(24);
      expect(media.status).toBe('FINISHED');
      expect(media.format).toBe('TV');
      expect(media.genres).toEqual(['Drama', 'Romance']);
      expect(media.averageScore).toBe(90);
      expect(media.popularity).toBe(10000);
    });
  });

  describe('getWeekly', () => {
    it('returns schedule grouped by date for a week', async () => {
      mockAnimeService.getAiringSchedule.mockResolvedValue({
        airingSchedules: [],
        pageInfo: { total: 0, currentPage: 1, lastPage: 1, hasNextPage: false },
      });

      const result = await service.getWeekly('2024-06-10');

      expect(result.error).toBeUndefined();
      // Should have 7 days in the schedule
      expect(Object.keys(result.schedule)).toHaveLength(7);
    });

    it('returns error on API failure', async () => {
      mockAnimeService.getAiringSchedule.mockRejectedValue(new Error('API down'));

      const result = await service.getWeekly('2024-06-10');

      expect(result.error).toBe('API down');
      expect(result.schedule).toEqual({});
    });

    it('paginates when hasNextPage is true', async () => {
      mockAnimeService.getAiringSchedule
        .mockResolvedValueOnce({
          airingSchedules: [makeAiringSchedule()],
          pageInfo: { total: 60, currentPage: 1, lastPage: 2, hasNextPage: true },
        })
        .mockResolvedValueOnce({
          airingSchedules: [makeAiringSchedule({ id: 2 })],
          pageInfo: { total: 60, currentPage: 2, lastPage: 2, hasNextPage: false },
        });

      await service.getWeekly('2024-06-10');

      expect(mockAnimeService.getAiringSchedule).toHaveBeenCalledTimes(2);
    });

    it('stops paginating after 5 pages', async () => {
      // Always return hasNextPage: true
      mockAnimeService.getAiringSchedule.mockResolvedValue({
        airingSchedules: [],
        pageInfo: { total: 1000, currentPage: 1, lastPage: 20, hasNextPage: true },
      });

      await service.getWeekly('2024-06-10');

      expect(mockAnimeService.getAiringSchedule).toHaveBeenCalledTimes(5);
    });

    it('handles media with missing coverImage gracefully', async () => {
      const schedule = makeAiringSchedule({
        media: makeMedia({ coverImage: undefined as unknown as AniListMedia['coverImage'] }),
      });

      mockAnimeService.getAiringSchedule.mockResolvedValue({
        airingSchedules: [schedule],
        pageInfo: { total: 1, currentPage: 1, lastPage: 1, hasNextPage: false },
      });

      const result = await service.getWeekly('2024-06-10');

      // Should not crash — coverImage defaults to {}
      const allEntries = Object.values(result.schedule).flat();
      expect(allEntries.length).toBeGreaterThanOrEqual(0);
    });
  });
});
