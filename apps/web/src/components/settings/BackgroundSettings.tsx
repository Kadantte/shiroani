import { Image, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useBackgroundStore } from '@/stores/useBackgroundStore';
import { SettingsCard } from '@/components/settings/SettingsCard';

export function BackgroundSettings() {
  const customBackground = useBackgroundStore(s => s.customBackground);
  const backgroundOpacity = useBackgroundStore(s => s.backgroundOpacity);
  const backgroundBlur = useBackgroundStore(s => s.backgroundBlur);
  const pickBackground = useBackgroundStore(s => s.pickBackground);
  const removeBackground = useBackgroundStore(s => s.removeBackground);
  const setBackgroundOpacity = useBackgroundStore(s => s.setBackgroundOpacity);
  const setBackgroundBlur = useBackgroundStore(s => s.setBackgroundBlur);

  return (
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
              <label id="bg-opacity-label" className="text-xs font-medium text-muted-foreground">
                Przezroczystość
              </label>
              <span className="text-xs text-muted-foreground tabular-nums">
                {Math.round(backgroundOpacity * 100)}%
              </span>
            </div>
            <Slider
              aria-labelledby="bg-opacity-label"
              value={[backgroundOpacity]}
              onValueChange={([v]) => setBackgroundOpacity(v)}
              min={0.02}
              max={1}
              step={0.01}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label id="bg-blur-label" className="text-xs font-medium text-muted-foreground">
                Rozmycie
              </label>
              <span className="text-xs text-muted-foreground tabular-nums">{backgroundBlur}px</span>
            </div>
            <Slider
              aria-labelledby="bg-blur-label"
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
  );
}
