import { Check, Languages } from 'lucide-react';
import { StepLayout } from '../StepLayout';
import { PillTag } from '@/components/ui/pill-tag';

/**
 * Step 01 · Language.
 *
 * Polish is the only locale currently shipped; English is shown as a teaser
 * with a SOON pill. No store wiring — `useSettingsStore.preferredLanguage`
 * controls anime-title language, not the UI locale, so this screen is purely
 * informational at the moment. When a real locale store lands, rewire here.
 */
export function LanguageStep() {
  return (
    <StepLayout
      kanji="始"
      headline={
        <>
          Zacznijmy od <em className="not-italic text-primary italic">najprostszego</em>.
        </>
      }
      description={
        <>
          Cześć, jestem <b className="font-semibold text-foreground">Shiro</b>. Przeprowadzę Cię
          przez sześć krótkich kroków — obiecuję, że to potrwa minutę. Zawsze możesz wrócić do tego
          w ustawieniach.
        </>
      }
      stepMarker={
        <>
          Krok <b className="font-bold text-primary">01 · Start</b> · wybierz język
        </>
      }
      stepIcon={<Languages className="h-5 w-5" />}
      stepTitle="Język interfejsu"
      stepHint="Aplikacja jest dostępna w języku polskim. Kolejne wersje językowe są w drodze."
    >
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {/* Polski — active */}
        <div className="relative flex items-center gap-3.5 overflow-hidden rounded-xl border border-primary/40 bg-primary/10 p-3.5">
          <span
            aria-hidden="true"
            className="h-[26px] w-9 flex-shrink-0 rounded-[4px] border border-border-glass"
            style={{ background: 'linear-gradient(180deg, #fff 50%, #dc143c 50%)' }}
          />
          <div className="min-w-0 flex-1">
            <b className="block text-sm font-semibold text-foreground">Polski</b>
            <small className="text-[11.5px] text-muted-foreground">Jedyna dostępna wersja</small>
          </div>
          <Check className="h-4 w-4 flex-shrink-0 text-primary" />
        </div>

        {/* English — coming soon */}
        <div
          aria-disabled="true"
          className="relative flex items-center gap-3.5 overflow-hidden rounded-xl border border-border-glass bg-foreground/[0.02] p-3.5 opacity-60"
        >
          <span
            aria-hidden="true"
            className="h-[26px] w-9 flex-shrink-0 rounded-[4px] border border-border-glass"
            style={{
              background: 'linear-gradient(180deg, #012169 33%, #fff 33% 66%, #c8102e 66%)',
            }}
          />
          <div className="min-w-0 flex-1">
            <b className="block text-sm font-semibold text-foreground">English</b>
            <small className="text-[11.5px] text-muted-foreground">Wkrótce dostępny</small>
          </div>
          <PillTag variant="accent" className="absolute right-2 top-2">
            Soon
          </PillTag>
        </div>
      </div>

      <p className="mt-auto font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground">
        ✦ Więcej języków pojawi się w kolejnych aktualizacjach
      </p>
    </StepLayout>
  );
}
