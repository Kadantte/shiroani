import { useState, useEffect } from 'react';
import { Check, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useBrowserStore } from '@/stores/useBrowserStore';
import { SettingsCard } from '@/components/settings/SettingsCard';

const BROWSER_SETTINGS_KEY = 'browser-settings';

interface BrowserSettings {
  homepage: string;
  adblockEnabled: boolean;
}

export function BrowserSection() {
  const { adblockEnabled, setAdblockEnabled } = useSettingsStore();
  const [homepage, setHomepage] = useState('https://anilist.co');
  const [saved, setSaved] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Load persisted browser settings on mount
  useEffect(() => {
    window.electronAPI?.store?.get<BrowserSettings>(BROWSER_SETTINGS_KEY).then(settings => {
      if (settings) {
        setHomepage(settings.homepage || 'https://anilist.co');
        if (typeof settings.adblockEnabled === 'boolean') {
          setAdblockEnabled(settings.adblockEnabled);
        }
      }
      setLoaded(true);
    });
  }, [setAdblockEnabled]);

  const handleSave = async () => {
    const settings: BrowserSettings = {
      homepage: homepage.trim() || 'https://anilist.co',
      adblockEnabled,
    };

    await window.electronAPI?.store?.set(BROWSER_SETTINGS_KEY, settings);

    // Update the browser store's default URL
    useBrowserStore.getState().setDefaultUrl(settings.homepage);

    // Toggle adblock on the actual browser session
    window.electronAPI?.browser?.toggleAdblock(settings.adblockEnabled);

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

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
          <Switch checked={adblockEnabled} onCheckedChange={setAdblockEnabled} />
        </div>

        <Separator className="bg-border/50" />

        {/* Default homepage */}
        <div>
          <h3 className="text-sm font-medium mb-1">Strona domowa</h3>
          <p className="text-xs text-muted-foreground mb-2">
            Domyślna strona otwierana w nowych kartach
          </p>
          <Input
            value={homepage}
            onChange={e => setHomepage(e.target.value)}
            placeholder="https://anilist.co"
            className="h-8 text-xs bg-background/40 border-border-glass focus:bg-background/60 transition-colors"
          />
        </div>

        <div className="pt-2 border-t border-border/30">
          <Button size="sm" onClick={handleSave}>
            {saved ? <Check className="w-4 h-4" /> : null}
            {saved ? 'Zapisano' : 'Zapisz'}
          </Button>
        </div>
      </SettingsCard>
    </div>
  );
}
