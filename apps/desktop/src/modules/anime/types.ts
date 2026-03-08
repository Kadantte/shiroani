/**
 * AniList GraphQL API Response Types
 *
 * These types mirror the shape of AniList API responses
 * for use in the AnimeService and AniListClient.
 */

// ============================================
// Core Media Types
// ============================================

export interface AniListMediaTitle {
  romaji?: string;
  english?: string;
  native?: string;
}

export interface AniListCoverImage {
  large?: string;
  medium?: string;
  extraLarge?: string;
}

export interface AniListNextAiringEpisode {
  airingAt: number;
  episode: number;
  timeUntilAiring?: number;
}

export interface AniListStudio {
  name: string;
}

export interface AniListExternalLink {
  url: string;
  site: string;
}

export interface AniListStreamingEpisode {
  title: string;
  thumbnail: string;
  url: string;
  site: string;
}

/** Minimal media reference used in relations and recommendations */
export interface AniListMediaBasic {
  id: number;
  title: AniListMediaTitle;
  coverImage: AniListCoverImage;
  format?: string;
  type?: string;
  averageScore?: number;
}

export interface AniListRelationEdge {
  relationType: string;
  node: AniListMediaBasic;
}

export interface AniListRecommendationNode {
  mediaRecommendation: AniListMediaBasic;
}

/** Full media object returned by AniList */
export interface AniListMedia {
  id: number;
  title: AniListMediaTitle;
  coverImage: AniListCoverImage;
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
  nextAiringEpisode?: AniListNextAiringEpisode;
  studios?: { nodes: AniListStudio[] };
  relations?: { edges: AniListRelationEdge[] };
  recommendations?: { nodes: AniListRecommendationNode[] };
  externalLinks?: AniListExternalLink[];
  streamingEpisodes?: AniListStreamingEpisode[];
}

// ============================================
// Pagination
// ============================================

export interface AniListPageInfo {
  total: number;
  currentPage: number;
  lastPage: number;
  hasNextPage: boolean;
}

// ============================================
// Airing Schedule
// ============================================

export interface AniListAiringSchedule {
  id: number;
  airingAt: number;
  episode: number;
  media: AniListMedia;
}

// ============================================
// GraphQL Response Shapes
// ============================================

export interface SearchAnimeResponse {
  Page: {
    pageInfo: AniListPageInfo;
    media: AniListMedia[];
  };
}

export interface AnimeDetailsResponse {
  Media: AniListMedia;
}

export interface AiringScheduleResponse {
  Page: {
    pageInfo: AniListPageInfo;
    airingSchedules: AniListAiringSchedule[];
  };
}

export interface TrendingAnimeResponse {
  Page: {
    pageInfo: AniListPageInfo;
    media: AniListMedia[];
  };
}

export interface PopularThisSeasonResponse {
  Page: {
    pageInfo: AniListPageInfo;
    media: AniListMedia[];
  };
}

// ============================================
// Media Season
// ============================================

export type MediaSeason = 'WINTER' | 'SPRING' | 'SUMMER' | 'FALL';
