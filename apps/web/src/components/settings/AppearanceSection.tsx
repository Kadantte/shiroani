import { useState, useCallback } from 'react';
import {
  Download,
  GripHorizontal,
  Palette,
  Pencil,
  Plus,
  Sparkles,
  Type,
  Trash2,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useCustomThemeStore } from '@/stores/useCustomThemeStore';
import { useDockStore } from '@/stores/useDockStore';
import {
  animeDarkThemes,
  animeLightThemes,
  classicDarkThemes,
  classicLightThemes,
  getAllThemeOptions,
} from '@/lib/theme';
import { removeCustomThemeCSS } from '@/lib/custom-theme-css';
import { ThemeSwatch } from '@/components/settings/ThemeSwatch';
import { ThemeEditorDialog } from '@/components/settings/ThemeEditorDialog';
import { SettingsCard } from '@/components/settings/SettingsCard';
import { BackgroundSettings } from '@/components/settings/BackgroundSettings';
import { ThemeGrid } from '@/components/settings/ThemeGrid';
import { IS_MAC } from '@/lib/platform';
import { cn } from '@/lib/utils';
import { UI_FONT_SCALE_PRESETS, type Theme } from '@shiroani/shared';

export function AppearanceSection() {
  const { theme, setTheme, setPreviewTheme, uiFontScale, setUIFontScale } = useSettingsStore();
  const customThemes = useCustomThemeStore(s => s.customThemes);
  const deleteTheme = useCustomThemeStore(s => s.deleteTheme);
  const exportTheme = useCustomThemeStore(s => s.exportTheme);
  const importTheme = useCustomThemeStore(s => s.importTheme);

  // Theme editor dialog state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editThemeId, setEditThemeId] = useState<string | undefined>();
  const [cloneFromTheme, setCloneFromTheme] = useState<string | undefined>();

  const handleCreateNew = useCallback(() => {
    setEditThemeId(undefined);
    setCloneFromTheme(theme);
    setEditorOpen(true);
  }, [theme]);

  const handleEditTheme = useCallback((themeId: string) => {
    setEditThemeId(themeId);
    setCloneFromTheme(undefined);
    setEditorOpen(true);
  }, []);

  const handleCloneTheme = useCallback((sourceTheme: string) => {
    setEditThemeId(undefined);
    setCloneFromTheme(sourceTheme);
    setEditorOpen(true);
  }, []);

  const handleDeleteTheme = useCallback(
    (themeId: string) => {
      // If the deleted theme is currently active, switch to dark
      if (theme === themeId) {
        setTheme('dark');
      }
      removeCustomThemeCSS(themeId);
      deleteTheme(themeId);
      toast.success('Motyw usunięty');
    },
    [theme, setTheme, deleteTheme]
  );

  // Build custom theme options for rendering
  const customThemeOptions = getAllThemeOptions(customThemes).filter(t => t.isCustom);

  const clearPreview = useCallback(() => setPreviewTheme(null), [setPreviewTheme]);

  const dockAutoHide = useDockStore(s => s.autoHide);
  const setDockAutoHide = useDockStore(s => s.setAutoHide);
  const dockDraggable = useDockStore(s => s.draggable);
  const setDockDraggable = useDockStore(s => s.setDraggable);
  const dockShowLabels = useDockStore(s => s.showLabels);
  const setDockShowLabels = useDockStore(s => s.setShowLabels);
  const resetDockPosition = useDockStore(s => s.resetPosition);

  return (
    <div className="space-y-4">
      <SettingsCard
        icon={Type}
        title="Czytelność"
        subtitle="Dopasuj rozmiar tekstu i skalę interfejsu do swojego ekranu"
      >
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {UI_FONT_SCALE_PRESETS.map(scale => {
              const isActive = uiFontScale === scale;
              return (
                <button
                  key={scale}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => setUIFontScale(scale)}
                  className={cn(
                    'min-w-[64px] rounded-lg border px-3 py-2 text-xs font-medium transition-colors',
                    'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                    isActive
                      ? 'border-primary/40 bg-primary/15 text-primary'
                      : 'border-border-glass bg-background/30 text-muted-foreground hover:bg-accent/40 hover:text-foreground'
                  )}
                >
                  {Math.round(scale * 100)}%
                </button>
              );
            })}
          </div>

          <div className="rounded-xl border border-border-glass bg-background/30 p-3 space-y-1.5">
            <p className="text-sm font-medium text-foreground">Podgląd czytelności interfejsu</p>
            <p className="text-xs text-muted-foreground">
              Pomocnicze opisy, etykiety i metadane będą łatwiejsze do przeczytania.
            </p>
            <p className="text-xs text-muted-foreground/75">
              Aktualna skala: {Math.round(uiFontScale * 100)}%
            </p>
          </div>

          {IS_MAC && (
            <p className="text-xs text-muted-foreground/80">
              Na macOS często najlepiej sprawdza się zakres 105-110%, zwłaszcza na ekranach Retina.
            </p>
          )}
        </div>
      </SettingsCard>

      {/* Dock settings */}
      <SettingsCard
        icon={GripHorizontal}
        title="Dock nawigacyjny"
        subtitle="Pozycja i zachowanie paska nawigacji"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-foreground" id="dock-autohide-label">
              Automatyczne ukrywanie
            </p>
            <p className="text-xs text-muted-foreground/70">
              Dock zwija się do ikony i rozwija po najechaniu
            </p>
          </div>
          <Switch
            checked={dockAutoHide}
            onCheckedChange={setDockAutoHide}
            aria-labelledby="dock-autohide-label"
          />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-foreground" id="dock-labels-label">
              Pokaż etykiety
            </p>
            <p className="text-xs text-muted-foreground/70">
              Wyświetlaj nazwy pod ikonami nawigacji
            </p>
          </div>
          <Switch
            checked={dockShowLabels}
            onCheckedChange={setDockShowLabels}
            aria-labelledby="dock-labels-label"
          />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-foreground" id="dock-draggable-label">
              Przeciąganie
            </p>
            <p className="text-xs text-muted-foreground/70">
              Pozwól na zmianę pozycji docka przeciąganiem
            </p>
          </div>
          <Switch
            checked={dockDraggable}
            onCheckedChange={setDockDraggable}
            aria-labelledby="dock-draggable-label"
          />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-foreground">Pozycja docka</p>
            <p className="text-xs text-muted-foreground/70">
              Przywróć domyślną pozycję na dole ekranu
            </p>
          </div>
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={resetDockPosition}>
            Przywróć pozycję
          </Button>
        </div>
      </SettingsCard>

      {/* Custom background */}
      <BackgroundSettings />

      {/* Theme picker */}
      <SettingsCard icon={Palette} title="Motyw" subtitle="Wybierz motyw kolorystyczny aplikacji">
        {/* Custom themes section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-medium text-primary flex items-center gap-1.5">
              <Palette className="w-3 h-3" />
              Własne
            </h4>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => importTheme()}
            >
              <Upload className="w-3 h-3" />
              Importuj
            </Button>
          </div>

          <div className="grid grid-cols-[repeat(auto-fill,minmax(80px,1fr))] gap-1.5">
            {customThemeOptions.map(opt => (
              <CustomThemeSwatchWrapper
                key={opt.value}
                option={opt}
                isActive={theme === opt.value}
                onSelect={setTheme}
                onPreview={setPreviewTheme}
                onPreviewEnd={clearPreview}
                onEdit={() => handleEditTheme(opt.value)}
                onDelete={() => handleDeleteTheme(opt.value)}
                onExport={() => exportTheme(opt.value)}
              />
            ))}

            {/* Add new theme button */}
            <button
              onClick={handleCreateNew}
              className={cn(
                'relative flex flex-col items-center gap-2 p-2.5 rounded-xl',
                'transition-all duration-200',
                'hover:bg-accent/40 hover:scale-105',
                'border border-dashed border-border-glass',
                'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1'
              )}
            >
              <div className="w-10 h-10 rounded-full border-2 border-border-glass flex items-center justify-center">
                <Plus className="w-4 h-4 text-muted-foreground" />
              </div>
              <span className="text-xs text-muted-foreground">Nowy motyw</span>
            </button>
          </div>
        </div>

        <Separator className="bg-border/50" />

        {/* Anime section */}
        <div>
          <h4 className="text-xs font-medium text-primary mb-3 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3" />
            Anime
          </h4>

          <ThemeGrid
            themes={animeDarkThemes}
            label="Ciemne"
            activeTheme={theme}
            onSelect={setTheme}
            onPreview={setPreviewTheme}
            onPreviewEnd={clearPreview}
            onClone={handleCloneTheme}
          />

          <ThemeGrid
            themes={animeLightThemes}
            label="Jasne"
            activeTheme={theme}
            onSelect={setTheme}
            onPreview={setPreviewTheme}
            onPreviewEnd={clearPreview}
            onClone={handleCloneTheme}
          />
        </div>

        <Separator className="bg-border/50" />

        {/* Classic section */}
        <div>
          <h4 className="text-xs font-medium text-muted-foreground mb-3 flex items-center gap-1.5">
            <Palette className="w-3 h-3" />
            Klasyczne
          </h4>

          <ThemeGrid
            themes={classicDarkThemes}
            label="Ciemne"
            activeTheme={theme}
            onSelect={setTheme}
            onPreview={setPreviewTheme}
            onPreviewEnd={clearPreview}
            onClone={handleCloneTheme}
          />

          <ThemeGrid
            themes={classicLightThemes}
            label="Jasne"
            activeTheme={theme}
            onSelect={setTheme}
            onPreview={setPreviewTheme}
            onPreviewEnd={clearPreview}
            onClone={handleCloneTheme}
          />
        </div>
      </SettingsCard>

      {/* Theme editor dialog */}
      <ThemeEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        editThemeId={editThemeId}
        cloneFromTheme={cloneFromTheme}
      />
    </div>
  );
}

