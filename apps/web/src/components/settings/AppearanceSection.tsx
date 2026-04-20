import { useState, useCallback } from 'react';
import {
  Download,
  Eye,
  GripHorizontal,
  Moon,
  Palette,
  Pencil,
  Plus,
  Sun,
  Type,
  Trash2,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useCustomThemeStore } from '@/stores/useCustomThemeStore';
import { useDockStore, type DockEdge } from '@/stores/useDockStore';
import { darkThemes, lightThemes, getAllThemeOptions } from '@/lib/theme';
import { removeCustomThemeCSS } from '@/lib/custom-theme-css';
import { ThemeSwatch } from '@/components/settings/ThemeSwatch';
import { ThemeEditorDialog } from '@/components/settings/ThemeEditorDialog';
import { SettingsCard, SettingsRow, SettingsRowLabel } from '@/components/settings/SettingsCard';
import { BackgroundSettings } from '@/components/settings/BackgroundSettings';
import { ThemeGrid } from '@/components/settings/ThemeGrid';
import { PillTag } from '@/components/ui/pill-tag';
import { IS_MAC } from '@/lib/platform';
import { cn } from '@/lib/utils';
import { UI_FONT_SCALE_PRESETS, type Theme } from '@shiroani/shared';
import { ALL_NAV_ITEMS, ALWAYS_VISIBLE_VIEWS } from '@/lib/nav-items';

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
  const dockEdge = useDockStore(s => s.edge);
  const setDockEdge = useDockStore(s => s.setEdge);
  const resetDockPosition = useDockStore(s => s.resetPosition);
  const hiddenViews = useDockStore(s => s.hiddenViews);
  const toggleViewVisibility = useDockStore(s => s.toggleViewVisibility);

  const DOCK_EDGES: ReadonlyArray<{ value: DockEdge; label: string }> = [
    { value: 'bottom', label: 'Dół' },
    { value: 'top', label: 'Góra' },
    { value: 'left', label: 'Lewo' },
    { value: 'right', label: 'Prawo' },
  ];

  return (
    <div className="space-y-4">
      {/* Readability / UI font scale — segmented buttons match .seg-btns */}
      <SettingsCard
        icon={Type}
        title="Czytelność"
        subtitle="Skalowanie tekstu i interfejsu do Twojego ekranu."
      >
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1">
            {UI_FONT_SCALE_PRESETS.map(scale => {
              const isActive = uiFontScale === scale;
              return (
                <button
                  key={scale}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => setUIFontScale(scale)}
                  className={cn(
                    'rounded-lg border px-3 py-[6px] text-[12px] font-medium transition-colors',
                    'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                    isActive
                      ? 'border-primary/35 bg-primary/18 text-primary font-semibold'
                      : 'border-border-glass bg-background/30 text-muted-foreground hover:bg-accent/40 hover:text-foreground'
                  )}
                >
                  {Math.round(scale * 100)}%
                </button>
              );
            })}
          </div>
          <PillTag variant="accent">Aktualna skala: {Math.round(uiFontScale * 100)}%</PillTag>
        </div>

        {IS_MAC && (
          <p className="text-[11.5px] text-muted-foreground/80 leading-relaxed">
            Na macOS często najlepiej sprawdza się zakres 105-110%, zwłaszcza na ekranach Retina.
          </p>
        )}
      </SettingsCard>

      {/* Dock settings */}
      <SettingsCard
        icon={GripHorizontal}
        title="Dock nawigacyjny"
        subtitle="Pozycja i zachowanie paska nawigacji."
      >
        <SettingsRow>
          <SettingsRowLabel
            id="dock-autohide-label"
            title="Automatyczne ukrywanie"
            description="Dock chowa się do ikony i rozwija po najechaniu kursorem"
          />
          <Switch
            checked={dockAutoHide}
            onCheckedChange={setDockAutoHide}
            aria-labelledby="dock-autohide-label"
          />
        </SettingsRow>
        <SettingsRow divider>
          <SettingsRowLabel
            id="dock-labels-label"
            title="Pokaż etykiety"
            description="Wyświetlaj nazwy pod ikonami nawigacji"
          />
          <Switch
            checked={dockShowLabels}
            onCheckedChange={setDockShowLabels}
            aria-labelledby="dock-labels-label"
          />
        </SettingsRow>
        <SettingsRow divider>
          <SettingsRowLabel
            id="dock-draggable-label"
            title="Przeciąganie"
            description="Pozwól na zmianę pozycji docka przeciąganiem"
          />
          <Switch
            checked={dockDraggable}
            onCheckedChange={setDockDraggable}
            aria-labelledby="dock-draggable-label"
          />
        </SettingsRow>
        <SettingsRow divider stacked>
          <SettingsRowLabel
            title="Krawędź docka"
            description="Na której krawędzi ekranu przyczepić dock"
          />
          <div
            role="radiogroup"
            aria-label="Krawędź docka"
            className="flex flex-wrap items-center gap-1"
          >
            {DOCK_EDGES.map(({ value, label }) => {
              const isActive = dockEdge === value;
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={isActive}
                  onClick={() => setDockEdge(value)}
                  className={cn(
                    'rounded-lg border px-3 py-[6px] text-[12px] font-medium transition-colors',
                    'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                    isActive
                      ? 'border-primary/35 bg-primary/18 text-primary font-semibold'
                      : 'border-border-glass bg-background/30 text-muted-foreground hover:bg-accent/40 hover:text-foreground'
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </SettingsRow>
        <SettingsRow divider>
          <SettingsRowLabel
            title="Pozycja docka"
            description="Przywróć domyślną pozycję na dole ekranu"
          />
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs border-border-glass"
            onClick={resetDockPosition}
          >
            Przywróć pozycję
          </Button>
        </SettingsRow>
      </SettingsCard>

      {/* View visibility toggles — grid of compact rows */}
      <SettingsCard
        icon={Eye}
        title="Widoczność widoków"
        subtitle="Ukryj sekcje, których nie używasz — Ustawienia są zawsze dostępne."
      >
        <div className="grid grid-cols-2 gap-2">
          {ALL_NAV_ITEMS.map(item => {
            const alwaysOn = ALWAYS_VISIBLE_VIEWS.has(item.id);
            const visible = alwaysOn || !hiddenViews.includes(item.id);
            const labelId = `view-visibility-${item.id}`;
            return (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-lg border border-border-glass/70 bg-background/30 px-3 py-2"
              >
                <span className="text-[12px] font-medium text-foreground" id={labelId}>
                  {item.label}
                  {alwaysOn && (
                    <span className="ml-2 text-2xs text-muted-foreground/70 font-normal">
                      (zawsze)
                    </span>
                  )}
                </span>
                <Switch
                  checked={visible}
                  disabled={alwaysOn}
                  onCheckedChange={() => toggleViewVisibility(item.id)}
                  aria-labelledby={labelId}
                />
              </div>
            );
          })}
        </div>
      </SettingsCard>

      {/* Custom background */}
      <BackgroundSettings />

      {/* Theme picker */}
      <SettingsCard
        icon={Palette}
        title="Motyw kolorystyczny"
        subtitle="Wybierz paletę — własną lub z biblioteki."
        headerAccessory={
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2.5 text-[11px] border-border-glass"
            onClick={() => importTheme()}
          >
            <Upload className="w-3 h-3" />
            Importuj
          </Button>
        }
      >
        {/* Custom themes section */}
        {customThemeOptions.length > 0 && (
          <div className="space-y-2.5">
            <div className="flex items-center gap-2.5 text-muted-foreground">
              <span className="flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.18em] font-semibold">
                <Palette className="w-3 h-3" />
                Własne
                <span className="tabular-nums text-muted-foreground/60">
                  · {customThemeOptions.length}
                </span>
              </span>
              <span className="flex-1 h-px bg-border-glass" />
            </div>
            <div className="grid grid-cols-5 gap-2 sm:gap-2.5">
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
              <button
                onClick={handleCreateNew}
                aria-label="Nowy motyw"
                className={cn(
                  'relative aspect-square w-full rounded-[10px] border border-dashed border-border-glass',
                  'grid place-items-center text-muted-foreground',
                  'transition-colors hover:bg-accent/30 hover:text-foreground',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1'
                )}
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Dark themes */}
        <ThemeGrid
          themes={darkThemes}
          label="Ciemne"
          icon={Moon}
          activeTheme={theme}
          onSelect={setTheme}
          onPreview={setPreviewTheme}
          onPreviewEnd={clearPreview}
          onClone={handleCloneTheme}
        />

        {/* Light themes */}
        <ThemeGrid
          themes={lightThemes}
          label="Jasne"
          icon={Sun}
          activeTheme={theme}
          onSelect={setTheme}
          onPreview={setPreviewTheme}
          onPreviewEnd={clearPreview}
          onClone={handleCloneTheme}
        />

        {/* Add new theme (shown when no custom themes exist so the primary CTA is visible) */}
        {customThemeOptions.length === 0 && (
          <div className="pt-1">
            <Button
              variant="outline"
              size="sm"
              className="border-dashed border-border-glass text-muted-foreground"
              onClick={handleCreateNew}
            >
              <Plus className="w-4 h-4" />
              Nowy motyw
            </Button>
          </div>
        )}
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
          className="w-6 h-6 rounded bg-background/85 backdrop-blur-sm border border-border-glass flex items-center justify-center hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring transition-colors"
          aria-label="Edytuj motyw"
        >
          <Pencil className="w-3 h-3 text-foreground" />
        </button>
        <button
          onClick={e => {
            e.stopPropagation();
            onExport();
          }}
          className="w-6 h-6 rounded bg-background/85 backdrop-blur-sm border border-border-glass flex items-center justify-center hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring transition-colors"
          aria-label="Eksportuj motyw"
        >
          <Download className="w-3 h-3 text-foreground" />
        </button>
        <button
          onClick={e => {
            e.stopPropagation();
            if (window.confirm('Czy na pewno chcesz usunąć ten motyw?')) onDelete();
          }}
          className="w-6 h-6 rounded bg-background/85 backdrop-blur-sm border border-border-glass flex items-center justify-center hover:bg-destructive/20 focus-visible:ring-2 focus-visible:ring-ring transition-colors"
          aria-label="Usuń motyw"
        >
          <Trash2 className="w-3 h-3 text-destructive" />
        </button>
      </div>
    </div>
  );
}
