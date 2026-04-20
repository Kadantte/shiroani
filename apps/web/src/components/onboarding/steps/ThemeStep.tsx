import { useCallback } from 'react';
import { Check, Palette } from 'lucide-react';
import { StepLayout } from '../StepLayout';
import { cn } from '@/lib/utils';
import { darkThemes, lightThemes, type ThemeOption } from '@/lib/theme';
import { useSettingsStore } from '@/stores/useSettingsStore';
import type { Theme } from '@shiroani/shared';

/**
 * Step 02 · Theme picker.
 *
 * Renders dark + light groups using swatches that show the theme's brand
 * colour. Hover previews the theme live via `setPreviewTheme`; click commits
 * via `setTheme`. Intentionally does not import from @/components/settings/ to
 * avoid a merge conflict with the concurrent Settings redesign — acceptable
 * duplication, slated to be factored into a shared primitive later.
 */
export function ThemeStep() {
  const { theme, setTheme, setPreviewTheme } = useSettingsStore();
  const clearPreview = useCallback(() => setPreviewTheme(null), [setPreviewTheme]);

  return (
    <StepLayout
      kanji="色"
      headline={
        <>
          Wybierz <em className="not-italic text-primary italic">paletę</em>, która pasuje do Twojej
          pory oglądania.
        </>
      }
      description={
        <>
          Ciemne motywy sprawdzają się wieczorem.{' '}
          <b className="font-semibold text-foreground">Paper</b> jest miły dla oczu rano. Zmienisz
          kiedy chcesz — zapisujemy od razu.
        </>
      }
      stepMarker={
        <>
          Krok <b className="font-bold text-primary">02 · Wygląd</b> · paleta
        </>
      }
      stepIcon={<Palette className="h-5 w-5" />}
      stepTitle="Motywy"
    >
      <ThemeGroup
        label={`Ciemne · ${darkThemes.length}`}
        themes={darkThemes}
        activeTheme={theme}
        onSelect={setTheme}
        onPreview={setPreviewTheme}
        onPreviewEnd={clearPreview}
      />
      <ThemeGroup
        label={`Jasne · ${lightThemes.length}`}
        themes={lightThemes}
        activeTheme={theme}
        onSelect={setTheme}
        onPreview={setPreviewTheme}
        onPreviewEnd={clearPreview}
      />
    </StepLayout>
  );
}

function ThemeGroup({
  label,
  themes,
  activeTheme,
  onSelect,
  onPreview,
  onPreviewEnd,
}: {
  label: string;
  themes: readonly ThemeOption[];
  activeTheme: Theme;
  onSelect: (theme: Theme) => void;
  onPreview: (theme: Theme) => void;
  onPreviewEnd: () => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 pt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        <span>{label}</span>
        <span className="h-px flex-1 bg-border-glass" />
      </div>
      <div className="grid grid-cols-5 gap-2">
        {themes.map(opt => (
          <ThemeTile
            key={opt.value}
            option={opt}
            isActive={activeTheme === opt.value}
            onSelect={onSelect}
            onPreview={onPreview}
            onPreviewEnd={onPreviewEnd}
          />
        ))}
      </div>
    </div>
  );
}

function ThemeTile({
  option,
  isActive,
  onSelect,
  onPreview,
  onPreviewEnd,
}: {
  option: ThemeOption;
  isActive: boolean;
  onSelect: (theme: Theme) => void;
  onPreview: (theme: Theme) => void;
  onPreviewEnd: () => void;
}) {
  const Icon = option.Icon;
  return (
    <button
      type="button"
      onClick={() => onSelect(option.value)}
      onMouseEnter={() => onPreview(option.value)}
      onFocus={() => onPreview(option.value)}
      onMouseLeave={onPreviewEnd}
      onBlur={onPreviewEnd}
      aria-pressed={isActive}
      aria-label={`Motyw: ${option.label}`}
      data-testid={option.testId}
      className={cn(
        'group relative flex aspect-square items-end overflow-hidden rounded-xl border border-border-glass p-2 transition-all duration-200',
        'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'hover:-translate-y-0.5 hover:border-primary/40',
        isActive && 'ring-2 ring-primary ring-offset-2 ring-offset-background'
      )}
      style={{
        backgroundImage: `linear-gradient(135deg, ${option.color}cc, ${option.color}55)`,
      }}
    >
      {/* Darkening veil for label contrast on lighter swatches */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent"
      />
      <span className="relative z-[2] flex w-full items-center justify-between gap-1.5">
        <span
          className={cn(
            'truncate font-mono text-[8.5px] font-medium uppercase tracking-[0.08em]',
            option.isDark ? 'text-white/95' : 'text-white/95'
          )}
          style={{ textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}
        >
          {option.label}
        </span>
        {Icon && (
          <Icon
            className="h-3 w-3 flex-shrink-0 text-white/85"
            style={{ filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.45))' }}
          />
        )}
      </span>
      {isActive && (
        <span
          aria-hidden="true"
          className="absolute right-1.5 top-1.5 z-[3] grid h-[18px] w-[18px] place-items-center rounded-full bg-primary text-primary-foreground"
        >
          <Check className="h-2.5 w-2.5" strokeWidth={3} />
        </span>
      )}
    </button>
  );
}
