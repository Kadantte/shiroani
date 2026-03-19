import { useState, useEffect } from 'react';
import { Settings, Power, Rss } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { SettingsCard } from '@/components/settings/SettingsCard';
import { DEFAULT_FEED_STARTUP_REFRESH, FEED_STARTUP_REFRESH_SETTING_KEY } from '@shiroani/shared';

export function GeneralSection() {
  const [autoLaunch, setAutoLaunch] = useState(false);
  const [feedRefreshOnStartup, setFeedRefreshOnStartup] = useState(DEFAULT_FEED_STARTUP_REFRESH);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      window.electronAPI?.app?.getAutoLaunch(),
      window.electronAPI?.store?.get<boolean>(FEED_STARTUP_REFRESH_SETTING_KEY),
    ]).then(([enabled, startupRefresh]) => {
      if (!mounted) return;
      setAutoLaunch(enabled ?? false);
      setFeedRefreshOnStartup(startupRefresh ?? DEFAULT_FEED_STARTUP_REFRESH);
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

  const handleFeedRefreshOnStartupChange = async (enabled: boolean) => {
    setFeedRefreshOnStartup(enabled);
    await window.electronAPI?.store?.set(FEED_STARTUP_REFRESH_SETTING_KEY, enabled);
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
              <p className="text-xs text-muted-foreground/70">
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

        <div className="flex items-center justify-between">
          <div className="flex items-start gap-2.5">
            <Rss className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-sm text-foreground" id="feed-startup-refresh-label">
                Odświeżaj RSS przy starcie aplikacji
              </p>
              <p className="text-xs text-muted-foreground/70">
                Gdy wyłączone, pierwszy fetch aktualności nastąpi dopiero po wejściu do widoku
                Aktualności lub ręcznym odświeżeniu
              </p>
              <p className="text-xs text-muted-foreground/55 mt-1">
                Zmiana zacznie działać od następnego uruchomienia aplikacji
              </p>
            </div>
          </div>
          <Switch
            checked={feedRefreshOnStartup}
            onCheckedChange={handleFeedRefreshOnStartupChange}
            aria-labelledby="feed-startup-refresh-label"
          />
        </div>
      </SettingsCard>
    </div>
  );
}
