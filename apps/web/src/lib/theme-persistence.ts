/**
 * localStorage key for persisted theme.
 */
const THEME_STORAGE_KEY = 'shiroani-theme';

/** Matches valid CSS class names: starts with a letter, only alphanumeric/hyphens/underscores, max 100 chars. */
const VALID_THEME_ID = /^[a-zA-Z][a-zA-Z0-9_-]{0,100}$/;

/**
 * Persist the current theme to localStorage for instant restoration on next startup.
 * Wrapped in try/catch because localStorage may be unavailable (e.g. incognito quota).
 */
export function persistTheme(theme: string): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // localStorage unavailable — silently ignore
  }
}

/**
 * Read the persisted theme from localStorage.
 * Returns 'plum' (the default built-in theme) as a safe fallback if nothing
 * is stored or localStorage is unavailable.
 */
export function getPersistedTheme(): string {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return stored && VALID_THEME_ID.test(stored) ? stored : 'plum';
  } catch {
    return 'plum';
  }
}
