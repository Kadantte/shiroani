import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Theme } from '@shiroani/shared';
import { createLogger } from '@shiroani/shared';
import { themeOptions } from '@/lib/theme';
import { persistTheme, getPersistedTheme } from '@/lib/theme-persistence';

const logger = createLogger('Settings');

/**
 * Settings section identifiers for navigation
 */
type SettingsSectionId = 'appearance' | 'playback' | 'library' | 'about';

/**
 * Settings modal state
 */
interface SettingsModalState {
  /** Whether the settings modal is open */
  isOpen: boolean;
  /** Active section in settings */
  activeSection: SettingsSectionId;
}

/**
 * Settings state
 */
interface SettingsState extends SettingsModalState {
  /** Current theme */
  theme: Theme;
  /** Preview theme (for hover preview) */
  previewTheme: Theme | null;
  /** Whether adblock is enabled for embedded browser */
  adblockEnabled: boolean;
  /** Preferred language for anime titles/subtitles */
  preferredLanguage: 'japanese' | 'english' | 'romaji';
  /** Custom background image URL */
  customBackground: string | null;
}

/**
 * Settings actions
 */
interface SettingsActions {
  /** Open settings modal */
  openSettings: (section?: SettingsSectionId) => void;
  /** Close settings modal */
  closeSettings: () => void;
  /** Navigate to a section */
  navigateToSection: (section: SettingsSectionId) => void;
  /** Set theme */
  setTheme: (theme: Theme) => void;
  /** Set preview theme (for hover) */
  setPreviewTheme: (theme: Theme | null) => void;
  /** Apply theme to DOM */
  applyTheme: (theme: Theme) => void;
  /** Toggle adblock */
  setAdblockEnabled: (enabled: boolean) => void;
  /** Set preferred language */
  setPreferredLanguage: (lang: 'japanese' | 'english' | 'romaji') => void;
  /** Set custom background */
  setCustomBackground: (url: string | null) => void;
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
 * Apply theme class to document element.
 */
function applyThemeToDOM(theme: Theme) {
  logger.debug('applyThemeToDOM:', theme);
  const root = document.documentElement;

  // Remove the previously tracked theme class
  if (currentThemeClass) {
    root.classList.remove(currentThemeClass);
  }

  // Also remove all known built-in theme classes (safety net for initial load)
  const allThemeClasses = themeOptions.map(t => t.value);
  root.classList.remove(...allThemeClasses);

  // Add the theme class
  root.classList.add(theme);
  currentThemeClass = theme;
}

// Default theme
const DEFAULT_THEME: Theme = 'dark';

/**
 * Settings store using Zustand
 */
export const useSettingsStore = create<SettingsStore>()(
  devtools(
    (set, get) => {
      // Resolve initial theme from localStorage (instant) or fall back to default
      const initialTheme = (
        typeof document !== 'undefined' ? getPersistedTheme() : DEFAULT_THEME
      ) as Theme;

      // Apply initial theme on store initialization
      if (typeof document !== 'undefined') {
        applyThemeToDOM(initialTheme);
      }

      return {
        // Initial state
        isOpen: false,
        activeSection: 'appearance',
        theme: initialTheme,
        previewTheme: null,
        adblockEnabled: true,
        preferredLanguage: 'romaji',
        customBackground: null,

        // Actions
        openSettings: (section?: SettingsSectionId) => {
          logger.debug('openSettings', section ?? '(default)');
          set(
            {
              isOpen: true,
              activeSection: section ?? get().activeSection,
            },
            undefined,
            'settings/openSettings'
          );
        },

        closeSettings: () => {
          logger.debug('closeSettings');
          const state = get();
          // Clear preview theme when closing
          if (state.previewTheme) {
            applyThemeToDOM(state.theme);
          }
          set(
            {
              isOpen: false,
              previewTheme: null,
            },
            undefined,
            'settings/closeSettings'
          );
        },

        navigateToSection: (section: SettingsSectionId) => {
          logger.debug('navigateToSection', section);
          set({ activeSection: section }, undefined, 'settings/navigateToSection');
        },

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

        applyTheme: (theme: Theme) => {
          applyThemeToDOM(theme);
        },

        setAdblockEnabled: (enabled: boolean) => {
          logger.debug('setAdblockEnabled', enabled);
          set({ adblockEnabled: enabled }, undefined, 'settings/setAdblockEnabled');
        },

        setPreferredLanguage: (lang: 'japanese' | 'english' | 'romaji') => {
          logger.debug('setPreferredLanguage', lang);
          set({ preferredLanguage: lang }, undefined, 'settings/setPreferredLanguage');
        },

        setCustomBackground: (url: string | null) => {
          logger.debug('setCustomBackground', url ? '(set)' : '(cleared)');
          set({ customBackground: url }, undefined, 'settings/setCustomBackground');
        },
      };
    },
    { name: 'settings' }
  )
);

// Selectors

/**
 * Select modal open state
 */
export const selectIsSettingsOpen = (state: SettingsStore) => state.isOpen;

/**
 * Select active section
 */
export const selectActiveSection = (state: SettingsStore) => state.activeSection;

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
