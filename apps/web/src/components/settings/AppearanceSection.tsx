import { Image, Palette, RotateCcw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useBackgroundStore } from '@/stores/useBackgroundStore';
import {
  animeDarkThemes,
  animeLightThemes,
  classicDarkThemes,
  classicLightThemes,
} from '@/lib/theme';
import { ThemeSwatch } from '@/components/settings/ThemeSwatch';

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

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium mb-1">Motyw</h3>
        <p className="text-xs text-muted-foreground mb-3">Wybierz motyw kolorystyczny aplikacji</p>

        {/* Anime section */}
        <div className="mb-4">
          <h4 className="text-xs font-medium text-primary mb-3 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3" />
            Anime
          </h4>

          {/* Anime dark */}
          <div className="mb-3">
            <p className="text-2xs text-muted-foreground mb-1.5 ml-0.5">Ciemne</p>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(70px,1fr))] gap-1">
              {animeDarkThemes.map(opt => (
                <ThemeSwatch
                  key={opt.value}
                  option={opt}
                  isActive={theme === opt.value}
                  onSelect={setTheme}
                  onPreview={setPreviewTheme}
                  onPreviewEnd={() => setPreviewTheme(null)}
                />
              ))}
            </div>
          </div>

          {/* Anime light */}
          <div>
            <p className="text-2xs text-muted-foreground mb-1.5 ml-0.5">Jasne</p>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(70px,1fr))] gap-1">
              {animeLightThemes.map(opt => (
                <ThemeSwatch
                  key={opt.value}
                  option={opt}
                  isActive={theme === opt.value}
                  onSelect={setTheme}
                  onPreview={setPreviewTheme}
                  onPreviewEnd={() => setPreviewTheme(null)}
                />
              ))}
            </div>
          </div>
        </div>

        <Separator className="my-3" />

        {/* Classic section */}
        <div>
          <h4 className="text-xs font-medium text-muted-foreground mb-3 flex items-center gap-1.5">
            <Palette className="w-3 h-3" />
            Klasyczne
          </h4>

          {/* Classic dark */}
          <div className="mb-3">
            <p className="text-2xs text-muted-foreground mb-1.5 ml-0.5">Ciemne</p>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(70px,1fr))] gap-1">
              {classicDarkThemes.map(opt => (
                <ThemeSwatch
                  key={opt.value}
                  option={opt}
                  isActive={theme === opt.value}
                  onSelect={setTheme}
                  onPreview={setPreviewTheme}
                  onPreviewEnd={() => setPreviewTheme(null)}
                />
              ))}
            </div>
          </div>

          {/* Classic light */}
          <div>
            <p className="text-2xs text-muted-foreground mb-1.5 ml-0.5">Jasne</p>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(70px,1fr))] gap-1">
              {classicLightThemes.map(opt => (
                <ThemeSwatch
                  key={opt.value}
                  option={opt}
                  isActive={theme === opt.value}
                  onSelect={setTheme}
                  onPreview={setPreviewTheme}
                  onPreviewEnd={() => setPreviewTheme(null)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* Custom background */}
      <div>
        <h3 className="text-sm font-medium mb-1">Tlo</h3>
        <p className="text-xs text-muted-foreground mb-3">
          Ustaw wlasne tlo aplikacji (obraz lub GIF)
        </p>

        {customBackground && (
          <div className="mb-3 rounded-lg overflow-hidden border border-border h-24">
            <img src={customBackground} alt="Podglad tla" className="w-full h-full object-cover" />
          </div>
        )}

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={pickBackground}>
            <Image className="w-4 h-4" />
            Wybierz obraz
          </Button>
          {customBackground && (
            <Button variant="ghost" size="sm" onClick={removeBackground}>
              <RotateCcw className="w-4 h-4" />
              Usun tlo
            </Button>
          )}
        </div>

        {/* Opacity & blur sliders - only shown when a background is set */}
        {customBackground && (
          <div className="mt-4 space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-muted-foreground">Przezroczystosc</label>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {Math.round(backgroundOpacity * 100)}%
                </span>
              </div>
              <Slider
                value={[backgroundOpacity]}
                onValueChange={([v]) => setBackgroundOpacity(v)}
                min={0.02}
                max={0.5}
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
      </div>
    </div>
  );
}
