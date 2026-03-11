import { useState, useEffect } from 'react';
import { Check, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { SettingsCard } from '@/components/settings/SettingsCard';

const BROWSER_SETTINGS_KEY = 'browser-settings';

interface BrowserSettings {
  adblockEnabled: boolean;
}

export function BrowserSection() {
  const { adblockEnabled, setAdblockEnabled } = useSettingsStore();
  const [saved, setSaved] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Load persisted browser settings on mount
  useEffect(() => {
    window.electronAPI?.store?.get<BrowserSettings>(BROWSER_SETTINGS_KEY).then(settings => {
      if (settings) {
        if (typeof settings.adblockEnabled === 'boolean') {
          setAdblockEnabled(settings.adblockEnabled);
        }
      }
      setLoaded(true);
    });
  }, [setAdblockEnabled]);

  const handleSave = async () => {
    const settings: BrowserSettings = {
      adblockEnabled,
    };

    await window.electronAPI?.store?.set(BROWSER_SETTINGS_KEY, settings);

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
        title="Przegladarka"
        subtitle="Ustawienia przegladarki internetowej"
      >
        {/* Adblock */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium">Blokowanie reklam</h3>
            <p className="text-xs text-muted-foreground">
              Blokuj reklamy w wbudowanej przegladarce
            </p>
          </div>
          <Switch checked={adblockEnabled} onCheckedChange={setAdblockEnabled} />
        </div>

        {/* Info about new tab quick access */}
        <div>
          <p className="text-xs text-muted-foreground">
            Strony szybkiego dostepu mozna dostosowac na stronie nowej karty.
          </p>
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
