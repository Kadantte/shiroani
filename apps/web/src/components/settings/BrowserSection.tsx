import { useCallback } from 'react';
import { Check, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useBrowserStore } from '@/stores/useBrowserStore';
import { useElectronSettings } from '@/hooks/useElectronSettings';
import { SettingsCard } from '@/components/settings/SettingsCard';

const BROWSER_SETTINGS_KEY = 'browser-settings';

interface BrowserSettings {
  adblockEnabled: boolean;
}

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
        icon={Globe}
        title="Przeglądarka"
        subtitle="Ustawienia przeglądarki internetowej"
      >
        {/* Adblock */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium">Blokowanie reklam</h3>
            <p className="text-xs text-muted-foreground">
              Blokuj reklamy w wbudowanej przeglądarce
            </p>
          </div>
          <Switch
            checked={data.adblockEnabled}
            onCheckedChange={v => update({ adblockEnabled: v })}
          />
        </div>

        {/* Info about new tab quick access */}
        <div>
          <p className="text-xs text-muted-foreground">
            Strony szybkiego dostępu można dostosować na stronie nowej karty.
          </p>
        </div>

        <div className="pt-2 border-t border-border/30">
          <Button size="sm" onClick={save}>
            {saved ? <Check className="w-4 h-4" /> : null}
            {saved ? 'Zapisano' : 'Zapisz'}
          </Button>
        </div>
      </SettingsCard>
    </div>
  );
}
