import { UserRound } from 'lucide-react';
import { DISPLAY_NAME_MAX_LENGTH } from '@shiroani/shared';
import { StepLayout } from '../StepLayout';
import { Input } from '@/components/ui/input';
import { useSettingsStore } from '@/stores/useSettingsStore';

export function NameStep() {
  const displayName = useSettingsStore(s => s.displayName);
  const setDisplayName = useSettingsStore(s => s.setDisplayName);

  return (
    <StepLayout
      kanji="名"
      headline={
        <>
          Jak mam się do Ciebie <em className="not-italic text-primary italic">zwracać</em>?
        </>
      }
      description={
        <>
          Użyję tego imienia w powitaniu na nowej karcie i wszędzie tam, gdzie aplikacja zwraca się
          do ciebie. Możesz pominąć ten krok, zmienisz to później w ustawieniach.
        </>
      }
      stepMarker={
        <>
          Krok <b className="font-bold text-primary">02 · Imię</b> · personalizacja
        </>
      }
      stepIcon={<UserRound className="h-5 w-5" />}
      stepTitle="Twoje imię"
      stepHint="Pseudonim, zdrobnienie, co ci pasuje. Imię zostaje tylko na twoim urządzeniu."
    >
      <div className="flex flex-col gap-2">
        <Input
          value={displayName}
          onChange={e => setDisplayName(e.target.value)}
          placeholder="np. Aleks"
          maxLength={DISPLAY_NAME_MAX_LENGTH}
          aria-label="Twoje imię"
          className="h-10 text-[14px]"
          autoFocus
        />
        <div className="flex items-center justify-between font-mono text-[10.5px] uppercase tracking-[0.16em] text-muted-foreground/70">
          <span>max {DISPLAY_NAME_MAX_LENGTH} znaków</span>
          <span>
            {displayName.length} / {DISPLAY_NAME_MAX_LENGTH}
          </span>
        </div>
      </div>

      <p className="mt-auto font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground">
        ✦ Jeśli zostawisz puste i podłączysz AniList, Shiro użyje twojego nicku stamtąd
      </p>
    </StepLayout>
  );
}
