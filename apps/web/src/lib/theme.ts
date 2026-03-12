import {
  type LucideIcon,
  Atom,
  Cat,
  Coffee,
  Eclipse,
  Flame,
  Ghost,
  Github,
  Leaf,
  Moon,
  Radio,
  Snowflake,
  Sparkles,
  Star,
  Sun,
  Sunrise,
  Skull,
  Swords,
  Terminal,
  TreePine,
  Trees,
  Waves,
  Wind,
  Zap,
  Anchor,
  Bomb,
  CircuitBoard,
  Feather,
  Guitar,
  Shield,
  Sparkle,
} from 'lucide-react';
import type { Theme, CustomThemeDefinition } from '@shiroani/shared';

export interface ThemeOption {
  value: Theme;
  label: string;
  Icon?: LucideIcon;
  testId: string;
  isDark: boolean;
  isAnime?: boolean; // true for anime-inspired themes
  isCustom?: boolean; // true for user-created custom themes
  color: string; // Primary/brand color for icon display
}

// All theme options with dark/light categorization (alphabetically sorted, Dark/Light first)
export const themeOptions: ReadonlyArray<ThemeOption> = [
  // Dark themes (24) - alphabetical, Dark first
  {
    value: 'dark',
    label: 'Dark',
    Icon: Moon,
    testId: 'dark-mode-button',
    isDark: true,
    color: '#6366f1',
  },
  {
    value: 'akira',
    label: 'Akira',
    Icon: Bomb,
    testId: 'akira-mode-button',
    isDark: true,
    isAnime: true,
    color: '#ef4444',
  },
  {
    value: 'attack-on-titan',
    label: 'Attack on Titan',
    Icon: Shield,
    testId: 'attack-on-titan-mode-button',
    isDark: true,
    isAnime: true,
    color: '#5f8ca0',
  },
  {
    value: 'ayu-dark',
    label: 'Ayu Dark',
    Icon: Moon,
    testId: 'ayu-dark-mode-button',
    isDark: true,
    color: '#E6B450',
  },
  {
    value: 'ayu-mirage',
    label: 'Ayu Mirage',
    Icon: Sparkles,
    testId: 'ayu-mirage-mode-button',
    isDark: true,
    color: '#FFCC66',
  },
  {
    value: 'catppuccin',
    label: 'Catppuccin',
    Icon: Cat,
    testId: 'catppuccin-mode-button',
    isDark: true,
    color: '#cba6f7',
  },
  {
    value: 'chainsaw-man',
    label: 'Chainsaw Man',
    Icon: Skull,
    testId: 'chainsaw-man-mode-button',
    isDark: true,
    isAnime: true,
    color: '#dc2626',
  },
  {
    value: 'cyberpunk-edgerunners',
    label: 'Cyberpunk Edgerunners',
    Icon: CircuitBoard,
    testId: 'cyberpunk-edgerunners-mode-button',
    isDark: true,
    isAnime: true,
    color: '#ec4899',
  },
  {
    value: 'demon-slayer',
    label: 'Demon Slayer',
    Icon: Swords,
    testId: 'demon-slayer-mode-button',
    isDark: true,
    isAnime: true,
    color: '#14b8a6',
  },
  {
    value: 'dracula',
    label: 'Dracula',
    Icon: Ghost,
    testId: 'dracula-mode-button',
    isDark: true,
    color: '#bd93f9',
  },
  {
    value: 'evangelion',
    label: 'Evangelion',
    Icon: Zap,
    testId: 'evangelion-mode-button',
    isDark: true,
    isAnime: true,
    color: '#22c55e',
  },
  {
    value: 'ghibli-sunset',
    label: 'Ghibli Sunset',
    Icon: Sunrise,
    testId: 'ghibli-sunset-mode-button',
    isDark: true,
    isAnime: true,
    color: '#eab308',
  },
  {
    value: 'gruvbox',
    label: 'Gruvbox',
    Icon: Trees,
    testId: 'gruvbox-mode-button',
    isDark: true,
    color: '#fe8019',
  },
  {
    value: 'jujutsu-kaisen',
    label: 'Jujutsu Kaisen',
    Icon: Sparkle,
    testId: 'jujutsu-kaisen-mode-button',
    isDark: true,
    isAnime: true,
    color: '#8b5cf6',
  },
  {
    value: 'matcha',
    label: 'Matcha',
    Icon: Leaf,
    testId: 'matcha-mode-button',
    isDark: true,
    color: '#A4B07E',
  },
  {
    value: 'monokai',
    label: 'Monokai',
    Icon: Flame,
    testId: 'monokai-mode-button',
    isDark: true,
    color: '#f92672',
  },
  {
    value: 'nord',
    label: 'Nord',
    Icon: Snowflake,
    testId: 'nord-mode-button',
    isDark: true,
    color: '#88c0d0',
  },
  {
    value: 'ocean',
    label: 'Ocean',
    Icon: Waves,
    testId: 'ocean-mode-button',
    isDark: true,
    color: '#06b6d4',
  },
  {
    value: 'onedark',
    label: 'One Dark',
    Icon: Atom,
    testId: 'onedark-mode-button',
    isDark: true,
    color: '#61afef',
  },
  {
    value: 'retro',
    label: 'Retro',
    Icon: Terminal,
    testId: 'retro-mode-button',
    isDark: true,
    color: '#22c55e',
  },
  {
    value: 'solarized',
    label: 'Solarized Dark',
    Icon: Eclipse,
    testId: 'solarized-mode-button',
    isDark: true,
    color: '#268bd2',
  },
  {
    value: 'spy-family',
    label: 'Spy × Family',
    Icon: Sparkles,
    testId: 'spy-family-mode-button',
    isDark: true,
    isAnime: true,
    color: '#f9a8d4',
  },
  {
    value: 'synthwave',
    label: 'Synthwave',
    Icon: Radio,
    testId: 'synthwave-mode-button',
    isDark: true,
    color: '#ff7edb',
  },
  {
    value: 'tokyonight',
    label: 'Tokyo Night',
    Icon: Sparkles,
    testId: 'tokyonight-mode-button',
    isDark: true,
    color: '#bb9af7',
  },
  // Light themes (15) - alphabetical, Light first
  {
    value: 'light',
    label: 'Light',
    Icon: Sun,
    testId: 'light-mode-button',
    isDark: false,
    color: '#4f46e5',
  },
  {
    value: 'ayu-light',
    label: 'Ayu Light',
    Icon: Sun,
    testId: 'ayu-light-mode-button',
    isDark: false,
    color: '#F29718',
  },
  {
    value: 'bocchi',
    label: 'Bocchi the Rock',
    Icon: Guitar,
    testId: 'bocchi-mode-button',
    isDark: false,
    isAnime: true,
    color: '#ec4899',
  },
  {
    value: 'dragon-ball',
    label: 'Dragon Ball',
    Icon: Zap,
    testId: 'dragon-ball-mode-button',
    isDark: false,
    isAnime: true,
    color: '#2563eb',
  },
  {
    value: 'ghibli-forest',
    label: 'Ghibli Forest',
    Icon: TreePine,
    testId: 'ghibli-forest-mode-button',
    isDark: false,
    isAnime: true,
    color: '#22c55e',
  },
  {
    value: 'github',
    label: 'GitHub',
    Icon: Github,
    testId: 'github-mode-button',
    isDark: false,
    color: '#0969da',
  },
  {
    value: 'gruvboxlight',
    label: 'Gruvbox Light',
    Icon: Trees,
    testId: 'gruvboxlight-mode-button',
    isDark: false,
    color: '#d65d0e',
  },
  {
    value: 'lavender',
    label: 'Lavender',
    Icon: Feather,
    testId: 'lavender-mode-button',
    isDark: false,
    color: '#8b5cf6',
  },
  {
    value: 'mint',
    label: 'Mint',
    Icon: Wind,
    testId: 'mint-mode-button',
    isDark: false,
    color: '#0d9488',
  },
  {
    value: 'nordlight',
    label: 'Nord Light',
    Icon: Snowflake,
    testId: 'nordlight-mode-button',
    isDark: false,
    color: '#5e81ac',
  },
  {
    value: 'one-piece',
    label: 'One Piece',
    Icon: Anchor,
    testId: 'one-piece-mode-button',
    isDark: false,
    isAnime: true,
    color: '#2563eb',
  },
  {
    value: 'sailor-moon',
    label: 'Sailor Moon',
    Icon: Star,
    testId: 'sailor-moon-mode-button',
    isDark: false,
    isAnime: true,
    color: '#ec4899',
  },
  {
    value: 'sepia',
    label: 'Sepia',
    Icon: Coffee,
    testId: 'sepia-mode-button',
    isDark: false,
    color: '#92400e',
  },
  {
    value: 'solarizedlight',
    label: 'Solarized Light',
    Icon: Sunrise,
    testId: 'solarizedlight-mode-button',
    isDark: false,
    color: '#268bd2',
  },
  {
    value: 'your-name',
    label: 'Your Name',
    Icon: Sparkle,
    testId: 'your-name-mode-button',
    isDark: false,
    isAnime: true,
    color: '#6366f1',
  },
];

