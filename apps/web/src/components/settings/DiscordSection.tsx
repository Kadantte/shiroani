import { useState, useEffect } from 'react';
import { MessageCircle, Check, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { SettingsCard } from '@/components/settings/SettingsCard';
import type { DiscordRpcSettings } from '@shiroani/shared';

export function DiscordSection() {
  const [enabled, setEnabled] = useState(false);
  const [showAnimeDetails, setShowAnimeDetails] = useState(true);
  const [showElapsedTime, setShowElapsedTime] = useState(true);
  const [saved, setSaved] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    window.electronAPI?.discordRpc?.getSettings().then((settings: DiscordRpcSettings) => {
      if (settings) {
        setEnabled(settings.enabled);
        setShowAnimeDetails(settings.showAnimeDetails);
        setShowElapsedTime(settings.showElapsedTime);
      }
      setLoaded(true);
    });
  }, []);

  const handleSave = async () => {
    const settings: DiscordRpcSettings = {
      enabled,
      showAnimeDetails,
      showElapsedTime,
    };

    await window.electronAPI?.discordRpc?.updateSettings(settings);

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (!loaded) return null;

  return (
    <div className="space-y-4">
      <SettingsCard
        icon={MessageCircle}
        title="Discord Rich Presence"
        subtitle="Pokaż swoją aktywność na Discordzie"
      >
        {/* Enable Discord RPC */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium">Discord Rich Presence</h3>
            <p className="text-xs text-muted-foreground">
              Wyświetlaj swoją aktywność w ShiroAni na profilu Discord
            </p>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>

        <Separator className="bg-border/50" />

        {/* Show anime details */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium">Pokaż tytuły anime</h3>
            <p className="text-xs text-muted-foreground">
              Wyświetlaj tytuł oglądanego anime na Discordzie
            </p>
          </div>
          <Switch
            checked={showAnimeDetails}
            onCheckedChange={setShowAnimeDetails}
            disabled={!enabled}
          />
        </div>

        <Separator className="bg-border/50" />

        {/* Show elapsed time */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium">Pokaż czas</h3>
            <p className="text-xs text-muted-foreground">Wyświetlaj czas trwania aktywności</p>
          </div>
          <Switch
            checked={showElapsedTime}
            onCheckedChange={setShowElapsedTime}
            disabled={!enabled}
          />
        </div>

        <div className="pt-2 border-t border-border/30">
          <Button size="sm" onClick={handleSave}>
            {saved ? <Check className="w-4 h-4" /> : null}
            {saved ? 'Zapisano' : 'Zapisz'}
          </Button>
        </div>
      </SettingsCard>

      {/* Info callout */}
      <SettingsCard>
        <div className="flex items-start gap-2.5">
          <Info className="w-3.5 h-3.5 text-muted-foreground/70 mt-0.5 shrink-0" />
          <p className="text-xs font-medium text-muted-foreground/80">
            Discord Rich Presence wymaga uruchomionego klienta Discord na komputerze. Inni
            użytkownicy zobaczą, co robisz w ShiroAni, na Twoim profilu Discord.
          </p>
        </div>
      </SettingsCard>
    </div>
  );
}
