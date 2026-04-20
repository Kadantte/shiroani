import { useState, useEffect } from 'react';
import { Settings, Sparkles } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { SettingsCard, SettingsRow, SettingsRowLabel } from '@/components/settings/SettingsCard';
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
      <SettingsCard
        icon={Settings}
        title="Ogólne ustawienia aplikacji"
        subtitle="Zachowanie aplikacji przy starcie systemu i odświeżaniu danych."
      >
        <SettingsRow>
          <SettingsRowLabel
            id="auto-launch-label"
            title="Uruchamiaj przy starcie systemu"
            description="Automatycznie otwiera ShiroAni po zalogowaniu do systemu"
          />
          <Switch
            checked={autoLaunch}
            onCheckedChange={handleAutoLaunchChange}
            aria-labelledby="auto-launch-label"
          />
        </SettingsRow>

        <SettingsRow divider>
          <SettingsRowLabel
            id="feed-startup-refresh-label"
            title="Odświeżaj RSS przy starcie aplikacji"
            description="Gdy wyłączone, pierwsze pobranie aktualności nastąpi dopiero po wejściu do widoku Aktualności lub po ręcznym odświeżeniu. Zmiana zacznie działać od następnego uruchomienia."
          />
          <Switch
            checked={feedRefreshOnStartup}
            onCheckedChange={handleFeedRefreshOnStartupChange}
            aria-labelledby="feed-startup-refresh-label"
          />
        </SettingsRow>
      </SettingsCard>

      {/* Info callout matching the mock's .info-box */}
      <div className="flex items-center gap-3 rounded-xl border border-border-glass bg-background/40 px-4 py-3 text-[11.5px] leading-relaxed text-muted-foreground">
        <Sparkles className="w-[18px] h-[18px] flex-shrink-0 text-[oklch(0.8_0.14_70)]" />
        <span>
          Niektóre zmiany systemowe wymagają restartu aplikacji.{' '}
          <b className="font-semibold text-foreground">Dane nie zostaną utracone.</b>
        </span>
      </div>
    </div>
  );
}
