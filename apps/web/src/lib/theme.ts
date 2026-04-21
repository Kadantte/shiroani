import {
  type LucideIcon,
  BookOpen,
  CloudMoon,
  Compass,
  Droplets,
  Feather,
  Flame,
  Flower2,
  Gem,
  Leaf,
  Moon,
  Mountain,
  Snowflake,
  Sparkles,
  Sun,
  Sunset,
  Waves,
  WandSparkles,
} from 'lucide-react';
import type { Theme, CustomThemeDefinition } from '@shiroani/shared';

export interface ThemeOption {
  value: Theme;
  label: string;
  Icon?: LucideIcon;
  testId: string;
  isDark: boolean;
  isCustom?: boolean; // true for user-created custom themes
  color: string; // Primary/brand color for icon display (hex approximation of --primary)
}

/**
 * All 17 built-in themes — 15 dark + 2 light.
 * Order drives the theme picker grid; Plum leads as the default.
 */
export const themeOptions: ReadonlyArray<ThemeOption> = [
  // ─── Dark themes (15) ───
  {
    value: 'plum',
    label: 'Plum',
    Icon: Flower2,
    testId: 'plum-mode-button',
    isDark: true,
    color: '#d46cb1',
  },
  {
    value: 'noir',
    label: 'Noir',
    Icon: Moon,
    testId: 'noir-mode-button',
    isDark: true,
    color: '#d8d8d8',
  },
  {
    value: 'matcha',
    label: 'Matcha',
    Icon: Leaf,
    testId: 'matcha-mode-button',
    isDark: true,
    color: '#88c06a',
  },
  {
    value: 'iced',
    label: 'Iced',
    Icon: Snowflake,
    testId: 'iced-mode-button',
    isDark: true,
    color: '#7cc1d4',
  },
  {
    value: 'ember',
    label: 'Ember',
    Icon: Flame,
    testId: 'ember-mode-button',
    isDark: true,
    color: '#e08a3a',
  },
  {
    value: 'sakura',
    label: 'Sakura',
    Icon: Sparkles,
    testId: 'sakura-mode-button',
    isDark: true,
    color: '#f19bc0',
  },
  {
    value: 'midnight',
    label: 'Midnight',
    Icon: CloudMoon,
    testId: 'midnight-mode-button',
    isDark: true,
    color: '#4e9dd8',
  },
  {
    value: 'abyss',
    label: 'Abyss',
    Icon: Waves,
    testId: 'abyss-mode-button',
    isDark: true,
    color: '#5fc7bf',
  },
  {
    value: 'crimson',
    label: 'Crimson',
    Icon: Droplets,
    testId: 'crimson-mode-button',
    isDark: true,
    color: '#d2423a',
  },
  {
    value: 'dusk',
    label: 'Dusk',
    Icon: Sunset,
    testId: 'dusk-mode-button',
    isDark: true,
    color: '#d4a04a',
  },
  {
    value: 'cosmic',
    label: 'Cosmic',
    Icon: WandSparkles,
    testId: 'cosmic-mode-button',
    isDark: true,
    color: '#b07cf4',
  },
  {
    value: 'void',
    label: 'Void',
    Icon: Gem,
    testId: 'void-mode-button',
    isDark: true,
    color: '#9c3ff0',
  },
  {
    value: 'sunset',
    label: 'Sunset',
    Icon: Sun,
    testId: 'sunset-mode-button',
    isDark: true,
    color: '#e4b042',
  },
  {
    value: 'shirogane',
    label: 'Shirogane',
    Icon: Mountain,
    testId: 'shirogane-mode-button',
    isDark: true,
    color: '#cfc7c9',
  },
  {
    value: 'onyx',
    label: 'Onyx',
    Icon: Compass,
    testId: 'onyx-mode-button',
    isDark: true,
    color: '#c98f3e',
  },
  // ─── Light themes (2) ───
  {
    value: 'paper',
    label: 'Paper',
    Icon: BookOpen,
    testId: 'paper-mode-button',
    isDark: false,
    color: '#b0305b',
  },
  {
    value: 'haiku',
    label: 'Haiku',
    Icon: Feather,
    testId: 'haiku-mode-button',
    isDark: false,
    color: '#3e8552',
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
