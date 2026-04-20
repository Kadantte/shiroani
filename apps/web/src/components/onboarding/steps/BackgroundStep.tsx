import { Image as ImageIcon, RotateCcw, Sparkles } from 'lucide-react';
import { StepLayout } from '../StepLayout';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useBackgroundStore } from '@/stores/useBackgroundStore';

/**
 * Step 03 · App background.
 *
 * Preview + file picker + opacity/blur sliders. Wires into the existing
 * BackgroundStore which handles the Electron file dialog, disk persistence
 * and applying CSS custom properties to the document.
 */
export function BackgroundStep() {
  const customBackground = useBackgroundStore(s => s.customBackground);
  const opacity = useBackgroundStore(s => s.backgroundOpacity);
  const blur = useBackgroundStore(s => s.backgroundBlur);
  const pickBackground = useBackgroundStore(s => s.pickBackground);
  const removeBackground = useBackgroundStore(s => s.removeBackground);
  const setBackgroundOpacity = useBackgroundStore(s => s.setBackgroundOpacity);
  const setBackgroundBlur = useBackgroundStore(s => s.setBackgroundBlur);

  const opacityPct = Math.round(opacity * 100);
  const blurPct = Math.round((blur / 20) * 100);

  return (
    <StepLayout
      kanji="景"
      headline={
        <>
          Ustaw <em className="not-italic text-primary italic">atmosferę</em> — twoje ulubione
          key-arty w tle.
        </>
      }
      description={
        <>
          Wrzuć obraz lub GIF i my zrobimy z niego rozmyte tło dla biblioteki i harmonogramu. Możesz
          też zostawić domyślne — <b className="font-semibold text-foreground">bez tła</b>.
        </>
      }
      stepMarker={
        <>
          Krok <b className="font-bold text-primary">04 · Atmosfera</b> · tło aplikacji
        </>
      }
      stepIcon={<Sparkles className="h-5 w-5" />}
      stepTitle="Tapeta w tle"
    >
      <div className="overflow-hidden rounded-2xl border border-border-glass bg-foreground/[0.02]">
        {/* Preview */}
        {customBackground ? (
          <div
            className="relative flex aspect-[16/9] items-end p-3"
            style={{
              backgroundImage: `url(${customBackground})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            <span className="pointer-events-none absolute inset-0 bg-black/20" aria-hidden="true" />
            <span className="relative z-[2] font-serif text-base font-bold text-white drop-shadow-lg">
              Twoje tło
              <small className="block font-mono text-[9px] font-medium uppercase tracking-[0.2em] text-white/70">
                Niestandardowe
              </small>
            </span>
          </div>
        ) : (
          <div
            className="relative grid aspect-[16/9] place-items-center"
            style={{
              background:
                'radial-gradient(ellipse 50% 45% at 30% 30%, oklch(0.72 0.15 355 / 0.5), transparent 60%), radial-gradient(ellipse 50% 40% at 75% 70%, oklch(0.4 0.15 280 / 0.6), transparent 60%), linear-gradient(135deg, oklch(0.25 0.08 340), oklch(0.18 0.06 280))',
            }}
          >
            <span className="font-serif text-base font-bold text-white/95 drop-shadow-lg">
              Brak tła
              <small className="block text-center font-mono text-[9px] font-medium uppercase tracking-[0.2em] text-white/60">
                Domyślne
              </small>
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 border-t border-border-glass bg-background/60 p-3">
          <Button variant="outline" size="sm" className="flex-1" onClick={pickBackground}>
            <ImageIcon className="h-4 w-4" />
            Wybierz obraz
          </Button>
          {customBackground && (
            <Button variant="ghost" size="sm" onClick={removeBackground}>
              <RotateCcw className="h-4 w-4" />
              Resetuj
            </Button>
          )}
        </div>
      </div>

      {/* Sliders */}
      <div className="flex flex-col gap-2.5">
        <SliderRow
          label="Rozmycie"
          value={blur}
          max={20}
          step={1}
          display={`${blurPct}%`}
          onChange={setBackgroundBlur}
          disabled={!customBackground}
        />
        <SliderRow
          label="Przyciemnienie"
          value={opacity}
          max={1}
          step={0.01}
          display={`${opacityPct}%`}
          onChange={setBackgroundOpacity}
          disabled={!customBackground}
        />
      </div>
    </StepLayout>
  );
}

function SliderRow({
  label,
  value,
  max,
  step,
  display,
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  max: number;
  step: number;
  display: string;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border-glass bg-foreground/[0.02] px-3 py-2.5">
      <b className="min-w-[92px] text-xs font-semibold text-foreground">{label}</b>
      <Slider
        value={[value]}
        onValueChange={([next]) => onChange(next ?? 0)}
        min={0}
        max={max}
        step={step}
        disabled={disabled}
        aria-label={label}
        className="flex-1"
      />
      <span className="min-w-[36px] text-right font-mono text-[10.5px] font-semibold text-primary">
        {display}
      </span>
    </div>
  );
}
