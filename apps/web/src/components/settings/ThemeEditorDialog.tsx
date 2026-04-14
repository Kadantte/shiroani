import { useState, useCallback, useEffect, useRef } from 'react';
import { RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ColorPickerField } from '@/components/settings/ColorPickerField';
import { themeOptions, getThemeOption } from '@/lib/theme';
import {
  injectCustomThemeCSS,
  removeCustomThemeCSS,
  extractThemeVariables,
  THEME_VARIABLE_NAMES,
} from '@/lib/custom-theme-css';
import { useCustomThemeStore } from '@/stores/useCustomThemeStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import type { BuiltInTheme, CustomThemeDefinition } from '@shiroani/shared';

// ── Variable groups ───────────────────────────────────────────────

interface VariableGroup {
  label: string;
  variables: string[];
  /** If true, variables are box-shadow strings — use text input instead of color picker */
  isTextOnly?: boolean;
  /** Individual variables that are colors even in a text-only group */
  colorOverrides?: string[];
}

const VARIABLE_GROUPS: VariableGroup[] = [
  {
    label: 'Główne kolory',
    variables: [
      'background',
      'background-80',
      'foreground',
      'primary',
      'primary-foreground',
      'brand-600',
    ],
  },
  {
    label: 'Karty i menu',
    variables: [
      'card',
      'card-foreground',
      'popover',
      'popover-foreground',
      'secondary',
      'secondary-foreground',
      'muted',
      'muted-foreground',
      'accent',
      'accent-foreground',
      'destructive',
    ],
  },
  {
    label: 'Pasek boczny',
    variables: ['sidebar', 'sidebar-foreground'],
  },
  {
    label: 'Obramowania',
    variables: ['border', 'border-glass', 'input', 'ring'],
  },
  {
    label: 'Statusy',
    variables: [
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
    ],
  },
  {
    label: 'Cienie',
    variables: [
      'shadow-xs',
      'shadow-sm',
      'shadow-md',
      'shadow-lg',
      'shadow-xl',
      'shadow-card-focused',
    ],
    isTextOnly: true,
  },
];

// ── Helpers ───────────────────────────────────────────────────────

const TEMP_THEME_ID = '__theme-editor-preview__';

function makeDefaultName(cloneLabel?: string): string {
  return cloneLabel ? `Kopia: ${cloneLabel}` : 'Mój motyw';
}

/** Human-readable label for a CSS variable name */
function variableLabel(name: string): string {
  return name.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

/** Check whether a variable should use color picker (not a shadow string) */
function isColorVariable(varName: string, group: VariableGroup): boolean {
  if (!group.isTextOnly) return true;
  if (group.colorOverrides?.includes(varName)) return true;
  return false;
}

// ── Props ─────────────────────────────────────────────────────────

interface ThemeEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editThemeId?: string;
  cloneFromTheme?: string;
}

// ── Component ─────────────────────────────────────────────────────

