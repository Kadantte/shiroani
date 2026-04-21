/**
 * Settings Types - Shared types for settings storage
 */

/**
 * BuiltInTheme - All built-in color themes
 * 15 dark themes + 2 light themes = 17 total
 * Users can create unlimited custom themes via the theme editor.
 */
export type BuiltInTheme =
  // Dark themes (15)
  | 'plum'
  | 'noir'
  | 'matcha'
  | 'iced'
  | 'ember'
  | 'sakura'
  | 'midnight'
  | 'abyss'
  | 'crimson'
  | 'dusk'
  | 'cosmic'
  | 'void'
  | 'sunset'
  | 'shirogane'
  | 'onyx'
  // Light themes (2)
  | 'paper'
  | 'haiku';

/**
 * Theme - Either a built-in theme or a custom theme ID.
 * The `(string & {})` trick preserves autocomplete for built-in values
 * while allowing arbitrary custom theme IDs.
 */

export type Theme = BuiltInTheme | (string & {});

/**
 * Type guard to check if a theme string is a built-in theme
 */
export function isBuiltInTheme(theme: string): theme is BuiltInTheme {
  return BUILT_IN_THEMES.has(theme as BuiltInTheme);
}

/**
 * Custom theme definition for user-created themes
 */
export interface CustomThemeDefinition {
  /** Unique ID (e.g., 'custom-1678901234567') */
  id: string;
  /** Display name */
  name: string;
  /** Built-in theme used as the base */
  baseTheme: BuiltInTheme;
  /** Whether this is a dark theme */
  isDark: boolean;
  /** Primary/brand color (hex) */
  color: string;
  /** CSS variable overrides (variable name without -- prefix -> value) */
  variables: Record<string, string>;
  /** Creation timestamp */
  createdAt: number;
  /** Last update timestamp */
  updatedAt: number;
}

/**
 * Display metadata for a built-in theme. Shared by the desktop/web theme
 * picker, the landing palette preview, and anywhere else the app needs to
 * render a theme tile. Visual-only fields (icon components, CSS variables)
 * stay in their respective apps.
 */
export interface BuiltInThemeMeta {
  value: BuiltInTheme;
  label: string;
  /** Primary/brand color hex, matches `--primary` in the theme's stylesheet. */
  color: string;
  isDark: boolean;
}

/**
 * Single source of truth for built-in theme order and display colors.
 * Order drives the theme picker grid; Plum leads as the default.
 */
export const BUILT_IN_THEME_METADATA: readonly BuiltInThemeMeta[] = [
  { value: 'plum', label: 'Plum', color: '#d46cb1', isDark: true },
  { value: 'noir', label: 'Noir', color: '#d8d8d8', isDark: true },
  { value: 'matcha', label: 'Matcha', color: '#88c06a', isDark: true },
  { value: 'iced', label: 'Iced', color: '#7cc1d4', isDark: true },
  { value: 'ember', label: 'Ember', color: '#e08a3a', isDark: true },
  { value: 'sakura', label: 'Sakura', color: '#f19bc0', isDark: true },
  { value: 'midnight', label: 'Midnight', color: '#4e9dd8', isDark: true },
  { value: 'abyss', label: 'Abyss', color: '#5fc7bf', isDark: true },
  { value: 'crimson', label: 'Crimson', color: '#d2423a', isDark: true },
  { value: 'dusk', label: 'Dusk', color: '#d4a04a', isDark: true },
  { value: 'cosmic', label: 'Cosmic', color: '#b07cf4', isDark: true },
  { value: 'void', label: 'Void', color: '#9c3ff0', isDark: true },
  { value: 'sunset', label: 'Sunset', color: '#e4b042', isDark: true },
  { value: 'shirogane', label: 'Shirogane', color: '#cfc7c9', isDark: true },
  { value: 'onyx', label: 'Onyx', color: '#c98f3e', isDark: true },
  { value: 'paper', label: 'Paper', color: '#b0305b', isDark: false },
  { value: 'haiku', label: 'Haiku', color: '#3e8552', isDark: false },
];

/**
 * Dark themes list
 */
export const DARK_THEMES: BuiltInTheme[] = BUILT_IN_THEME_METADATA.filter(t => t.isDark).map(
  t => t.value
);

/**
 * Light themes list
 */
export const LIGHT_THEMES: BuiltInTheme[] = BUILT_IN_THEME_METADATA.filter(t => !t.isDark).map(
  t => t.value
);

/**
 * Set of all built-in theme names for fast lookup
 */
export const BUILT_IN_THEMES: ReadonlySet<BuiltInTheme> = new Set<BuiltInTheme>([
  ...DARK_THEMES,
  ...LIGHT_THEMES,
]);

/**
 * Default built-in theme (applied when no theme is persisted or the persisted
 * theme is unknown — e.g. users upgrading from the pre-redesign theme set).
 */
export const DEFAULT_BUILT_IN_THEME: BuiltInTheme = 'plum';

/**
 * Feed startup refresh preference stored in electron-store.
 * When enabled, the app may refresh RSS sources automatically during startup.
 */
export const FEED_STARTUP_REFRESH_SETTING_KEY = 'settings.feedRefreshOnStartup';

/** Default RSS startup refresh behavior */
export const DEFAULT_FEED_STARTUP_REFRESH = false;

/**
 * UI font scale preference stored in electron-store.
 * Used by the desktop renderer to improve readability on dense displays.
 */
export const UI_FONT_SCALE_SETTING_KEY = 'settings.uiFontScale';

/**
 * Local display name used in the newtab greeting and anywhere else the app
 * addresses the user directly. Falls back to the AniList profile name when
 * unset. Stored in electron-store.
 */
export const DISPLAY_NAME_SETTING_KEY = 'settings.displayName';

/** Maximum length accepted for the user's display name input. */
export const DISPLAY_NAME_MAX_LENGTH = 32;

/** Default UI font scale */
export const DEFAULT_UI_FONT_SCALE = 1;

/** Minimum UI font scale */
export const MIN_UI_FONT_SCALE = 0.95;

/** Maximum UI font scale */
export const MAX_UI_FONT_SCALE = 1.15;

/** Recommended preset values for UI font scaling */
export const UI_FONT_SCALE_PRESETS = [0.95, 1, 1.05, 1.1, 1.15] as const;
