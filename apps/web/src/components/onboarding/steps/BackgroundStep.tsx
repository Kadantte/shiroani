import { Sparkles } from 'lucide-react';
import { StepLayout } from '../StepLayout';
import { BackgroundPanel } from '@/components/shared/BackgroundPanel';

/**
 * Step 03 · App background.
 *
 * Wraps the shared BackgroundPanel in the onboarding chrome. The panel itself
 * handles the preview, file picker and opacity/blur sliders; it wires into the
 * BackgroundStore which manages the Electron file dialog, disk persistence and
 * applying CSS custom properties to the document.
 */
export function BackgroundStep() {
  return (
    <StepLayout
      kanji="景"
      headline={
        <>
          Ustaw <em className="not-italic text-primary italic">atmosferę</em>: twoje ulubione
          key-arty w tle.
        </>
      }
      description={
        <>
          Wrzuć obraz lub GIF, zrobimy z niego rozmyte tło dla biblioteki i harmonogramu. Możesz też
          zostać przy domyślnym: <b className="font-semibold text-foreground">bez tła</b>.
        </>
      }
      stepMarker={
        <>
          Krok <b className="font-bold text-primary">04 · Atmosfera</b> · tło aplikacji
        </>
      }
      stepIcon={<Sparkles className="h-5 w-5" />}
      stepTitle="Tło aplikacji"
    >
      <BackgroundPanel variant="onboarding" />
    </StepLayout>
  );
}
