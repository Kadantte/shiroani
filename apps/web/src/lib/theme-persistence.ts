import { createLocalStorageAccessor } from '@/lib/persisted-storage';

/**
 * localStorage key for persisted theme.
 */
const THEME_STORAGE_KEY = 'shiroani-theme';

/** Matches valid CSS class names: starts with a letter, only alphanumeric/hyphens/underscores, max 100 chars. */
const VALID_THEME_ID = /^[a-zA-Z][a-zA-Z0-9_-]{0,100}$/;

const themeStorage = createLocalStorageAccessor<string>(THEME_STORAGE_KEY, {
  parse: raw => (VALID_THEME_ID.test(raw) ? raw : 'plum'),
  serialize: value => value,
  fallback: 'plum',
});

/**
 * Persist the current theme to localStorage for instant restoration on next startup.
 */
export function persistTheme(theme: string): void {
  themeStorage.set(theme);
}

/**
 * Read the persisted theme from localStorage.
 * Returns 'plum' (the default built-in theme) as a safe fallback if nothing
 * is stored or localStorage is unavailable.
 */
export function getPersistedTheme(): string {
  return themeStorage.get();
}
