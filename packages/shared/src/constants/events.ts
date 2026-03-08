/**
 * WebSocket Socket.io Event Constants
 *
 * Single source of truth for all socket event names used between
 * the frontend (apps/web) and backend (apps/desktop).
 *
 * Naming convention: 'domain:action' (colon separator)
 */

// ============================================
// Anime Events
// ============================================
export const AnimeEvents = {
  // Client -> Server (requests)
  SEARCH: 'anime:search',
  GET_DETAILS: 'anime:get-details',
  GET_AIRING: 'anime:get-airing',

  // Server -> Client (broadcasts)
  SEARCH_RESULT: 'anime:search-result',
  DETAILS_RESULT: 'anime:details-result',
  AIRING_RESULT: 'anime:airing-result',
} as const;

// ============================================
// Library Events
// ============================================
export const LibraryEvents = {
  // Client -> Server (requests)
  GET_ALL: 'library:get-all',
  ADD: 'library:add',
  UPDATE: 'library:update',
  REMOVE: 'library:remove',

  // Server -> Client (broadcasts)
  RESULT: 'library:result',
  UPDATED: 'library:updated',
} as const;

// ============================================
// Browser Events
// ============================================
export const BrowserEvents = {
  // Client -> Server (requests)
  OPEN_TAB: 'browser:open-tab',
  CLOSE_TAB: 'browser:close-tab',
  NAVIGATE: 'browser:navigate',
  GO_BACK: 'browser:go-back',
  GO_FORWARD: 'browser:go-forward',
  REFRESH: 'browser:refresh',

  // Server -> Client (broadcasts)
  TAB_UPDATED: 'browser:tab-updated',
  TAB_CLOSED: 'browser:tab-closed',
  NAVIGATION_STATE: 'browser:navigation-state',
} as const;

// ============================================
// Schedule Events
// ============================================
export const ScheduleEvents = {
  // Client -> Server (requests)
  GET_DAILY: 'schedule:get-daily',
  GET_WEEKLY: 'schedule:get-weekly',

  // Server -> Client (broadcasts)
  DAILY_RESULT: 'schedule:daily-result',
  WEEKLY_RESULT: 'schedule:weekly-result',
} as const;

// ============================================
// System Events
// ============================================
export const SystemEvents = {
  CONNECTED: 'system:connected',
  ERROR: 'system:error',
  THROTTLED: 'system:throttled',
} as const;

// ============================================
// Updater Events
// ============================================
export const UpdaterEvents = {
  // Client -> Server (requests)
  CHECK: 'updater:check',
  DOWNLOAD: 'updater:download',
  INSTALL: 'updater:install',

  // Server -> Client (broadcasts)
  STATUS: 'updater:status',
  PROGRESS: 'updater:progress',
  ERROR: 'updater:error',
} as const;
