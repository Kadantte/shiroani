import {
  type LucideIcon,
  Anchor,
  Cat,
  Coffee,
  Flame,
  Ghost,
  Github,
  Guitar,
  Moon,
  Radio,
  Snowflake,
  Sparkles,
  Sun,
  Sunrise,
  Terminal,
  TreePine,
  Trees,
  Zap,
} from 'lucide-react';
import type { Theme, CustomThemeDefinition } from '@shiroani/shared';

export interface ThemeOption {
  value: Theme;
  label: string;
  Icon?: LucideIcon;
  testId: string;
  isDark: boolean;
  isCustom?: boolean; // true for user-created custom themes
  color: string; // Primary/brand color for icon display
}

// All theme options with dark/light categorization (alphabetically sorted, Dark/Light first)
export const themeOptions: ReadonlyArray<ThemeOption> = [
  // Dark themes (10) - alphabetical, Dark first
  {
    value: 'dark',
    label: 'Dark',
    Icon: Moon,
    testId: 'dark-mode-button',
    isDark: true,
    color: '#6366f1',
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

    color: '#22c55e',
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
    value: 'retro',
    label: 'Retro',
    Icon: Terminal,
    testId: 'retro-mode-button',
    isDark: true,
    color: '#22c55e',
  },
  {
    value: 'spy-family',
    label: 'Spy × Family',
    Icon: Sparkles,
    testId: 'spy-family-mode-button',
    isDark: true,

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
  // Light themes (8) - alphabetical, Light first
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

    color: '#ec4899',
  },
  {
    value: 'ghibli-forest',
    label: 'Ghibli Forest',
    Icon: TreePine,
    testId: 'ghibli-forest-mode-button',
    isDark: false,

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
    value: 'one-piece',
    label: 'One Piece',
    Icon: Anchor,
    testId: 'one-piece-mode-button',
    isDark: false,

    color: '#2563eb',
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
];

// Helper: Get only dark themes
export const darkThemes = themeOptions.filter(t => t.isDark);

// Helper: Get only light themes
export const lightThemes = themeOptions.filter(t => !t.isDark);

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
