import { useCallback } from 'react';
import { Shield, Check, Plus } from 'lucide-react';
import { StepLayout } from '../StepLayout';
import { Switch } from '@/components/ui/switch';
import { IS_ELECTRON } from '@/lib/platform';
import { useBrowserStore } from '@/stores/useBrowserStore';

/**
 * Step 06 · Ad blocking (browser).
 *
 * Toggles the EasyList + EasyPrivacy adblock in the built-in browser session.
 * Mirrors the old FinishStep wiring — the "finish" summary is now its own
 * screen (`SummaryStep`).
 */
export function AdblockStep() {
  const adblockEnabled = useBrowserStore(s => s.adblockEnabled);
  const setAdblockEnabled = useBrowserStore(s => s.setAdblockEnabled);

  const handleAdblock = useCallback(
    (value: boolean) => {
      setAdblockEnabled(value);
      window.electronAPI?.store?.set('browser-settings', { adblockEnabled: value });
      window.electronAPI?.browser?.toggleAdblock(value);
    },
    [setAdblockEnabled]
  );

  return (
    <StepLayout
      kanji="盾"
      headline={
        <>
          Ostatnia rzecz — <em className="not-italic text-primary italic">czysty</em> odcinek bez
          reklam.
        </>
      }
      description={
        <>
          Wbudowana przeglądarka używa{' '}
          <b className="font-semibold text-foreground">EasyList + EasyPrivacy</b>, żeby zablokować
          reklamy i trackery na stronach streamingowych. Możesz to wyłączyć na konkretnych domenach.
        </>
      }
      stepMarker={
        <>
          Krok <b className="font-bold text-primary">06 · Finisz</b> · blokowanie reklam
        </>
      }
      stepIcon={<Shield className="h-5 w-5" />}
      stepTitle="Blokowanie reklam"
    >
      <div className="flex flex-col gap-3 rounded-2xl border border-border-glass bg-foreground/[0.02] p-4">
        {!IS_ELECTRON && (
          <p className="text-xs text-amber-500">Dostępne tylko w wersji desktopowej</p>
        )}

        <div className="flex items-start gap-3 border-b border-border-glass pb-3">
          <span
            className="grid h-[34px] w-[34px] flex-shrink-0 place-items-center rounded-lg border border-primary/30 bg-primary/15 text-primary"
            aria-hidden="true"
          >
            <Shield className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <b className="block text-[13px] font-semibold text-foreground" id="onb-adblock-label">
              Blokowanie reklam
            </b>
            <small className="text-[11.5px] text-muted-foreground" id="onb-adblock-desc">
              EasyList + EasyPrivacy · 98 200 reguł
            </small>
          </div>
          <Switch
            aria-labelledby="onb-adblock-label"
            aria-describedby="onb-adblock-desc"
            checked={adblockEnabled}
            onCheckedChange={handleAdblock}
            disabled={!IS_ELECTRON}
          />
        </div>

        <ul className="flex flex-col font-mono text-[10.5px]" aria-label="Blokowane elementy">
          <BlockedRow label="Reklamy graficzne (banner / popup)" />
          <BlockedRow label="Trackery analityczne" />
          <BlockedRow label="Reklamy w odtwarzaczu wideo" />
          <BlockedRow label="Cookie walls" />
          <BlockedRow label="Whitelisty własnych domen" variant="add" />
        </ul>
      </div>

      <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground">
        ✦ Listę wyjątków zbudujesz potem w ustawieniach przeglądarki
      </p>
    </StepLayout>
  );
}

function BlockedRow({ label, variant = 'check' }: { label: string; variant?: 'check' | 'add' }) {
  return (
    <li className="flex items-center justify-between border-b border-border-glass/60 py-1.5 text-[oklch(0.72_0.03_300)] last:border-b-0">
      <span>{label}</span>
      <span className="font-bold text-primary">
        {variant === 'check' ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
      </span>
    </li>
  );
}
