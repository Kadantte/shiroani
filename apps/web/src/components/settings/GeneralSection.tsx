import { useState, useEffect } from 'react';
import { Settings, Sparkles, UserRound } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  SettingsCard,
  SettingsRow,
  SettingsRowLabel,
  SettingsToggleRow,
} from '@/components/settings/SettingsCard';
import {
  DEFAULT_FEED_STARTUP_REFRESH,
  DISPLAY_NAME_MAX_LENGTH,
  FEED_STARTUP_REFRESH_SETTING_KEY,
} from '@shiroani/shared';
import { useSettingsStore } from '@/stores/useSettingsStore';

export function GeneralSection() {
  const [autoLaunch, setAutoLaunch] = useState(false);
  const [feedRefreshOnStartup, setFeedRefreshOnStartup] = useState(DEFAULT_FEED_STARTUP_REFRESH);
  const [loaded, setLoaded] = useState(false);
  const displayName = useSettingsStore(s => s.displayName);
  const setDisplayName = useSettingsStore(s => s.setDisplayName);

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
        icon={UserRound}
        title="Profil"
        subtitle="Imię używane w powitaniu na nowej karcie. Zostaje tylko na tym urządzeniu."
      >
        <SettingsRow stacked>
          <SettingsRowLabel
            id="display-name-label"
            title="Twoje imię"
            description="Puste pole = Shiro użyje nicku z AniList (jeśli podłączony)."
          />
          <Input
            id="display-name-input"
            aria-labelledby="display-name-label"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            placeholder="np. Aleks"
            maxLength={DISPLAY_NAME_MAX_LENGTH}
            className="h-9 text-[13.5px]"
          />
        </SettingsRow>
      </SettingsCard>

      <SettingsCard
        icon={Settings}
        title="Ogólne ustawienia aplikacji"
        subtitle="Zachowanie aplikacji przy starcie systemu i odświeżaniu danych."
      >
        <SettingsToggleRow
          id="auto-launch-label"
          title="Uruchamiaj przy starcie systemu"
          description="Automatycznie otwiera ShiroAni po zalogowaniu do systemu"
          checked={autoLaunch}
          onCheckedChange={handleAutoLaunchChange}
        />

        <SettingsToggleRow
          divider
          id="feed-startup-refresh-label"
          title="Odświeżaj RSS przy starcie aplikacji"
          description="Gdy wyłączone, pierwsze pobranie aktualności nastąpi dopiero po wejściu do widoku Aktualności lub po ręcznym odświeżeniu. Zmiana zacznie działać od następnego uruchomienia."
          checked={feedRefreshOnStartup}
          onCheckedChange={handleFeedRefreshOnStartupChange}
        />
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
