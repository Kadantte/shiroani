/**
 * Anime Types - Core types for anime tracking and browsing
 */

export type AnimeStatus = 'watching' | 'completed' | 'plan_to_watch' | 'on_hold' | 'dropped';

export interface AnimeEntry {
  id: number;
  anilistId?: number;
  title: string;
  titleRomaji?: string;
  titleNative?: string;
  coverImage?: string;
  episodes?: number;
  status: AnimeStatus;
  currentEpisode: number;
  score?: number;
  notes?: string;
  resumeUrl?: string;
  addedAt: string;
  updatedAt: string;
}

export interface AiringAnime {
  id: number;
  airingAt: number; // unix timestamp
  episode: number;
  media: {
    id: number;
    title: { romaji?: string; english?: string; native?: string };
    coverImage: { large?: string; medium?: string };
    episodes?: number;
    status: string;
    format?: string;
    genres: string[];
    averageScore?: number;
    popularity?: number;
  };
}

export interface BrowserTab {
  id: string;
  url: string;
  title: string;
  favicon?: string;
  isLoading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
}

// ============================================
// Library Payloads
// ============================================

export interface LibraryAddPayload {
  anilistId?: number;
  title: string;
  titleRomaji?: string;
  titleNative?: string;
  coverImage?: string;
  episodes?: number;
  status?: AnimeStatus;
  currentEpisode?: number;
  resumeUrl?: string;
}

export interface LibraryUpdatePayload {
  id: number;
  status?: AnimeStatus;
  currentEpisode?: number;
  score?: number;
  notes?: string;
  resumeUrl?: string;
}

export interface LibraryStatsResult {
  watching: number;
  completed: number;
  plan_to_watch: number;
  on_hold: number;
  dropped: number;
  total: number;
}

// ============================================
// AniList API Response Payloads (Gateway -> Client)
// ============================================

export interface AnimePageInfo {
  total: number;
  currentPage: number;
  lastPage: number;
  hasNextPage: boolean;
}

/** Media title as returned by AniList */
export interface AnimeTitle {
  romaji?: string;
  english?: string;
  native?: string;
}

/** Cover image URLs as returned by AniList */
export interface AnimeCoverImage {
  large?: string;
  medium?: string;
  extraLarge?: string;
}

/** A single anime item from AniList search/browse results */
export interface AnimeMediaItem {
  id: number;
  title: AnimeTitle;
  coverImage: AnimeCoverImage;
  bannerImage?: string;
  episodes?: number;
  status: string;
  season?: string;
  seasonYear?: number;
  format?: string;
  genres: string[];
  averageScore?: number;
  popularity?: number;
  description?: string;
  nextAiringEpisode?: { airingAt: number; episode: number; timeUntilAiring?: number };
  studios?: { nodes: Array<{ name: string }> };
  relations?: { edges: Array<{ relationType: string; node: AnimeMediaItemBasic }> };
  recommendations?: { nodes: Array<{ mediaRecommendation: AnimeMediaItemBasic }> };
  externalLinks?: Array<{ url: string; site: string }>;
  streamingEpisodes?: Array<{ title: string; thumbnail: string; url: string; site: string }>;
}

/** Minimal media reference (used in relations/recommendations) */
export interface AnimeMediaItemBasic {
  id: number;
  title: AnimeTitle;
  coverImage: AnimeCoverImage;
  format?: string;
  type?: string;
  averageScore?: number;
}

/** Response payload for anime:search */
export interface AnimeSearchResult {
  results: AnimeMediaItem[];
  pageInfo: AnimePageInfo;
  error?: string;
}

/** Response payload for anime:get-details */
export interface AnimeDetailsResult {
  anime: AnimeMediaItem | null;
  error?: string;
}

/** Response payload for anime:get-airing */
export interface AnimeAiringResult {
  airingSchedules: AiringAnime[];
  pageInfo: AnimePageInfo;
  error?: string;
}

/** Response payload for anime:get-trending and anime:get-popular */
export interface AnimeBrowseResult {
  results: AnimeMediaItem[];
  pageInfo: AnimePageInfo;
  error?: string;
}
