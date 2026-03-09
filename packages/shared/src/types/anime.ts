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
  anilistId?: number | null;
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
// Notification Settings
// ============================================

export interface NotificationSettings {
  enabled: boolean;
  /** How many minutes before airing to fire the notification */
  leadTimeMinutes: number;
}
