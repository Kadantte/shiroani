import { Image, Trash2 } from 'lucide-react';
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
    <SettingsCard
      icon={Image}
      title="Tło aplikacji"
      subtitle="Ustaw własny obrazek lub GIF jako tło interfejsu."
    >
      {/* 16/9 preview — uses the image if set, otherwise a default sakura gradient */}
      <div className="relative overflow-hidden rounded-lg border border-border-glass aspect-[16/9]">
        {customBackground ? (
          <img
            src={customBackground}
            alt="Podgląd tła"
            className="w-full h-full object-cover"
            draggable={false}
          />
        ) : (
          <div
            className="w-full h-full"
            style={{
              background:
                'radial-gradient(ellipse 50% 45% at 30% 30%, oklch(0.72 0.15 355/0.65), transparent 60%), radial-gradient(ellipse 50% 40% at 75% 70%, oklch(0.4 0.15 280/0.75), transparent 60%), linear-gradient(135deg, oklch(0.25 0.08 340), oklch(0.18 0.06 280))',
            }}
          />
        )}
        <div className="absolute bottom-2.5 left-3 font-serif text-[13px] font-bold text-white drop-shadow">
          {customBackground ? 'Własne tło' : 'Domyślne'}
          <span className="block font-mono text-[9px] font-normal tracking-[0.16em] uppercase text-white/75 mt-0.5">
            {customBackground ? 'USTAWIONE' : 'SAKURA TWILIGHT'}
          </span>
        </div>
      </div>

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
            className="border border-border-glass"
            onClick={removeBackground}
          >
            <Trash2 className="w-4 h-4" />
            Usuń tło
          </Button>
        )}
      </div>

      {/* Opacity & blur sliders - only shown when a background is set */}
      {customBackground && (
        <div className="space-y-4 pt-1">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label id="bg-opacity-label" className="text-[13px] font-semibold text-foreground">
                Przezroczystość
              </label>
              <span className="font-mono text-[11px] font-semibold text-primary tabular-nums">
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
              <label id="bg-blur-label" className="text-[13px] font-semibold text-foreground">
                Rozmycie
              </label>
              <span className="font-mono text-[11px] font-semibold text-primary tabular-nums">
                {backgroundBlur}px
              </span>
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