// Helper: Get only dark themes
export const darkThemes = themeOptions.filter(t => t.isDark);

// Helper: Get only light themes
export const lightThemes = themeOptions.filter(t => !t.isDark);

// Helper: Categorized theme groups
export const animeDarkThemes = themeOptions.filter(t => t.isDark && t.isAnime);
export const animeLightThemes = themeOptions.filter(t => !t.isDark && t.isAnime);
export const classicDarkThemes = themeOptions.filter(t => t.isDark && !t.isAnime);
export const classicLightThemes = themeOptions.filter(t => !t.isDark && !t.isAnime);

/**
 * Build a complete list of theme options including custom themes.
 * Custom themes appear first, followed by all built-in themes.
 */
export function getAllThemeOptions(customThemes: CustomThemeDefinition[]): ThemeOption[] {
  const customOptions: ThemeOption[] = customThemes.map(ct => ({
    value: ct.id as Theme,
    label: ct.name,
    testId: `${ct.id}-mode-button`,
    isDark: ct.isDark,
    isCustom: true,
    color: ct.color,
  }));

  return [...customOptions, ...themeOptions];
}

// Helper: Get theme option by value (searches built-in themes, or all if custom themes provided)
export function getThemeOption(
  theme: Theme,
  customThemes?: CustomThemeDefinition[]
): ThemeOption | undefined {
  const builtIn = themeOptions.find(t => t.value === theme);
  if (builtIn) return builtIn;

  if (customThemes) {
    const ct = customThemes.find(t => t.id === theme);
    if (ct) {
      return {
        value: ct.id as Theme,
        label: ct.name,
        testId: `${ct.id}-mode-button`,
        isDark: ct.isDark,
        isCustom: true,
        color: ct.color,
      };
    }
  }

  return undefined;
}
