import { useCallback, useState, type KeyboardEvent } from 'react';
import { Globe, Shield, X, AppWindow, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PillTag } from '@/components/ui/pill-tag';
import { useBrowserStore } from '@/stores/useBrowserStore';
import { useQuickAccessStore } from '@/stores/useQuickAccessStore';
import { SettingsCard, SettingsToggleRow } from '@/components/settings/SettingsCard';
import { cn } from '@/lib/utils';

const BLOCKED_CATEGORIES = [
  'Reklamy graficzne / pop-up',
  'Trackery analityczne',
  'Reklamy w odtwarzaczu wideo',
];

export function BrowserSection() {
  const adblockEnabled = useBrowserStore(state => state.adblockEnabled);
  const setAdblockEnabled = useBrowserStore(state => state.setAdblockEnabled);
  const popupBlockEnabled = useBrowserStore(state => state.popupBlockEnabled);
  const setPopupBlockEnabled = useBrowserStore(state => state.setPopupBlockEnabled);
  const adblockWhitelist = useBrowserStore(state => state.adblockWhitelist);
  const addAdblockDomain = useBrowserStore(state => state.addAdblockDomain);
  const removeAdblockDomain = useBrowserStore(state => state.removeAdblockDomain);
  const restoreTabsOnStartup = useBrowserStore(state => state.restoreTabsOnStartup);
  const setRestoreTabsOnStartup = useBrowserStore(state => state.setRestoreTabsOnStartup);
  const trackFrequentSites = useQuickAccessStore(state => state.trackFrequentSites);
  const setTrackFrequentSites = useQuickAccessStore(state => state.setTrackFrequentSites);

  const [whitelistInput, setWhitelistInput] = useState('');

  const handleAddWhitelist = useCallback(() => {
    const value = whitelistInput.trim();
    if (!value) return;
    addAdblockDomain(value);
    setWhitelistInput('');
  }, [whitelistInput, addAdblockDomain]);

  const handleWhitelistKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAddWhitelist();
      }
    },
    [handleAddWhitelist]
  );

  return (
    <div className="space-y-4">
      <SettingsCard
        icon={Shield}
        title="Blokowanie reklam"
        subtitle="Wbudowana ochrona prywatności w przeglądarce ShiroAni"
      >
        <SettingsToggleRow
          id="browser-adblock-label"
          title="Blokowanie reklam"
          description="Blokuj reklamy w wbudowanej przeglądarce (EasyList + EasyPrivacy)"
          checked={adblockEnabled}
          onCheckedChange={setAdblockEnabled}
        />

        {/* Blocked categories status chips */}
        <div className="flex flex-col gap-1.5">
          {BLOCKED_CATEGORIES.map(category => (
            <div
              key={category}
              className="flex items-center justify-between rounded-lg border border-border-glass/70 bg-background/30 px-3 py-2 text-[12px]"
            >
              <span className="text-muted-foreground">{category}</span>
              <PillTag variant={adblockEnabled ? 'green' : 'muted'}>
                {adblockEnabled ? 'Blokowane' : 'Wyłączone'}
              </PillTag>
            </div>
          ))}
        </div>

        {/* Whitelist subsection */}
        <div className="border-t border-border-glass/50 pt-3.5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-muted-foreground">
              Wyjątki
            </span>
            <span className="font-mono text-[10px] text-muted-foreground/70 tabular-nums">
              {adblockWhitelist.length} / 500
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Input
              value={whitelistInput}
              onChange={e => setWhitelistInput(e.target.value)}
              onKeyDown={handleWhitelistKeyDown}
              placeholder="np. example.com"
              aria-label="Dodaj domenę do listy wyjątków"
              maxLength={253}
              className="flex-1 font-mono text-[12px]"
            />
            <Button size="sm" onClick={handleAddWhitelist} disabled={!whitelistInput.trim()}>
              Dodaj
            </Button>
          </div>

          {adblockWhitelist.length === 0 ? (
            <p className="font-mono text-[11px] text-muted-foreground/80 leading-snug">
              Brak wyjątków — reklamy są blokowane na wszystkich stronach.
            </p>
          ) : (
            <ul className="flex flex-wrap gap-1.5" aria-label="Lista zwolnionych z blokady domen">
              {adblockWhitelist.map(host => (
                <li key={host}>
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full pl-2.5 pr-1 py-[3px]',
                      'bg-foreground/[0.05] border border-border-glass',
                      'font-mono text-[11px] text-foreground'
                    )}
                  >
                    <span className="leading-none">{host}</span>
                    <button
                      type="button"
                      onClick={() => removeAdblockDomain(host)}
                      aria-label={`Usuń ${host} z listy wyjątków`}
                      className={cn(
                        'grid place-items-center size-[18px] rounded-full',
                        'text-muted-foreground hover:text-foreground hover:bg-foreground/[0.08]',
                        'transition-colors cursor-pointer'
                      )}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}

          <p className="text-[11.5px] text-muted-foreground/85 leading-relaxed">
            Adblock nie będzie aktywny dla dodanych tu domen. Filtry kosmetyczne pozostają aktywne.
          </p>
        </div>
      </SettingsCard>

      <SettingsCard
        icon={AppWindow}
        title="Wyskakujące okna"
        subtitle="Kontrola nad popup-ami otwieranymi przez strony"
        tone="gold"
      >
        <SettingsToggleRow
          id="browser-popup-block-label"
          title="Blokuj wyskakujące okna"
          description="Okna OAuth (Google, Discord) zawsze są dozwolone."
          checked={popupBlockEnabled}
          onCheckedChange={setPopupBlockEnabled}
        />
      </SettingsCard>

      <SettingsCard
        icon={Copy}
        title="Zachowanie kart"
        subtitle="Zarządzanie kartami i historią przeglądania"
        tone="blue"
      >
        <SettingsToggleRow
          id="browser-restore-tabs-label"
          title="Przywróć karty po restarcie"
          description="Zapamiętuje otwarte karty między sesjami."
          checked={restoreTabsOnStartup}
          onCheckedChange={setRestoreTabsOnStartup}
        />

        <SettingsToggleRow
          id="browser-track-frequent-label"
          title="Zapisz historię przeglądania"
          description="Lokalna historia — nie jest nigdzie wysyłana."
          checked={trackFrequentSites}
          onCheckedChange={setTrackFrequentSites}
        />
      </SettingsCard>

      <SettingsCard
        icon={Globe}
        title="Przeglądarka internetowa"
        subtitle="Ogólne zachowanie wbudowanej przeglądarki"
        tone="muted"
      >
        <p className="text-[12px] text-muted-foreground/85 leading-relaxed">
          ShiroAni używa wbudowanego Chromium. Dane przeglądania zapisywane są lokalnie — nigdy nie
          są wysyłane poza Twoje urządzenie.
        </p>
      </SettingsCard>
    </div>
  );
}
