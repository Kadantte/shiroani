/**
 * Settings Types - Shared types for settings storage
 */

/**
 * Theme - All available color themes
 * 21 dark themes + 20 light themes = 41 total
 */
export type Theme =
  // Dark themes (21)
  | 'dark'
  | 'ayu-dark'
  | 'ayu-mirage'
  | 'catppuccin'
  | 'dracula'
  | 'ember'
  | 'forest'
  | 'gray'
  | 'gruvbox'
  | 'matcha'
  | 'midnight'
  | 'monokai'
  | 'nord'
  | 'ocean'
  | 'onedark'
  | 'red'
  | 'retro'
  | 'solarized'
  | 'sunset'
  | 'synthwave'
  | 'tokyonight'
  // Light themes (20)
  | 'light'
  | 'ayu-light'
  | 'blossom'
  | 'bluloco'
  | 'cream'
  | 'feather'
  | 'github'
  | 'gruvboxlight'
  | 'lavender'
  | 'mint'
  | 'nordlight'
  | 'onelight'
  | 'paper'
  | 'peach'
  | 'rose'
  | 'sand'
  | 'sepia'
  | 'sky'
  | 'snow'
  | 'solarizedlight';

/**
 * App language
 */
export type AppLanguage = 'pl'; // Polish only for now

/**
 * Anime browser settings
 */
export interface AnimeSettings {
  adblockEnabled: boolean;
  defaultHomepage: string;
  userAgent: string;
}

/**
 * Dark themes list
 */
export const DARK_THEMES: Theme[] = [
  'dark',
  'ayu-dark',
  'ayu-mirage',
  'catppuccin',
  'dracula',
  'ember',
  'forest',
  'gray',
  'gruvbox',
  'matcha',
  'midnight',
  'monokai',
  'nord',
  'ocean',
  'onedark',
  'red',
  'retro',
  'solarized',
  'sunset',
  'synthwave',
  'tokyonight',
];

/**
 * Light themes list
 */
export const LIGHT_THEMES: Theme[] = [
  'light',
  'ayu-light',
  'blossom',
  'bluloco',
  'cream',
  'feather',
  'github',
  'gruvboxlight',
  'lavender',
  'mint',
  'nordlight',
  'onelight',
  'paper',
  'peach',
  'rose',
  'sand',
  'sepia',
  'sky',
  'snow',
  'solarizedlight',
];

/**
 * All themes list
 */
export const ALL_THEMES: Theme[] = [...DARK_THEMES, ...LIGHT_THEMES];
