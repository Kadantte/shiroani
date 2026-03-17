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
const MAX_RETRIES = 3;
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 28; // leave 2 req margin from AniList's 30/min

// Simple sliding window rate limiter
const requestTimestamps: number[] = [];

async function waitForRateLimit(): Promise<void> {
  const now = Date.now();
  // Remove timestamps older than the window
  while (requestTimestamps.length > 0 && requestTimestamps[0] < now - RATE_LIMIT_WINDOW_MS) {
    requestTimestamps.shift();
  }
  // If at limit, wait until the oldest request expires
  if (requestTimestamps.length >= RATE_LIMIT_MAX) {
    const waitMs = requestTimestamps[0] + RATE_LIMIT_WINDOW_MS - now + 100;
    await new Promise(resolve => setTimeout(resolve, waitMs));
  }
  requestTimestamps.push(Date.now());
}

interface AiringScheduleResponse {
  data: {
    Page: {
      pageInfo: { hasNextPage: boolean };
      airingSchedules: AiringAnime[];
    };
  };
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = MAX_RETRIES
): Promise<Response> {
  const response = await fetch(url, options);

  if (response.status === 429 && retries > 0) {
    // Respect Retry-After header, or default to exponential backoff
    const retryAfter = response.headers.get('Retry-After');
    const waitMs = retryAfter
      ? parseInt(retryAfter, 10) * 1000
      : (MAX_RETRIES - retries + 1) * 2000;

    await new Promise(resolve => setTimeout(resolve, waitMs));
    return fetchWithRetry(url, options, retries - 1);
  }

  return response;
}

/**
 * Fetch a full week of airing schedules starting from a Monday date.
 * Groups results by local date string (YYYY-MM-DD).
 * Handles 429 rate limits with automatic retry + backoff.
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
    const body = JSON.stringify({
      query: AIRING_SCHEDULE_QUERY,
      variables: {
        airingAt_greater: startTimestamp,
        airingAt_lesser: endTimestamp,
        page,
        perPage: PER_PAGE,
      },
    });

    await waitForRateLimit();
    const response = await fetchWithRetry(ANILIST_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('Zbyt wiele zapytań do AniList. Spróbuj za chwilę.');
      }
      throw new Error(`Błąd AniList API: ${response.status}`);
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
