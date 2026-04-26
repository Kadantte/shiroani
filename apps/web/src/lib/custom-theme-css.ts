/**
 * CSS injection utilities for custom themes.
 *
 * Manages <style> elements in <head> that override CSS custom properties
 * when a custom theme class is applied to :root.
 */

/**
 * Complete list of all theme CSS variable names (without `--` prefix).
 * These are the variables that can be customized in custom themes.
 */
export const THEME_VARIABLE_NAMES = [
  // Core
  'background',
  'background-80',
  'foreground',
  // Card
  'card',
  'card-foreground',
  // Popover
  'popover',
  'popover-foreground',
  // Primary
  'primary',
  'primary-foreground',
  // Brand
  'brand-600',
  // Secondary
  'secondary',
  'secondary-foreground',
  // Muted
  'muted',
  'muted-foreground',
  // Accent
  'accent',
  'accent-foreground',
  // Border
  'border',
  'border-glass',
  // Destructive / Input / Ring
  'destructive',
  'input',
  'ring',
  // Sidebar
  'sidebar',
  'sidebar-foreground',
  // Status colors
  'status-success',
  'status-success-bg',
  'status-warning',
  'status-warning-bg',
  'status-error',
  'status-error-bg',
  'status-info',
  'status-info-bg',
  'status-pending',
  'status-pending-bg',
  // Shadows
  'shadow-xs',
  'shadow-sm',
  'shadow-md',
  'shadow-lg',
  'shadow-xl',
  'shadow-card-focused',
] as const;

/** Prefix for custom theme style element IDs */
const STYLE_ID_PREFIX = 'shiroani-custom-theme-';

/**
 * Inject (or update) a <style> element for a custom theme.
 *
 * Creates CSS rules under `:root.{themeId}` that set the provided
 * CSS custom property overrides.
 *
 * @param themeId - The custom theme ID used as a CSS class on :root
 * @param variables - Map of variable name (without --) to CSS value
 */
export function injectCustomThemeCSS(themeId: string, variables: Record<string, string>): void {
  const styleId = STYLE_ID_PREFIX + themeId;
  let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;

  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = styleId;
    document.head.appendChild(styleEl);
  }

  const declarations = Object.entries(variables)
    .map(([name, value]) => `  --${name}: ${value};`)
    .join('\n');

  styleEl.textContent = `:root.${themeId} {\n${declarations}\n}`;
}

/**
 * Remove the <style> element for a custom theme.
 */
export function removeCustomThemeCSS(themeId: string): void {
  const styleEl = document.getElementById(STYLE_ID_PREFIX + themeId);
  if (styleEl) {
    styleEl.remove();
  }
}

/**
 * Extract all theme CSS variable values from a given theme class.
 *
 * Snapshots root.className, replaces it with only themeClass, reads variables,
 * then restores the original className — ensuring runtime-injected custom-theme
 * stylesheets (scoped to :root.themeId) don't shadow the requested theme's values.
 *
 * @param themeClass - The CSS class name of the theme to extract from
 * @returns Record mapping variable name (without --) to its computed value
 */
export function extractThemeVariables(themeClass: string): Record<string, string> {
  const root = document.documentElement;
  const previousClassName = root.className;

  root.className = themeClass;

  try {
    const computed = getComputedStyle(root);
    const variables: Record<string, string> = {};

    for (const name of THEME_VARIABLE_NAMES) {
      const value = computed.getPropertyValue(`--${name}`).trim();
      if (value) {
        variables[name] = value;
      }
    }

    return variables;
  } finally {
    root.className = previousClassName;
  }
}
