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

export interface NotificationSubscription {
  anilistId: number;
  title: string;
  titleRomaji?: string;
  coverImage?: string;
  subscribedAt: string;
  enabled: boolean;
  source: 'schedule' | 'library';
}

export interface NotificationSettings {
  enabled: boolean;
  /** How many minutes before airing to fire the notification (0 = at airing time) */
  leadTimeMinutes: number;
  quietHours: {
    enabled: boolean;
    start: string; // "HH:mm"
    end: string; // "HH:mm"
  };
  useSystemSound: boolean;
  subscriptions: NotificationSubscription[];
}

// ============================================
// Discord Rich Presence Settings
// ============================================

export type DiscordActivityType =
  | 'watching'
  | 'browsing'
  | 'library'
  | 'diary'
  | 'schedule'
  | 'settings'
  | 'idle';

export interface DiscordPresenceTemplate {
  details: string;
  state: string;
  showTimestamp: boolean;
  showLargeImage: boolean;
  showButton: boolean;
}

export type DiscordPresenceTemplates = Record<DiscordActivityType, DiscordPresenceTemplate>;

export interface DiscordRpcSettings {
  enabled: boolean;
  /** Whether to show specific anime titles or generic "Using ShiroAni" */
  showAnimeDetails: boolean;
  /** Whether to show elapsed time on the presence */
  showElapsedTime: boolean;
  /** Whether to use custom templates instead of defaults */
  useCustomTemplates: boolean;
  /** Per-activity custom templates */
  templates: DiscordPresenceTemplates;
}

// ============================================
// Quick Access Types
// ============================================

export interface QuickAccessSite {
  id: string;
  name: string;
  url: string;
  icon?: string;
  isPredefined?: boolean;
}

export interface FrequentSite {
  url: string;
  title: string;
  favicon?: string;
  visitCount: number;
  lastVisited: number;
}

export interface DiscordPresenceActivity {
  /** Current view/activity: browser, library, diary, schedule, settings */
  view: string;
  /** Optional anime title being viewed */
  animeTitle?: string;
  /** Optional anime cover image URL */
  animeCoverUrl?: string;
  /** Optional AniList anime ID for the button link */
  anilistId?: number;
  /** Total anime count in library (for library view) */
  libraryCount?: number;
  /** Episode number/info extracted from URL */
  episodeNumber?: string;
  /** Site hostname where anime is being watched */
  siteName?: string;
}
