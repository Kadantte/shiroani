import { useMemo } from 'react';
import {
  Languages,
  Palette,
  Sparkles,
  LayoutGrid,
  MessageCircle,
  Shield,
  PartyPopper,
} from 'lucide-react';
import { StepLayout } from '../StepLayout';
import { getThemeOption } from '@/lib/theme';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useBackgroundStore } from '@/stores/useBackgroundStore';
import { useDockStore } from '@/stores/useDockStore';
import { useBrowserStore } from '@/stores/useBrowserStore';
import { useCustomThemeStore } from '@/stores/useCustomThemeStore';

/**
 * Step 07 · Summary.
 *
 * Pure confirmation screen — reads every store the wizard touched and echoes
 * the user's selections back. No mutations, no API calls. The "Zaczynamy!"
 * CTA lives in the wizard chrome (wired to `onComplete`).
 */
export function SummaryStep() {
  const theme = useSettingsStore(s => s.theme);
  const customThemes = useCustomThemeStore(s => s.customThemes);
  const customBackground = useBackgroundStore(s => s.customBackground);
  const backgroundBlur = useBackgroundStore(s => s.backgroundBlur);
  const edge = useDockStore(s => s.edge);
  const autoHide = useDockStore(s => s.autoHide);
  const adblockEnabled = useBrowserStore(s => s.adblockEnabled);

  const themeLabel = useMemo(() => {
    const opt = getThemeOption(theme, customThemes);
    return opt?.label ?? theme;
  }, [theme, customThemes]);

  const backgroundLabel = customBackground
    ? `Niestandardowe · ${Math.round((backgroundBlur / 20) * 100)}% blur`
    : 'Bez tła';

  const dockLabel = useMemo(() => {
    const edgeName =
      edge === 'bottom' ? 'Dół' : edge === 'left' ? 'Lewo' : edge === 'right' ? 'Prawo' : 'Góra';
    return autoHide ? `${edgeName} · auto-hide` : edgeName;
  }, [edge, autoHide]);

  return (
    <StepLayout
      kanji="完"
      headline={
        <>
          Wszystko <em className="not-italic text-primary italic">zapięte</em> — czas oglądać.
        </>
      }
      description={
        <>
          Siedem ustawień za nami. Twoja konfiguracja jest zapisana lokalnie.{' '}
          <b className="font-semibold text-foreground">Shiro-chan</b> będzie na dole ekranu, gdybyś
          jej potrzebowała.
        </>
      }
      stepMarker={
        <>
          Podsumowanie · <b className="font-bold text-primary">twoja konfiguracja</b>
        </>
      }
      stepTitle="Wszystko gotowe!"
      stepIcon={
        <span
          className="grid h-10 w-10 place-items-center rounded-full border border-primary/35 bg-primary/15 text-primary animate-[splash-bounce-in_0.5s_cubic-bezier(0.34,1.56,0.64,1)_both]"
          aria-hidden="true"
        >
          <PartyPopper className="h-5 w-5" />
        </span>
      }
    >
      <p className="max-w-[34ch] text-[13px] leading-relaxed text-muted-foreground">
        Poniżej Twoje wybory. Wszystko możesz zmienić w ustawieniach w dowolnym momencie.
      </p>

      <div className="flex flex-col gap-2">
        <SummaryRow icon={<Languages className="h-4 w-4" />} label="Język" value="PL" />
        <SummaryRow icon={<Palette className="h-4 w-4" />} label="Motyw" value={themeLabel} />
        <SummaryRow icon={<Sparkles className="h-4 w-4" />} label="Tło" value={backgroundLabel} />
        <SummaryRow icon={<LayoutGrid className="h-4 w-4" />} label="Dock" value={dockLabel} />
        <SummaryRow
          icon={<MessageCircle className="h-4 w-4" />}
          label="Discord RPC"
          value="ON"
          highlight
        />
        <SummaryRow
          icon={<Shield className="h-4 w-4" />}
          label="Adblock"
          value={adblockEnabled ? 'ON' : 'OFF'}
          highlight={adblockEnabled}
        />
      </div>
    </StepLayout>
  );
}

function SummaryRow({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border-glass bg-foreground/[0.02] px-3 py-2.5 text-xs">
      <span className="flex items-center gap-2 text-muted-foreground">
        <span className="text-primary">{icon}</span>
        {label}
      </span>
      <span
        className={
          'font-mono text-[10.5px] font-semibold tracking-[0.05em] ' +
          (highlight ? 'text-primary' : 'text-foreground')
        }
      >
        {value}
      </span>
    </div>
  );
}
