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
  title: string;
  titleRomaji?: string;
  coverImage?: string;
  episode: number;
  airingAt: number; // unix timestamp
  genres: string[];
  averageScore?: number;
  format?: string;
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