export function ThemeEditorDialog({
  open,
  onOpenChange,
  editThemeId,
  cloneFromTheme,
}: ThemeEditorDialogProps) {
  const { setTheme } = useSettingsStore();

  // Track what theme was active before opening so we can revert on cancel
  const previousThemeRef = useRef<string>('');

  // ── State ──

  const [name, setName] = useState('');
  const [isDark, setIsDark] = useState(true);
  const [baseTheme, setBaseTheme] = useState<BuiltInTheme>('dark');
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [initialVariables, setInitialVariables] = useState<Record<string, string>>({});

  // ── Initialize on open ──

  useEffect(() => {
    if (!open) return;

    previousThemeRef.current = useSettingsStore.getState().theme;

    if (editThemeId) {
      // Editing existing custom theme
      const existing = useCustomThemeStore.getState().getTheme(editThemeId);
      if (existing) {
        setName(existing.name);
        setIsDark(existing.isDark);
        setBaseTheme(existing.baseTheme);
        setVariables({ ...existing.variables });
        setInitialVariables({ ...existing.variables });
      }
    } else {
      // New theme — clone from base
      const sourceTheme = cloneFromTheme || useSettingsStore.getState().theme;
      const sourceOption = getThemeOption(sourceTheme);
      const cloneLabel = sourceOption?.label;

      setName(makeDefaultName(cloneLabel));
      setIsDark(sourceOption?.isDark ?? true);
      setBaseTheme((cloneFromTheme || 'dark') as BuiltInTheme);

      const extracted = extractThemeVariables(sourceTheme);
      setVariables({ ...extracted });
      setInitialVariables({ ...extracted });
    }
  }, [open, editThemeId, cloneFromTheme]);

  // ── Live preview ──

  useEffect(() => {
    if (!open) return;

    // Build a partial CustomThemeDefinition for preview injection
    injectCustomThemeCSS(TEMP_THEME_ID, variables);
    // Apply the temp theme class to see changes
    const root = document.documentElement;
    root.classList.add(TEMP_THEME_ID);

    return () => {
      root.classList.remove(TEMP_THEME_ID);
      removeCustomThemeCSS(TEMP_THEME_ID);
    };
  }, [open, baseTheme, variables]);

  // ── Handlers ──

  const handleVariableChange = useCallback((varName: string, value: string) => {
    setVariables(prev => ({ ...prev, [varName]: value }));
  }, []);

  const handleBaseThemeChange = useCallback((newBase: string) => {
    setBaseTheme(newBase as BuiltInTheme);
    const baseOption = getThemeOption(newBase);
    if (baseOption) {
      setIsDark(baseOption.isDark);
    }
    // Remove preview CSS before extracting, so it doesn't override the base theme's values
    const root = document.documentElement;
    root.classList.remove(TEMP_THEME_ID);
    removeCustomThemeCSS(TEMP_THEME_ID);

    const extracted = extractThemeVariables(newBase);
    setVariables({ ...extracted });
    setInitialVariables({ ...extracted });
    // Live preview effect will re-inject on next render
  }, []);

  const handleReset = useCallback(() => {
    setVariables({ ...initialVariables });
  }, [initialVariables]);

  const handleCancel = useCallback(() => {
    // Remove preview and restore previous theme
    const root = document.documentElement;
    root.classList.remove(TEMP_THEME_ID);
    removeCustomThemeCSS(TEMP_THEME_ID);

    // Restore previous theme class
    if (previousThemeRef.current) {
      setTheme(previousThemeRef.current);
    }

    onOpenChange(false);
  }, [onOpenChange, setTheme]);

  const handleSave = useCallback(() => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error('Nazwa motywu nie może być pusta');
      return;
    }

    // Determine the primary color from variables (use brand-500 or primary)
    const primaryColor = variables['primary'] || '#6366f1';

    // Clean up preview
    const root = document.documentElement;
    root.classList.remove(TEMP_THEME_ID);
    removeCustomThemeCSS(TEMP_THEME_ID);

    if (editThemeId) {
      // Update existing theme
      useCustomThemeStore.getState().updateTheme(editThemeId, {
        name: trimmedName,
        baseTheme,
        isDark,
        color: primaryColor,
        variables,
      });
      setTheme(editThemeId);
      toast.success('Motyw zaktualizowany');
    } else {
      // Create new theme
      const newTheme: Omit<CustomThemeDefinition, 'id' | 'createdAt' | 'updatedAt'> = {
        name: trimmedName,
        baseTheme,
        isDark,
        color: primaryColor,
        variables,
      };
      const created = useCustomThemeStore.getState().addTheme(newTheme);
      if (created) {
        setTheme(created.id);
      }
      toast.success('Motyw utworzony');
    }

    onOpenChange(false);
  }, [name, baseTheme, isDark, variables, editThemeId, onOpenChange, setTheme]);

  // ── Render ──

  const isEditing = !!editThemeId;
  const dialogTitle = isEditing ? 'Edytuj motyw' : 'Nowy motyw';

  return (
    <Dialog
      open={open}
      onOpenChange={o => {
        if (!o) handleCancel();
      }}
    >
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Zmień ustawienia własnego motywu' : 'Utwórz nowy motyw'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 pr-2">
          {/* ── Header section: name, dark/light, base theme ── */}
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">Nazwa</label>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Mój motyw"
                className="h-8"
              />
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-foreground">Ciemny</label>
                <Switch checked={isDark} onCheckedChange={setIsDark} />
              </div>

              <div className="flex-1">
                <label className="text-xs font-medium text-foreground mb-1 block">
                  Motyw bazowy
                </label>
                <Select value={baseTheme} onValueChange={handleBaseThemeChange}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {themeOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* ── Color sections ── */}
          {VARIABLE_GROUPS.map(group => (
            <div key={group.label}>
              <h4 className="text-xs font-medium text-primary mb-2">{group.label}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                {group.variables.map(varName => {
                  // Only show variables that exist in THEME_VARIABLE_NAMES
                  if (!(THEME_VARIABLE_NAMES as readonly string[]).includes(varName)) return null;

                  const currentValue = variables[varName] || '';

                  if (isColorVariable(varName, group)) {
                    return (
                      <ColorPickerField
                        key={varName}
                        label={variableLabel(varName)}
                        variableName={varName}
                        value={currentValue}
                        onChange={val => handleVariableChange(varName, val)}
                      />
                    );
                  }

                  // Text input for shadow values
                  return (
                    <div key={varName} className="flex flex-col gap-0.5">
                      <label className="text-2xs text-foreground">{variableLabel(varName)}</label>
                      <Input
                        value={currentValue}
                        onChange={e => handleVariableChange(varName, e.target.value)}
                        className="h-6 px-1.5 text-2xs font-mono"
                        placeholder={`--${varName}`}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <DialogFooter className="pt-4 border-t border-border-glass gap-2">
          <Button variant="ghost" size="sm" onClick={handleReset} className="mr-auto">
            <RotateCcw className="w-3.5 h-3.5" />
            Przywróć
          </Button>
          <Button variant="outline" size="sm" onClick={handleCancel}>
            Anuluj
          </Button>
          <Button size="sm" onClick={handleSave}>
            Zapisz
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
