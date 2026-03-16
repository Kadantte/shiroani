import type { AiringAnime } from '@shiroani/shared';
import { toLocalDate } from '@shiroani/shared';

const ANILIST_URL = 'https://graphql.anilist.co';

const AIRING_SCHEDULE_QUERY = `
  query AiringSchedule($airingAt_greater: Int, $airingAt_lesser: Int, $page: Int, $perPage: Int) {
    Page(page: $page, perPage: $perPage) {
      pageInfo { hasNextPage }
      airingSchedules(airingAt_greater: $airingAt_greater, airingAt_lesser: $airingAt_lesser, sort: TIME) {
        id
        airingAt
        episode
        media {
          id
          title { romaji english native }
          coverImage { large medium }
          episodes
          status
          format
          genres
          averageScore
          popularity
        }
      }
    }
  }
`;

const MAX_PAGES = 5;
const PER_PAGE = 50;

interface AiringScheduleResponse {
  data: {
    Page: {
      pageInfo: { hasNextPage: boolean };
      airingSchedules: AiringAnime[];
    };
  };
}

/**
 * Fetch a full week of airing schedules starting from a Monday date.
 * Groups results by local date string (YYYY-MM-DD).
 */
export async function fetchWeeklySchedule(weekStart: Date): Promise<Record<string, AiringAnime[]>> {
  const startTimestamp = Math.floor(weekStart.getTime() / 1000);
  const endDate = new Date(weekStart);
  endDate.setDate(endDate.getDate() + 7);
  const endTimestamp = Math.floor(endDate.getTime() / 1000);

  // Pre-initialize empty arrays for all 7 days
  const grouped: Record<string, AiringAnime[]> = {};
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    grouped[toLocalDate(d)] = [];
  }

  let page = 1;
  let hasNextPage = true;

  while (hasNextPage && page <= MAX_PAGES) {
    const response = await fetch(ANILIST_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: AIRING_SCHEDULE_QUERY,
        variables: {
          airingAt_greater: startTimestamp,
          airingAt_lesser: endTimestamp,
          page,
          perPage: PER_PAGE,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`AniList API error: ${response.status}`);
    }

    const json: AiringScheduleResponse = await response.json();
    const { pageInfo, airingSchedules } = json.data.Page;

    for (const entry of airingSchedules) {
      const dateKey = toLocalDate(new Date(entry.airingAt * 1000));
      if (grouped[dateKey]) {
        grouped[dateKey].push(entry);
      }
    }

    hasNextPage = pageInfo.hasNextPage;
    page++;
  }

  return grouped;
}
