import { useState, useCallback } from 'react';
import {
  Copy,
  Download,
  Image,
  Palette,
  Pencil,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useBackgroundStore } from '@/stores/useBackgroundStore';
import { useCustomThemeStore } from '@/stores/useCustomThemeStore';
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
import { cn } from '@/lib/utils';
import type { ThemeOption } from '@/lib/theme';
import type { Theme } from '@shiroani/shared';

export function AppearanceSection() {
  const { theme, setTheme, setPreviewTheme } = useSettingsStore();
  const {
    customBackground,
    backgroundOpacity,
    backgroundBlur,
    pickBackground,
    removeBackground,
    setBackgroundOpacity,
    setBackgroundBlur,
  } = useBackgroundStore();
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

  return (
    <div className="space-y-4">
      {/* Custom background — shown first */}
      <SettingsCard icon={Image} title="Tło" subtitle="Ustaw własne tło aplikacji (obraz lub GIF)">
        {customBackground && (
          <div className="rounded-xl overflow-hidden border border-border-glass h-24">
            <img src={customBackground} alt="Podgląd tła" className="w-full h-full object-cover" />
          </div>
        )}

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="border-border-glass"
            onClick={pickBackground}
          >
            <Image className="w-4 h-4" />
            Wybierz obraz
          </Button>
          {customBackground && (
            <Button
              variant="ghost"
              size="sm"
              className="border-border-glass"
              onClick={removeBackground}
            >
              <RotateCcw className="w-4 h-4" />
              Usuń tło
            </Button>
          )}
        </div>

        {/* Opacity & blur sliders - only shown when a background is set */}
        {customBackground && (
          <div className="mt-2 space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-muted-foreground">Przezroczystość</label>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {Math.round(backgroundOpacity * 100)}%
                </span>
              </div>
              <Slider
                value={[backgroundOpacity]}
                onValueChange={([v]) => setBackgroundOpacity(v)}
                min={0.02}
                max={1}
                step={0.01}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-muted-foreground">Rozmycie</label>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {backgroundBlur}px
                </span>
              </div>
              <Slider
                value={[backgroundBlur]}
                onValueChange={([v]) => setBackgroundBlur(v)}
                min={0}
                max={20}
                step={1}
              />
            </div>
          </div>
        )}
      </SettingsCard>

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
              className="h-6 px-2 text-2xs text-muted-foreground hover:text-foreground"
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
                onPreviewEnd={() => setPreviewTheme(null)}
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
                'border border-dashed border-border-glass'
              )}
            >
              <div className="w-10 h-10 rounded-full border-2 border-border-glass flex items-center justify-center">
                <Plus className="w-4 h-4 text-muted-foreground" />
              </div>
              <span className="text-2xs text-muted-foreground">Nowy motyw</span>
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

          {/* Anime dark */}
          <div className="mb-3">
            <p className="text-2xs text-muted-foreground mb-2 ml-0.5">Ciemne</p>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(80px,1fr))] gap-1.5">
              {animeDarkThemes.map(opt => (
                <BuiltInThemeSwatchWrapper
                  key={opt.value}
                  option={opt}
                  isActive={theme === opt.value}
                  onSelect={setTheme}
                  onPreview={setPreviewTheme}
                  onPreviewEnd={() => setPreviewTheme(null)}
                  onClone={() => handleCloneTheme(opt.value)}
                />
              ))}
            </div>
          </div>

          {/* Anime light */}
          <div>
            <p className="text-2xs text-muted-foreground mb-2 ml-0.5">Jasne</p>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(80px,1fr))] gap-1.5">
              {animeLightThemes.map(opt => (
                <BuiltInThemeSwatchWrapper
                  key={opt.value}
                  option={opt}
                  isActive={theme === opt.value}
                  onSelect={setTheme}
                  onPreview={setPreviewTheme}
                  onPreviewEnd={() => setPreviewTheme(null)}
                  onClone={() => handleCloneTheme(opt.value)}
                />
              ))}
            </div>
          </div>
        </div>

        <Separator className="bg-border/50" />

        {/* Classic section */}
        <div>
          <h4 className="text-xs font-medium text-muted-foreground mb-3 flex items-center gap-1.5">
            <Palette className="w-3 h-3" />
            Klasyczne
          </h4>

          {/* Classic dark */}
          <div className="mb-3">
            <p className="text-2xs text-muted-foreground mb-2 ml-0.5">Ciemne</p>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(80px,1fr))] gap-1.5">
              {classicDarkThemes.map(opt => (
                <BuiltInThemeSwatchWrapper
                  key={opt.value}
                  option={opt}
                  isActive={theme === opt.value}
                  onSelect={setTheme}
                  onPreview={setPreviewTheme}
                  onPreviewEnd={() => setPreviewTheme(null)}
                  onClone={() => handleCloneTheme(opt.value)}
                />
              ))}
            </div>
          </div>

          {/* Classic light */}
          <div>
            <p className="text-2xs text-muted-foreground mb-2 ml-0.5">Jasne</p>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(80px,1fr))] gap-1.5">
              {classicLightThemes.map(opt => (
                <BuiltInThemeSwatchWrapper
                  key={opt.value}
                  option={opt}
                  isActive={theme === opt.value}
                  onSelect={setTheme}
                  onPreview={setPreviewTheme}
                  onPreviewEnd={() => setPreviewTheme(null)}
                  onClone={() => handleCloneTheme(opt.value)}
                />
              ))}
            </div>
          </div>
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
      <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={e => {
            e.stopPropagation();
            onEdit();
          }}
          className="w-5 h-5 rounded bg-background/80 backdrop-blur-sm border border-border-glass flex items-center justify-center hover:bg-accent transition-colors"
          aria-label="Edytuj motyw"
        >
          <Pencil className="w-2.5 h-2.5 text-foreground" />
        </button>
        <button
          onClick={e => {
            e.stopPropagation();
            onExport();
          }}
          className="w-5 h-5 rounded bg-background/80 backdrop-blur-sm border border-border-glass flex items-center justify-center hover:bg-accent transition-colors"
          aria-label="Eksportuj motyw"
        >
          <Download className="w-2.5 h-2.5 text-foreground" />
        </button>
        <button
          onClick={e => {
            e.stopPropagation();
            onDelete();
          }}
          className="w-5 h-5 rounded bg-background/80 backdrop-blur-sm border border-border-glass flex items-center justify-center hover:bg-destructive/20 transition-colors"
          aria-label="Usuń motyw"
        >
          <Trash2 className="w-2.5 h-2.5 text-destructive" />
        </button>
      </div>
    </div>
  );
}

// ── Built-in theme swatch with clone overlay ──────────────────────

function BuiltInThemeSwatchWrapper({
  option,
  isActive,
  onSelect,
  onPreview,
  onPreviewEnd,
  onClone,
}: {
  option: ThemeOption;
  isActive: boolean;
  onSelect: (theme: Theme) => void;
  onPreview: (theme: Theme) => void;
  onPreviewEnd: () => void;
  onClone: () => void;
}) {
  return (
    <div className="relative group">
      <ThemeSwatch
        option={option}
        isActive={isActive}
        onSelect={onSelect}
        onPreview={onPreview}
        onPreviewEnd={onPreviewEnd}
      />
      {/* Hover-reveal clone button */}
      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={e => {
            e.stopPropagation();
            onClone();
          }}
          className="w-5 h-5 rounded bg-background/80 backdrop-blur-sm border border-border-glass flex items-center justify-center hover:bg-accent transition-colors"
          aria-label="Klonuj motyw"
        >
          <Copy className="w-2.5 h-2.5 text-foreground" />
        </button>
      </div>
    </div>
  );
}
