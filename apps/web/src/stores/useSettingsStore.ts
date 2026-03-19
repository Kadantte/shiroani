import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Theme } from '@shiroani/shared';
import {
  createLogger,
  DEFAULT_UI_FONT_SCALE,
  isBuiltInTheme,
  UI_FONT_SCALE_SETTING_KEY,
} from '@shiroani/shared';
import { themeOptions } from '@/lib/theme';
import { persistTheme, getPersistedTheme } from '@/lib/theme-persistence';
import { injectCustomThemeCSS, removeCustomThemeCSS } from '@/lib/custom-theme-css';
import { electronStoreGet, electronStoreSet } from '@/lib/electron-store';
import {
  applyUIFontScaleToDOM,
  clampUIFontScale,
  getPersistedUIFontScale,
  persistUIFontScaleLocally,
} from '@/lib/ui-font-scale';
import { useBackgroundStore } from '@/stores/useBackgroundStore';
import { useCustomThemeStore } from '@/stores/useCustomThemeStore';

const logger = createLogger('Settings');

/**
 * Settings state
 */
interface SettingsState {
  /** Current theme */
  theme: Theme;
  /** Preview theme (for hover preview) */
  previewTheme: Theme | null;
  /** Readability scale applied to UI typography/layout tokens */
  uiFontScale: number;
  /** Preferred language for anime titles/subtitles */
  preferredLanguage: 'japanese' | 'english' | 'romaji';
}

/**
 * Settings actions
 */
interface SettingsActions {
  /** Set theme */
  setTheme: (theme: Theme) => void;
  /** Set preview theme (for hover) */
  setPreviewTheme: (theme: Theme | null) => void;
  /** Set UI font scale */
  setUIFontScale: (scale: number) => void;
  /** Set preferred language */
  setPreferredLanguage: (lang: 'japanese' | 'english' | 'romaji') => void;
  /** Initialize persisted visual settings */
  initSettings: () => Promise<void>;
}

/**
 * Combined store type
 */
type SettingsStore = SettingsState & SettingsActions;

/**
 * Track the currently-applied theme class so we can always remove it.
 */
let currentThemeClass: string | null = null;

/**
 * If the persisted theme is a custom theme that hasn't loaded yet,
 * store its ID here so we can apply it once the custom theme store loads.
 */
let pendingCustomTheme: string | null = null;
let settingsInitPromise: Promise<void> | null = null;

/**
 * Apply theme class to document element.
 * Handles both built-in and custom themes.
 */
