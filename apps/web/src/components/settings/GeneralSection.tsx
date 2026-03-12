import { useState, useEffect } from 'react';
import { Settings, Power } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { SettingsCard } from '@/components/settings/SettingsCard';

export function GeneralSection() {
  const [autoLaunch, setAutoLaunch] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    window.electronAPI?.app?.getAutoLaunch().then(enabled => {
      if (!mounted) return;
      setAutoLaunch(enabled);
      setLoaded(true);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const handleAutoLaunchChange = async (enabled: boolean) => {
    setAutoLaunch(enabled);
    const actual = await window.electronAPI?.app?.setAutoLaunch(enabled);
    if (actual !== undefined) {
      setAutoLaunch(actual);
    }
  };

  if (!loaded) return null;

  return (
    <div className="space-y-4">
      <SettingsCard icon={Settings} title="Ogólne" subtitle="Podstawowe ustawienia aplikacji">
        <div className="flex items-center justify-between">
          <div className="flex items-start gap-2.5">
            <Power className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-sm text-foreground" id="auto-launch-label">
                Uruchamiaj przy starcie systemu
              </p>
              <p className="text-2xs text-muted-foreground/70">
                Automatycznie otwieraj ShiroAni po zalogowaniu do systemu
              </p>
            </div>
          </div>
          <Switch
            checked={autoLaunch}
            onCheckedChange={handleAutoLaunchChange}
            aria-labelledby="auto-launch-label"
          />
        </div>
      </SettingsCard>
    </div>
  );
}
