import { DEFAULT_UI_FONT_SCALE, MAX_UI_FONT_SCALE, MIN_UI_FONT_SCALE } from '@shiroani/shared';

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

export function getPersistedUIFontScale(): number {
  if (typeof window === 'undefined') {
    return DEFAULT_UI_FONT_SCALE;
  }

  try {
    const raw = localStorage.getItem(UI_FONT_SCALE_STORAGE_KEY);
    if (!raw) {
      return DEFAULT_UI_FONT_SCALE;
    }

    return clampUIFontScale(Number(raw));
  } catch {
    return DEFAULT_UI_FONT_SCALE;
  }
}

export function persistUIFontScaleLocally(value: number): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(UI_FONT_SCALE_STORAGE_KEY, String(clampUIFontScale(value)));
  } catch {
    // localStorage unavailable — silently ignore
  }
}
