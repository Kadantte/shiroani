/**
 * Application Constants
 *
 * Centralized constants for the ShiroAni application.
 * Use these instead of hardcoding values throughout the codebase.
 */

// =============================================================================
// App Identity
// =============================================================================

/** Application name (display) */
export const APP_NAME = 'ShiroAni';

// =============================================================================
// Network
// =============================================================================

/** Localhost address */
export const LOCALHOST = '127.0.0.1';

/** Vite dev server port */
export const VITE_DEV_PORT = 15174;

// =============================================================================
// Links
// =============================================================================

/** GitHub repo owner */
const GITHUB_REPO_OWNER = 'Shironex';

/** GitHub repo name */
const GITHUB_REPO_NAME = 'shiroani';

/** GitHub releases page URL */
export const GITHUB_RELEASES_URL = `https://github.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/releases`;

/** Custom protocol URL for the new tab page */
export const NEW_TAB_URL = 'shiroani://newtab';

/** Check if a URL is the new tab page */
export const isNewTabUrl = (url: string) => url === NEW_TAB_URL;

// =============================================================================
// Logging
// =============================================================================

/** Log file prefix */
export const LOG_FILE_PREFIX = 'shiroani';

/** Maximum log file size before rotation (10MB) */
export const LOG_MAX_FILE_SIZE = 10 * 1024 * 1024;

/** Maximum age of log files before cleanup (7 days in ms) */
export const LOG_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/** Log flush interval in milliseconds */
export const LOG_FLUSH_INTERVAL_MS = 100;

/** Maximum buffered log entries before forced flush */
export const LOG_BUFFER_MAX_ENTRIES = 50;

/** Log cleanup interval (1 hour in ms) */
export const LOG_CLEANUP_INTERVAL_MS = 60 * 60 * 1000;