// ── Custom theme swatch with edit/delete overlays ─────────────────

function CustomThemeSwatchWrapper({
  option,
  isActive,
  onSelect,
  onPreview,
  onPreviewEnd,
  onEdit,
  onDelete,
  onExport,
}: {
  option: { value: Theme; label: string; color: string };
  isActive: boolean;
  onSelect: (theme: Theme) => void;
  onPreview: (theme: Theme) => void;
  onPreviewEnd: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onExport: () => void;
}) {
  return (
    <div className="relative group">
      <ThemeSwatch
        option={{
          value: option.value,
          label: option.label,
          color: option.color,
          testId: `${option.value}-mode-button`,
          isDark: true,
          isCustom: true,
        }}
        isActive={isActive}
        onSelect={onSelect}
        onPreview={onPreview}
        onPreviewEnd={onPreviewEnd}
      />
      {/* Hover-reveal action buttons */}
      <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
        <button
          onClick={e => {
            e.stopPropagation();
            onEdit();
          }}
          className="w-7 h-7 rounded bg-background/80 backdrop-blur-sm border border-border-glass flex items-center justify-center hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring transition-colors"
          aria-label="Edytuj motyw"
        >
          <Pencil className="w-3 h-3 text-foreground" />
        </button>
        <button
          onClick={e => {
            e.stopPropagation();
            onExport();
          }}
          className="w-7 h-7 rounded bg-background/80 backdrop-blur-sm border border-border-glass flex items-center justify-center hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring transition-colors"
          aria-label="Eksportuj motyw"
        >
          <Download className="w-3 h-3 text-foreground" />
        </button>
        <button
          onClick={e => {
            e.stopPropagation();
            if (window.confirm('Czy na pewno chcesz usunąć ten motyw?')) onDelete();
          }}
          className="w-7 h-7 rounded bg-background/80 backdrop-blur-sm border border-border-glass flex items-center justify-center hover:bg-destructive/20 focus-visible:ring-2 focus-visible:ring-ring transition-colors"
          aria-label="Usuń motyw"
        >
          <Trash2 className="w-3 h-3 text-destructive" />
        </button>
      </div>
    </div>
  );
}
