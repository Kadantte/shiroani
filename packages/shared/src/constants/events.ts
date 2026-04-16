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

  GET_TRENDING: 'anime:get-trending',
  GET_POPULAR: 'anime:get-popular',
  GET_SEASONAL: 'anime:get-seasonal',
  GET_RANDOM: 'anime:get-random',
  GET_USER_PROFILE: 'anime:get-user-profile',

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
  GET_STATS: 'library:get-stats',
  ADD: 'library:add',
  UPDATE: 'library:update',
  REMOVE: 'library:remove',

  // Server -> Client (broadcasts)
  RESULT: 'library:result',
  UPDATED: 'library:updated',
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
// Diary Events
// ============================================
export const DiaryEvents = {
  // Client -> Server (requests)
  GET_ALL: 'diary:get-all',
  CREATE: 'diary:create',
  UPDATE: 'diary:update',
  REMOVE: 'diary:remove',

  // Server -> Client (broadcasts)
  RESULT: 'diary:result',
  UPDATED: 'diary:updated',
} as const;

// ============================================
// Import/Export Events
// ============================================
export const ImportExportEvents = {
  // Client -> Server (requests)
  EXPORT: 'data:export',
  IMPORT: 'data:import',

  // Server -> Client (broadcasts)
  IMPORT_PROGRESS: 'data:import-progress',
} as const;

// ============================================
// Feed Events
// ============================================
export const FeedEvents = {
  // Client -> Server (requests)
  GET_ITEMS: 'feed:get-items',
  GET_SOURCES: 'feed:get-sources',
  TOGGLE_SOURCE: 'feed:toggle-source',
  REFRESH: 'feed:refresh',

  // Server -> Client (broadcasts)
  ITEMS_RESULT: 'feed:items-result',
  SOURCES_RESULT: 'feed:sources-result',
  NEW_ITEMS: 'feed:new-items',
} as const;

// ============================================
// Local Library Events
// ============================================
export const LocalLibraryEvents = {
  // Client -> Server (requests)
  LIST_ROOTS: 'local-library:list-roots',
  ADD_ROOT: 'local-library:add-root',
  REMOVE_ROOT: 'local-library:remove-root',
  LIST_SERIES: 'local-library:list-series',

  // Server -> Client (broadcasts)
  ROOTS_RESULT: 'local-library:roots-result',
  SERIES_RESULT: 'local-library:series-result',
  ROOT_ADDED: 'local-library:root-added',
  ROOT_REMOVED: 'local-library:root-removed',
} as const;

// ============================================
// FFmpeg Installer Events
// ============================================
export const FfmpegEvents = {
  // Client -> Server (requests)
  STATUS: 'ffmpeg:status',
  INSTALL: 'ffmpeg:install',
  CANCEL: 'ffmpeg:cancel',
  UNINSTALL: 'ffmpeg:uninstall',
  SET_SYSTEM_PATHS: 'ffmpeg:set-system-paths',
  CLEAR_SYSTEM_PATHS: 'ffmpeg:clear-system-paths',

  // Server -> Client (broadcasts)
  STATUS_RESULT: 'ffmpeg:status-result',
  INSTALL_START: 'ffmpeg:install-start',
  INSTALL_PROGRESS: 'ffmpeg:install-progress',
  INSTALL_DONE: 'ffmpeg:install-done',
  INSTALL_FAILED: 'ffmpeg:install-failed',
  INSTALL_CANCELLED: 'ffmpeg:install-cancelled',
} as const;

// ============================================
// System Events
// ============================================
export const SystemEvents = {
  CONNECTED: 'system:connected',
  ERROR: 'system:error',
  THROTTLED: 'system:throttled',
} as const;
