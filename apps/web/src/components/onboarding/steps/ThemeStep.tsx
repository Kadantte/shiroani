import { useCallback } from 'react';
import { Moon, Palette, Sun } from 'lucide-react';
import { StepLayout } from '../StepLayout';
import { darkThemes, lightThemes } from '@/lib/theme';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { ThemeGrid } from '@/components/shared/theme/ThemeGrid';

/**
 * Step 02 · Theme picker.
 *
 * Renders dark + light groups using the shared ThemeGrid primitive. Hover
 * previews the theme live via `setPreviewTheme`; click commits via `setTheme`.
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
          Krok <b className="font-bold text-primary">03 · Wygląd</b> · paleta
        </>
      }
      stepIcon={<Palette className="h-5 w-5" />}
      stepTitle="Motywy"
    >
      <ThemeGrid
        themes={darkThemes}
        label="Ciemne"
        icon={Moon}
        activeTheme={theme}
        onSelect={setTheme}
        onPreview={setPreviewTheme}
        onPreviewEnd={clearPreview}
      />
      <ThemeGrid
        themes={lightThemes}
        label="Jasne"
        icon={Sun}
        activeTheme={theme}
        onSelect={setTheme}
        onPreview={setPreviewTheme}
        onPreviewEnd={clearPreview}
      />
    </StepLayout>
  );
}
