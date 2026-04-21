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
import {
  BUILT_IN_THEME_METADATA,
  type BuiltInTheme,
  type Theme,
  type CustomThemeDefinition,
} from '@shiroani/shared';

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
 * Icon mapping for built-in themes. Lives here (not in shared) because
 * `lucide-react` is a renderer-only dependency.
 */
const THEME_ICONS: Record<BuiltInTheme, LucideIcon> = {
  plum: Flower2,
  noir: Moon,
  matcha: Leaf,
  iced: Snowflake,
  ember: Flame,
  sakura: Sparkles,
  midnight: CloudMoon,
  abyss: Waves,
  crimson: Droplets,
  dusk: Sunset,
  cosmic: WandSparkles,
  void: Gem,
  sunset: Sun,
  shirogane: Mountain,
  onyx: Compass,
  paper: BookOpen,
  haiku: Feather,
};

/**
 * All 17 built-in themes — 15 dark + 2 light.
 * Order and colors are sourced from `@shiroani/shared`; icons are attached here.
 */
export const themeOptions: ReadonlyArray<ThemeOption> = BUILT_IN_THEME_METADATA.map(meta => ({
  value: meta.value,
  label: meta.label,
  Icon: THEME_ICONS[meta.value],
  testId: `${meta.value}-mode-button`,
  isDark: meta.isDark,
  color: meta.color,
}));

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
