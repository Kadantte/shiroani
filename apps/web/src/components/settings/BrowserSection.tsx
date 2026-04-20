import { useCallback } from 'react';
import { Check, Globe, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { PillTag } from '@/components/ui/pill-tag';
import { useBrowserStore } from '@/stores/useBrowserStore';
import { useElectronSettings } from '@/hooks/useElectronSettings';
import { SettingsCard, SettingsRow, SettingsRowLabel } from '@/components/settings/SettingsCard';

const BROWSER_SETTINGS_KEY = 'browser-settings';

interface BrowserSettings {
  adblockEnabled: boolean;
}

const BLOCKED_CATEGORIES = [
  'Reklamy graficzne / pop-up',
  'Trackery analityczne',
  'Reklamy w odtwarzaczu wideo',
];

export function BrowserSection() {
  const setStoreAdblock = useBrowserStore(state => state.setAdblockEnabled);

  const { data, update, loaded, saved, save } = useElectronSettings<BrowserSettings>({
    defaultValue: { adblockEnabled: true },
    load: useCallback(async () => {
      const settings = await window.electronAPI?.store?.get<BrowserSettings>(BROWSER_SETTINGS_KEY);
      if (settings && typeof settings.adblockEnabled === 'boolean') {
        setStoreAdblock(settings.adblockEnabled);
        return settings;
      }
      return undefined;
    }, [setStoreAdblock]),
    save: useCallback(
      async (d: BrowserSettings) => {
        await window.electronAPI?.store?.set(BROWSER_SETTINGS_KEY, d);
        // Sync to browser store and toggle adblock on the actual browser session
        setStoreAdblock(d.adblockEnabled);
        window.electronAPI?.browser?.toggleAdblock(d.adblockEnabled);
      },
      [setStoreAdblock]
    ),
  });

  if (!loaded) return null;

  return (
    <div className="space-y-4">
      <SettingsCard
        icon={Shield}
        title="Blokowanie reklam"
        subtitle="Wbudowana ochrona prywatności w przeglądarce ShiroAni"
      >
        <SettingsRow>
          <SettingsRowLabel
            id="browser-adblock-label"
            title="Blokowanie reklam"
            description="Blokuj reklamy w wbudowanej przeglądarce (EasyList + EasyPrivacy)"
          />
          <Switch
            aria-labelledby="browser-adblock-label"
            checked={data.adblockEnabled}
            onCheckedChange={v => update({ adblockEnabled: v })}
          />
        </SettingsRow>

        {/* Blocked categories status chips */}
        <div className="flex flex-col gap-1.5">
          {BLOCKED_CATEGORIES.map(category => (
            <div
              key={category}
              className="flex items-center justify-between rounded-lg border border-border-glass/70 bg-background/30 px-3 py-2 text-[12px]"
            >
              <span className="text-muted-foreground">{category}</span>
              <PillTag variant={data.adblockEnabled ? 'green' : 'muted'}>
                {data.adblockEnabled ? 'Blokowane' : 'Wyłączone'}
              </PillTag>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3 pt-1">
          <Button size="sm" onClick={save}>
            {saved ? <Check className="w-4 h-4" /> : null}
            {saved ? 'Zapisano' : 'Zapisz'}
          </Button>
          <p className="font-mono text-[10.5px] text-muted-foreground/80 leading-snug">
            Strony szybkiego dostępu można dostosować na stronie nowej karty.
          </p>
        </div>
      </SettingsCard>

      <SettingsCard
        icon={Globe}
        title="Przeglądarka internetowa"
        subtitle="Ogólne zachowanie wbudowanej przeglądarki"
        tone="blue"
      >
        <p className="text-[12px] text-muted-foreground/85 leading-relaxed">
          ShiroAni używa wbudowanego Chromium. Dane przeglądania zapisywane są lokalnie — nigdy nie
          są wysyłane poza Twoje urządzenie.
        </p>
      </SettingsCard>
    </div>
  );
}
