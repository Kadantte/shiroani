import { DEFAULT_UI_FONT_SCALE, MAX_UI_FONT_SCALE, MIN_UI_FONT_SCALE } from '@shiroani/shared';
import { createLocalStorageAccessor } from '@/lib/persisted-storage';

const UI_FONT_SCALE_STORAGE_KEY = 'shiroani-ui-font-scale';

export function clampUIFontScale(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_UI_FONT_SCALE;
  }

  return Math.min(MAX_UI_FONT_SCALE, Math.max(MIN_UI_FONT_SCALE, value));
}

export function applyUIFontScaleToDOM(value: number): void {
  if (typeof document === 'undefined') return;

  const next = clampUIFontScale(value);
  document.documentElement.style.setProperty('--app-font-scale', String(next));
}

const fontScaleStorage = createLocalStorageAccessor<number>(UI_FONT_SCALE_STORAGE_KEY, {
  parse: raw => clampUIFontScale(Number(raw)),
  serialize: value => String(clampUIFontScale(value)),
  fallback: DEFAULT_UI_FONT_SCALE,
});

export function getPersistedUIFontScale(): number {
  return fontScaleStorage.get();
}

export function persistUIFontScaleLocally(value: number): void {
  fontScaleStorage.set(value);
}
