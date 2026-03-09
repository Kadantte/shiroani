/**
 * Settings Types - Shared types for settings storage
 */

/**
 * Theme - All available color themes
 * 24 dark themes + 15 light themes = 39 total
 */
export type Theme =
  // Dark themes (24)
  | 'dark'
  | 'akira'
  | 'attack-on-titan'
  | 'ayu-dark'
  | 'ayu-mirage'
  | 'catppuccin'
  | 'chainsaw-man'
  | 'cyberpunk-edgerunners'
  | 'demon-slayer'
  | 'dracula'
  | 'evangelion'
  | 'ghibli-sunset'
  | 'gruvbox'
  | 'jujutsu-kaisen'
  | 'matcha'
  | 'monokai'
  | 'nord'
  | 'ocean'
  | 'onedark'
  | 'retro'
  | 'solarized'
  | 'spy-family'
  | 'synthwave'
  | 'tokyonight'
  // Light themes (15)
  | 'light'
  | 'ayu-light'
  | 'bocchi'
  | 'dragon-ball'
  | 'ghibli-forest'
  | 'github'
  | 'gruvboxlight'
  | 'lavender'
  | 'mint'
  | 'nordlight'
  | 'one-piece'
  | 'sailor-moon'
  | 'sepia'
  | 'solarizedlight'
  | 'your-name';

/**
 * Dark themes list
 */
export const DARK_THEMES: Theme[] = [
  'dark',
  'akira',
  'attack-on-titan',
  'ayu-dark',
  'ayu-mirage',
  'catppuccin',
  'chainsaw-man',
  'cyberpunk-edgerunners',
  'demon-slayer',
  'dracula',
  'evangelion',
  'ghibli-sunset',
  'gruvbox',
  'jujutsu-kaisen',
  'matcha',
  'monokai',
  'nord',
  'ocean',
  'onedark',
  'retro',
  'solarized',
  'spy-family',
  'synthwave',
  'tokyonight',
];
