/**
 * Custom theme store — manages user-created themes with electron-store persistence
 * and localStorage fallback for web builds.
 */
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { toast } from 'sonner';
import { createLogger, isBuiltInTheme } from '@shiroani/shared';
import type { CustomThemeDefinition, BuiltInTheme } from '@shiroani/shared';
import { THEME_VARIABLE_NAMES } from '@/lib/custom-theme-css';

const logger = createLogger('CustomThemeStore');

const STORE_KEY = 'custom-themes';
const MAX_THEMES = 50;

// ─── State & Actions ─────────────────────────────────────────────────────────

interface CustomThemeState {
  /** All user-created themes */
  customThemes: CustomThemeDefinition[];
  /** Whether themes have been loaded from persistence */
  loaded: boolean;
}

interface CustomThemeActions {
  /** Load themes from persistence (electron-store or localStorage) */
  loadThemes: () => Promise<void>;
  /** Add a new custom theme (id, createdAt, updatedAt are generated automatically) */
  addTheme: (
    theme: Omit<CustomThemeDefinition, 'id' | 'createdAt' | 'updatedAt'>
  ) => CustomThemeDefinition | null;
  /** Update an existing custom theme by ID */
  updateTheme: (id: string, updates: Partial<CustomThemeDefinition>) => void;
  /** Delete a custom theme by ID */
  deleteTheme: (id: string) => void;
  /** Get a custom theme by ID */
  getTheme: (id: string) => CustomThemeDefinition | undefined;
  /** Export a custom theme to a JSON file */
  exportTheme: (id: string) => Promise<void>;
  /** Import a custom theme from a JSON file */
  importTheme: () => Promise<void>;
}

type CustomThemeStore = CustomThemeState & CustomThemeActions;

// ─── Persistence helpers ─────────────────────────────────────────────────────

async function persistThemes(themes: CustomThemeDefinition[]): Promise<void> {
  try {
    if (window.electronAPI?.store) {
      await window.electronAPI.store.set(STORE_KEY, themes);
    } else {
      localStorage.setItem(STORE_KEY, JSON.stringify(themes));
    }
  } catch (err) {
    logger.warn('Failed to persist custom themes:', err);
  }
}

