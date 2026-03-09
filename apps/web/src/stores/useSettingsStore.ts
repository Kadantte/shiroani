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
 * Persisted background settings stored in electron-store under 'custom-backgrounds'
 */
interface BackgroundSettings {
  /** File name stored in userData/backgrounds/ */
  fileName: string;
  /** Protocol URL for the image (shiroani-bg://backgrounds/<name>) */
  url: string;
  /** Background opacity (0-1), default 0.15 */
  opacity: number;
  /** Background blur in px (0-20), default 0 */
  blur: number;
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
  /** Custom background image URL (protocol URL for rendering) */
  customBackground: string | null;
  /** File name of the custom background (for persistence/removal) */
  customBackgroundFileName: string | null;
  /** Background opacity (0-1) */
  backgroundOpacity: number;
  /** Background blur in px */
  backgroundBlur: number;
  /** Whether the background has been loaded from persistence */
  backgroundLoaded: boolean;
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
  /** Pick and set a custom background via native file dialog */
  pickCustomBackground: () => Promise<void>;
  /** Remove the current custom background */
  removeCustomBackground: () => Promise<void>;
  /** Set background opacity */
  setBackgroundOpacity: (opacity: number) => void;
  /** Set background blur */
  setBackgroundBlur: (blur: number) => void;
  /** Restore background settings from electron-store on startup */
  restoreBackground: () => Promise<void>;
}

/**
 * Combined store type
 */
type SettingsStore = SettingsState & SettingsActions;

// Default background settings
const DEFAULT_BG_OPACITY = 0.15;
const DEFAULT_BG_BLUR = 0;
const BG_STORE_KEY = 'custom-backgrounds';

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

/**
 * Apply background CSS custom properties to the root element.
 */
function applyBackgroundToDOM(url: string | null, opacity: number, blur: number) {
  const root = document.documentElement;
  if (url) {
    root.style.setProperty('--app-bg-image', `url(${url})`);
    root.style.setProperty('--app-bg-opacity', String(opacity));
    root.style.setProperty('--app-bg-blur', `${blur}px`);
  } else {
    root.style.removeProperty('--app-bg-image');
    root.style.removeProperty('--app-bg-opacity');
    root.style.removeProperty('--app-bg-blur');
  }
}

/**
 * Persist background settings to electron-store
 */
async function persistBackgroundSettings(settings: BackgroundSettings | null): Promise<void> {
  try {
    if (settings) {
      await window.electronAPI?.store?.set(BG_STORE_KEY, settings);
    } else {
      await window.electronAPI?.store?.delete(BG_STORE_KEY);
    }
  } catch (err) {
    logger.warn('Failed to persist background settings:', err);
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
        customBackgroundFileName: null,
        backgroundOpacity: DEFAULT_BG_OPACITY,
        backgroundBlur: DEFAULT_BG_BLUR,
        backgroundLoaded: false,

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

        pickCustomBackground: async () => {
          logger.debug('pickCustomBackground');
          try {
            const result = await window.electronAPI?.background?.pick();
            if (!result) return; // User cancelled

            const state = get();
            const opacity = state.backgroundOpacity;
            const blur = state.backgroundBlur;

            // If there was a previous background, remove its file
            if (state.customBackgroundFileName) {
              try {
                await window.electronAPI?.background?.remove(state.customBackgroundFileName);
              } catch (err) {
                logger.warn('Failed to remove previous background file:', err);
              }
            }

            set(
              {
                customBackground: result.url,
                customBackgroundFileName: result.fileName,
              },
              undefined,
              'settings/pickCustomBackground'
            );

            applyBackgroundToDOM(result.url, opacity, blur);

            await persistBackgroundSettings({
              fileName: result.fileName,
              url: result.url,
              opacity,
              blur,
            });
          } catch (err) {
            logger.error('Failed to pick custom background:', err);
          }
        },

        removeCustomBackground: async () => {
          logger.debug('removeCustomBackground');
          const state = get();

          // Remove the file from disk
          if (state.customBackgroundFileName) {
            try {
              await window.electronAPI?.background?.remove(state.customBackgroundFileName);
            } catch (err) {
              logger.warn('Failed to remove background file:', err);
            }
          }

          set(
            {
              customBackground: null,
              customBackgroundFileName: null,
              backgroundOpacity: DEFAULT_BG_OPACITY,
              backgroundBlur: DEFAULT_BG_BLUR,
            },
            undefined,
            'settings/removeCustomBackground'
          );

          applyBackgroundToDOM(null, DEFAULT_BG_OPACITY, DEFAULT_BG_BLUR);
          await persistBackgroundSettings(null);
        },

        setBackgroundOpacity: (opacity: number) => {
          const clamped = Math.max(0, Math.min(1, opacity));
          logger.debug('setBackgroundOpacity', clamped);
          set({ backgroundOpacity: clamped }, undefined, 'settings/setBackgroundOpacity');

          const state = get();
          applyBackgroundToDOM(state.customBackground, clamped, state.backgroundBlur);

          // Persist updated settings
          if (state.customBackgroundFileName && state.customBackground) {
            persistBackgroundSettings({
              fileName: state.customBackgroundFileName,
              url: state.customBackground,
              opacity: clamped,
              blur: state.backgroundBlur,
            });
          }
        },

        setBackgroundBlur: (blur: number) => {
          const clamped = Math.max(0, Math.min(20, blur));
          logger.debug('setBackgroundBlur', clamped);
          set({ backgroundBlur: clamped }, undefined, 'settings/setBackgroundBlur');

          const state = get();
          applyBackgroundToDOM(state.customBackground, state.backgroundOpacity, clamped);

          // Persist updated settings
          if (state.customBackgroundFileName && state.customBackground) {
            persistBackgroundSettings({
              fileName: state.customBackgroundFileName,
              url: state.customBackground,
              opacity: state.backgroundOpacity,
              blur: clamped,
            });
          }
        },

        restoreBackground: async () => {
          logger.debug('restoreBackground');
          try {
            const saved = await window.electronAPI?.store?.get<BackgroundSettings>(BG_STORE_KEY);
            if (!saved || !saved.fileName) {
              set({ backgroundLoaded: true }, undefined, 'settings/restoreBackground:empty');
              return;
            }

            // Verify the file still exists by resolving its URL
            const url = await window.electronAPI?.background?.getUrl(saved.fileName);
            if (!url) {
              logger.info('Saved background file no longer exists, clearing settings');
              await persistBackgroundSettings(null);
              set({ backgroundLoaded: true }, undefined, 'settings/restoreBackground:missing');
              return;
            }

            const opacity = typeof saved.opacity === 'number' ? saved.opacity : DEFAULT_BG_OPACITY;
            const blur = typeof saved.blur === 'number' ? saved.blur : DEFAULT_BG_BLUR;

            set(
              {
                customBackground: url,
                customBackgroundFileName: saved.fileName,
                backgroundOpacity: opacity,
                backgroundBlur: blur,
                backgroundLoaded: true,
              },
              undefined,
              'settings/restoreBackground:success'
            );

            applyBackgroundToDOM(url, opacity, blur);
            logger.info('Background restored successfully');
          } catch (err) {
            logger.warn('Failed to restore background:', err);
            set({ backgroundLoaded: true }, undefined, 'settings/restoreBackground:error');
          }
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
