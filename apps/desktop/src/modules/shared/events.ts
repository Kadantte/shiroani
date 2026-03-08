/**
 * Internal EventEmitter2 Event Constants (Backend Only)
 *
 * These events are used for internal NestJS module communication.
 * They use dot-notation (e.g., 'anime.updated') and are NOT sent over WebSocket.
 *
 * For WebSocket socket.io events, see @shiroani/shared constants/events.ts
 */

// ============================================
// Anime Internal Events
// ============================================
export const InternalAnimeEvents = {
  /** Emitted when anime details are fetched/refreshed from AniList */
  UPDATED: 'anime.updated',
  /** Emitted when anime search results are received */
  SEARCH_COMPLETED: 'anime.search-completed',
} as const;

// ============================================
// Library Internal Events
// ============================================
export const InternalLibraryEvents = {
  /** Emitted when the user adds/removes/updates an anime in their library */
  CHANGED: 'library.changed',
  /** Emitted when library sync completes (e.g., AniList sync) */
  SYNCED: 'library.synced',
} as const;

// ============================================
// Schedule Internal Events
// ============================================
export const InternalScheduleEvents = {
  /** Emitted when the airing schedule is refreshed from AniList */
  REFRESHED: 'schedule.refreshed',
} as const;

// ============================================
// Browser Internal Events
// ============================================
export const InternalBrowserEvents = {
  /** Emitted when a browser tab navigates */
  NAVIGATED: 'browser.navigated',
  /** Emitted when a browser tab is created/destroyed */
  TAB_CHANGED: 'browser.tab-changed',
} as const;