async function loadPersistedThemes(): Promise<CustomThemeDefinition[]> {
  try {
    if (window.electronAPI?.store) {
      const data = await window.electronAPI.store.get<CustomThemeDefinition[]>(STORE_KEY);
      return Array.isArray(data) ? data : [];
    } else {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch (err) {
    logger.warn('Failed to load custom themes:', err);
    return [];
  }
}

// ─── Import/Export helpers ───────────────────────────────────────────────────

/** The file format for theme import/export */
interface ThemeExportFormat {
  version: 1;
  type: 'shiroani-custom-theme';
  theme: {
    name: string;
    baseTheme: string;
    isDark: boolean;
    color: string;
    variables: Record<string, string>;
  };
}

/** Sanitize a theme name for use as a file name */
function sanitizeFileName(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .slice(0, 50) || 'motyw'
  );
}

/**
 * Validate an imported theme JSON against the expected format.
 * Returns an error message if invalid, or null if valid.
 */
function validateImportData(data: unknown): string | null {
  if (!data || typeof data !== 'object') {
    return 'Nieprawidłowy format pliku';
  }

  const obj = data as Record<string, unknown>;

  if (obj.version !== 1 || obj.type !== 'shiroani-custom-theme') {
    return 'Nieprawidłowy format pliku';
  }

  if (!obj.theme || typeof obj.theme !== 'object') {
    return 'Nieprawidłowy format pliku';
  }

  const theme = obj.theme as Record<string, unknown>;

  if (typeof theme.name !== 'string' || theme.name.trim().length === 0) {
    return 'Nieprawidłowy format pliku';
  }

  if (typeof theme.baseTheme !== 'string' || !isBuiltInTheme(theme.baseTheme)) {
    return 'Nieprawidłowy format pliku';
  }

  if (typeof theme.isDark !== 'boolean') {
    return 'Nieprawidłowy format pliku';
  }

  if (typeof theme.color !== 'string') {
    return 'Nieprawidłowy format pliku';
  }

  if (!theme.variables || typeof theme.variables !== 'object') {
    return 'Nieprawidłowy format pliku';
  }

  const validNames = new Set<string>(THEME_VARIABLE_NAMES);
  const variables = theme.variables as Record<string, unknown>;
  for (const [key, val] of Object.entries(variables)) {
    if (!validNames.has(key)) {
      return 'Nieprawidłowy format pliku';
    }
    if (typeof val !== 'string') {
      return 'Nieprawidłowy format pliku';
    }
  }

  return null;
}

/** Web-only fallback: export via Blob download */
function webExportFallback(exportData: ThemeExportFormat, fileName: string): void {
  const json = JSON.stringify(exportData, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Web-only fallback: import via hidden file input */
function webImportFallback(): Promise<string | null> {
  return new Promise(resolve => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.style.display = 'none';

    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        input.remove();
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        resolve(reader.result as string);
        input.remove();
      };
      reader.onerror = () => {
        resolve(null);
        input.remove();
      };
      reader.readAsText(file);
    });

    input.addEventListener('cancel', () => {
      resolve(null);
      input.remove();
    });

    document.body.appendChild(input);
    input.click();
  });
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useCustomThemeStore = create<CustomThemeStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      customThemes: [],
      loaded: false,

      // Actions
      loadThemes: async () => {
        logger.debug('loadThemes');
        const themes = await loadPersistedThemes();
        set({ customThemes: themes, loaded: true }, undefined, 'customThemes/load');
        logger.info(`Loaded ${themes.length} custom theme(s)`);
      },

      addTheme: theme => {
        const state = get();
        if (state.customThemes.length >= MAX_THEMES) {
          logger.warn(`Cannot add theme: maximum of ${MAX_THEMES} custom themes reached`);
          return null;
        }

        const now = Date.now();
        const newTheme: CustomThemeDefinition = {
          ...theme,
          id: `custom-${now}`,
          createdAt: now,
          updatedAt: now,
        };

        const updated = [...state.customThemes, newTheme];
        set({ customThemes: updated }, undefined, 'customThemes/add');
        persistThemes(updated);

        logger.info(`Added custom theme: ${newTheme.name} (${newTheme.id})`);
        return newTheme;
      },

      updateTheme: (id, updates) => {
        const state = get();
        const index = state.customThemes.findIndex(t => t.id === id);
        if (index === -1) {
          logger.warn(`Cannot update theme: ${id} not found`);
          return;
        }

        const updated = [...state.customThemes];
        updated[index] = {
          ...updated[index],
          ...updates,
          id, // prevent overwriting ID
          updatedAt: Date.now(),
        };

        set({ customThemes: updated }, undefined, 'customThemes/update');
        persistThemes(updated);

        logger.debug(`Updated custom theme: ${id}`);
      },

      deleteTheme: id => {
        const state = get();
        const updated = state.customThemes.filter(t => t.id !== id);

        if (updated.length === state.customThemes.length) {
          logger.warn(`Cannot delete theme: ${id} not found`);
          return;
        }

        set({ customThemes: updated }, undefined, 'customThemes/delete');
        persistThemes(updated);

        logger.info(`Deleted custom theme: ${id}`);
      },

      getTheme: id => {
        return get().customThemes.find(t => t.id === id);
      },

      exportTheme: async (id: string) => {
        try {
          const theme = get().getTheme(id);
          if (!theme) {
            toast.error('Nie znaleziono motywu');
            return;
          }

          const exportData: ThemeExportFormat = {
            version: 1,
            type: 'shiroani-custom-theme',
            theme: {
              name: theme.name,
              baseTheme: theme.baseTheme,
              isDark: theme.isDark,
              color: theme.color,
              variables: theme.variables,
            },
          };

          const fileName = `${sanitizeFileName(theme.name)}.json`;

          // Electron path: native save dialog + file write
          if (window.electronAPI?.dialog?.saveFile && window.electronAPI?.file?.writeJson) {
            const filePath = await window.electronAPI.dialog.saveFile({
              title: 'Eksportuj motyw',
              defaultPath: fileName,
              filters: [{ name: 'JSON', extensions: ['json'] }],
            });

            if (!filePath) return; // User cancelled

            const jsonString = JSON.stringify(exportData, null, 2);
            await window.electronAPI.file.writeJson(filePath, jsonString);
            toast.success('Motyw został wyeksportowany');
          } else {
            // Web fallback: Blob download
            webExportFallback(exportData, fileName);
            toast.success('Motyw został wyeksportowany');
          }
        } catch (err) {
          logger.error('Failed to export theme:', err);
          toast.error('Błąd podczas eksportu motywu');
        }
      },

      importTheme: async () => {
        try {
          let raw: string | null = null;

          // Electron path: native open dialog + file read
          if (window.electronAPI?.dialog?.openFile && window.electronAPI?.file?.readJson) {
            const filePath = await window.electronAPI.dialog.openFile({
              title: 'Importuj motyw',
              filters: [{ name: 'JSON', extensions: ['json'] }],
            });

            if (!filePath) return; // User cancelled

            raw = await window.electronAPI.file.readJson(filePath);
          } else {
            // Web fallback: file input
            raw = await webImportFallback();
          }

          if (!raw) return;

          let data: unknown;
          try {
            data = JSON.parse(raw);
          } catch {
            toast.error('Nieprawidłowy format pliku');
            return;
          }

          const validationError = validateImportData(data);
          if (validationError) {
            toast.error(validationError);
            return;
          }

          const importData = data as ThemeExportFormat;

          // Check theme limit before adding
          if (get().customThemes.length >= MAX_THEMES) {
            toast.error('Osiągnięto limit motywów (50)');
            return;
          }

          const result = get().addTheme({
            name: importData.theme.name,
            baseTheme: importData.theme.baseTheme as BuiltInTheme,
            isDark: importData.theme.isDark,
            color: importData.theme.color,
            variables: importData.theme.variables,
          });

          if (result) {
            toast.success('Motyw został zaimportowany');
          }
        } catch (err) {
          logger.error('Failed to import theme:', err);
          toast.error('Błąd podczas importu motywu');
        }
      },
    }),
    { name: 'custom-themes' }
  )
);