function applyThemeToDOM(theme: Theme) {
  logger.debug('applyThemeToDOM:', theme);
  const root = document.documentElement;
  const previousTheme = currentThemeClass;

  // Remove the previously tracked theme class
  if (previousTheme) {
    root.classList.remove(previousTheme);
  }

  // Also remove all known built-in theme classes (safety net for initial load)
  const allThemeClasses = themeOptions.map(t => t.value);
  root.classList.remove(...allThemeClasses);

  // Clean up custom CSS if switching away from a custom theme
  if (previousTheme && !isBuiltInTheme(previousTheme) && previousTheme !== theme) {
    removeCustomThemeCSS(previousTheme);
    root.classList.remove('dark');
  }

  // Add the theme class
  root.classList.add(theme);
  currentThemeClass = theme;

  // Apply custom theme CSS variables if this is a custom theme
  if (!isBuiltInTheme(theme)) {
    const definition = useCustomThemeStore.getState().getTheme(theme);
    if (definition) {
      injectCustomThemeCSS(theme, definition.variables);
      if (definition.isDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    } else {
      logger.warn('Custom theme definition not found:', theme);
    }
  }
}

// Default theme
const DEFAULT_THEME: Theme = 'dark';

/**
 * Settings store using Zustand
 */
export const useSettingsStore = create<SettingsStore>()(
  devtools(
    (set, get) => {
      // Resolve initial theme from localStorage (instant) or fall back to default.
      // Validate against known built-in themes and custom themes.
      const persisted = typeof document !== 'undefined' ? getPersistedTheme() : DEFAULT_THEME;
      const isBuiltIn = themeOptions.some(t => t.value === persisted);
      const customThemeStore = useCustomThemeStore.getState();
      const isCustom = !isBuiltIn && customThemeStore.customThemes.some(t => t.id === persisted);
      const isValidTheme = isBuiltIn || isCustom;

      // If the persisted theme is not recognized, it may be a custom theme whose
      // store hasn't loaded yet. Store the ID so we can apply it once loaded.
      let initialTheme: Theme;
      if (isValidTheme) {
        initialTheme = persisted as Theme;
      } else if (!isBuiltIn && persisted !== DEFAULT_THEME) {
        // Potentially a custom theme that will load later — use default for now
        // and set up a listener to apply the custom theme when it becomes available
        initialTheme = DEFAULT_THEME;
        pendingCustomTheme = persisted;
      } else {
        initialTheme = DEFAULT_THEME;
      }

      // Apply initial theme on store initialization
      if (typeof document !== 'undefined') {
        applyThemeToDOM(initialTheme);
      }

      const initialFontScale =
        typeof document !== 'undefined' ? getPersistedUIFontScale() : DEFAULT_UI_FONT_SCALE;

      if (typeof document !== 'undefined') {
        applyUIFontScaleToDOM(initialFontScale);
      }

      return {
        // Initial state
        theme: initialTheme,
        previewTheme: null,
        uiFontScale: initialFontScale,
        preferredLanguage: 'romaji',

        // Actions
        setTheme: (theme: Theme) => {
          logger.debug('setTheme', theme);
          set({ theme, previewTheme: null }, undefined, 'settings/setTheme');
          applyThemeToDOM(theme);
          persistTheme(theme);
        },

        setPreviewTheme: (theme: Theme | null) => {
          const state = get();
          set({ previewTheme: theme }, undefined, 'settings/setPreviewTheme');

          if (theme) {
            applyThemeToDOM(theme);
          } else {
            // Restore actual theme when preview ends
            applyThemeToDOM(state.theme);
          }
        },

        setUIFontScale: (scale: number) => {
          const next = clampUIFontScale(scale);
          logger.debug('setUIFontScale', next);
          set({ uiFontScale: next }, undefined, 'settings/setUIFontScale');
          applyUIFontScaleToDOM(next);
          persistUIFontScaleLocally(next);
          void electronStoreSet(UI_FONT_SCALE_SETTING_KEY, next).catch(error => {
            logger.warn('Failed to persist UI font scale:', error);
          });
        },

        setPreferredLanguage: (lang: 'japanese' | 'english' | 'romaji') => {
          logger.debug('setPreferredLanguage', lang);
          set({ preferredLanguage: lang }, undefined, 'settings/setPreferredLanguage');
        },

        initSettings: async () => {
          logger.debug('initSettings');
          if (settingsInitPromise) {
            return settingsInitPromise;
          }

          const initialScale = get().uiFontScale;
          settingsInitPromise = (async () => {
            await useBackgroundStore.getState().restoreBackground();

            try {
              const persistedScale = await electronStoreGet<number>(UI_FONT_SCALE_SETTING_KEY);
              if (typeof persistedScale !== 'number') {
                return;
              }

              const next = clampUIFontScale(persistedScale);
              if (get().uiFontScale !== initialScale) {
                return;
              }
              set({ uiFontScale: next }, undefined, 'settings/initUIFontScale');
              applyUIFontScaleToDOM(next);
              persistUIFontScaleLocally(next);
            } catch (error) {
              logger.warn('Failed to restore UI font scale:', error);
            }
          })().catch(error => {
            settingsInitPromise = null;
            throw error;
          });

          return settingsInitPromise;
        },
      };
    },
    { name: 'settings' }
  )
);

// Subscribe to custom theme store to apply pending custom theme once loaded
if (typeof document !== 'undefined') {
  useCustomThemeStore.subscribe(state => {
    if (pendingCustomTheme && state.customThemes.some(t => t.id === pendingCustomTheme)) {
      const themeId = pendingCustomTheme as Theme;
      pendingCustomTheme = null;
      useSettingsStore.getState().setTheme(themeId);
    }
  });
}

// Selectors

/**
 * Select current theme
 */
export const selectTheme = (state: SettingsStore) => state.theme;

/**
 * Select preview theme
 */
export const selectPreviewTheme = (state: SettingsStore) => state.previewTheme;

/**
 * Select effective theme (preview or actual)
 */
export const selectEffectiveTheme = (state: SettingsStore) => state.previewTheme ?? state.theme;
