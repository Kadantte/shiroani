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
  color?: string;
}

export interface AniListFuzzyDate {
  year?: number;
  month?: number;
  day?: number;
}

export interface AniListTrailer {
  id?: string;
  site?: string;
  thumbnail?: string;
}

export interface AniListTag {
  id: number;
  name: string;
  rank?: number;
  isGeneralSpoiler?: boolean;
  isMediaSpoiler?: boolean;
}

export interface AniListCharacter {
  id: number;
  name: { full?: string; userPreferred?: string };
  image: { medium?: string };
}

export interface AniListCharacterEdge {
  role: string;
  node: AniListCharacter;
}

export interface AniListStaffMember {
  id: number;
  name: { full?: string; userPreferred?: string };
  image: { medium?: string };
}

export interface AniListStaffEdge {
  role: string;
  node: AniListStaffMember;
}

export interface AniListStudioEdge {
  isMain: boolean;
  node: AniListStudio;
}

export interface AniListRanking {
  id: number;
  rank: number;
  type: string;
  format?: string;
  year?: number;
  season?: string;
  allTime?: boolean;
  context: string;
}

export interface AniListScoreDistribution {
  score: number;
  amount: number;
}

export interface AniListStatusDistribution {
  status: string;
  amount: number;
}

export interface AniListMediaStats {
  scoreDistribution?: AniListScoreDistribution[];
  statusDistribution?: AniListStatusDistribution[];
}

export interface AniListNextAiringEpisode {
  airingAt: number;
  episode: number;
  timeUntilAiring?: number;
}

export interface AniListStudio {
  id?: number;
  name: string;
  isAnimationStudio?: boolean;
}

export interface AniListExternalLink {
  url: string;
  site: string;
  type?: string;
  icon?: string;
  color?: string;
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
  status?: string;
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
  idMal?: number;
  title: AniListMediaTitle;
  coverImage: AniListCoverImage;
  bannerImage?: string;
  episodes?: number;
  duration?: number;
  status: string;
  season?: string;
  seasonYear?: number;
  format?: string;
  source?: string;
  genres: string[];
  averageScore?: number;
  meanScore?: number;
  popularity?: number;
  favourites?: number;
  isAdult?: boolean;
  siteUrl?: string;
  description?: string;
  startDate?: AniListFuzzyDate;
  endDate?: AniListFuzzyDate;
  trailer?: AniListTrailer;
  tags?: AniListTag[];
  nextAiringEpisode?: AniListNextAiringEpisode;
  studios?: { edges?: AniListStudioEdge[]; nodes?: AniListStudio[] };
  staff?: { edges: AniListStaffEdge[] };
  characters?: { edges: AniListCharacterEdge[] };
  relations?: { edges: AniListRelationEdge[] };
  recommendations?: { nodes: AniListRecommendationNode[] };
  externalLinks?: AniListExternalLink[];
  streamingEpisodes?: AniListStreamingEpisode[];
  rankings?: AniListRanking[];
  stats?: AniListMediaStats;
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

/** Shared shape for paginated media queries (search, trending, popular, etc.) */
export type PaginatedMediaResponse = {
  Page: {
    pageInfo: AniListPageInfo;
    media: AniListMedia[];
  };
};

export type SearchAnimeResponse = PaginatedMediaResponse;

export interface AnimeDetailsResponse {
  Media: AniListMedia;
}

export interface AiringScheduleResponse {
  Page: {
    pageInfo: AniListPageInfo;
    airingSchedules: AniListAiringSchedule[];
  };
}

export type TrendingAnimeResponse = PaginatedMediaResponse;

export type PopularThisSeasonResponse = PaginatedMediaResponse;

// ============================================
// Media Season
// ============================================

export type MediaSeason = 'WINTER' | 'SPRING' | 'SUMMER' | 'FALL';
