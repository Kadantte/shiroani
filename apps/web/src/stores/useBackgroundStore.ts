// Components using background state should import from this store
// (e.g., BackgroundOverlay.tsx, SettingsView.tsx, App.tsx)
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { createLogger } from '@shiroani/shared';

const logger = createLogger('BackgroundStore');

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
 * Background store state
 */
interface BackgroundState {
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
 * Background store actions
 */
interface BackgroundActions {
  /** Pick and set a custom background via native file dialog */
  pickBackground: () => Promise<void>;
  /** Remove the current custom background */
  removeBackground: () => Promise<void>;
  /** Set background opacity */
  setBackgroundOpacity: (opacity: number) => void;
  /** Set background blur */
  setBackgroundBlur: (blur: number) => void;
  /** Restore background settings from electron-store on startup */
  restoreBackground: () => Promise<void>;
}

type BackgroundStore = BackgroundState & BackgroundActions;

// Default background settings
const DEFAULT_BG_OPACITY = 0.15;
const DEFAULT_BG_BLUR = 0;
const BG_STORE_KEY = 'custom-backgrounds';

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

/**
 * Background store using Zustand
 */
export const useBackgroundStore = create<BackgroundStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      customBackground: null,
      customBackgroundFileName: null,
      backgroundOpacity: DEFAULT_BG_OPACITY,
      backgroundBlur: DEFAULT_BG_BLUR,
      backgroundLoaded: false,

      // Actions
      pickBackground: async () => {
        logger.debug('pickBackground');
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
            'background/pick'
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

      removeBackground: async () => {
        logger.debug('removeBackground');
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
          'background/remove'
        );

        applyBackgroundToDOM(null, DEFAULT_BG_OPACITY, DEFAULT_BG_BLUR);
        await persistBackgroundSettings(null);
      },

      setBackgroundOpacity: (opacity: number) => {
        const clamped = Math.max(0, Math.min(1, opacity));
        logger.debug('setBackgroundOpacity', clamped);
        set({ backgroundOpacity: clamped }, undefined, 'background/setOpacity');

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
        set({ backgroundBlur: clamped }, undefined, 'background/setBlur');

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
            set({ backgroundLoaded: true }, undefined, 'background/restore:empty');
            return;
          }

          // Verify the file still exists by resolving its URL
          const url = await window.electronAPI?.background?.getUrl(saved.fileName);
          if (!url) {
            logger.info('Saved background file no longer exists, clearing settings');
            await persistBackgroundSettings(null);
            set({ backgroundLoaded: true }, undefined, 'background/restore:missing');
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
            'background/restore:success'
          );

          applyBackgroundToDOM(url, opacity, blur);
          logger.info('Background restored successfully');
        } catch (err) {
          logger.warn('Failed to restore background:', err);
          set({ backgroundLoaded: true }, undefined, 'background/restore:error');
        }
      },
    }),
    { name: 'background' }
  )
);
