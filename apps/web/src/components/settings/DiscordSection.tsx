import { useState, useEffect, useCallback, useMemo } from 'react';
import { MessageCircle, Check, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { SettingsCard } from '@/components/settings/SettingsCard';
import { DiscordPreview } from '@/components/settings/DiscordPreview';
import { DiscordTemplateEditor } from '@/components/settings/DiscordTemplateEditor';
import { substitutePreview } from '@/lib/discord-utils';
import type { DiscordRpcSettings, DiscordActivityType } from '@shiroani/shared';
import { DEFAULT_DISCORD_TEMPLATES } from '@shiroani/shared';

export function DiscordSection() {
  const [settings, setSettings] = useState<DiscordRpcSettings | null>(null);
  const [saved, setSaved] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<DiscordActivityType>('watching');

  useEffect(() => {
    let mounted = true;
    window.electronAPI?.discordRpc?.getSettings().then((s: DiscordRpcSettings) => {
      if (!mounted) return;
      if (s) {
        setSettings({
          ...s,
          useCustomTemplates: s.useCustomTemplates ?? false,
          templates: s.templates
            ? { ...DEFAULT_DISCORD_TEMPLATES, ...s.templates }
            : { ...DEFAULT_DISCORD_TEMPLATES },
        });
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const updateField = useCallback(
    <K extends keyof DiscordRpcSettings>(key: K, value: DiscordRpcSettings[K]) => {
      setSettings(prev => (prev ? { ...prev, [key]: value } : prev));
    },
    []
  );

  const updateTemplate = useCallback(
    (type: DiscordActivityType, field: string, value: string | boolean) => {
      setSettings(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          templates: {
            ...prev.templates,
            [type]: { ...prev.templates[type], [field]: value },
          },
        };
      });
    },
    []
  );

  const handleSave = useCallback(async () => {
    if (!settings) return;
    await window.electronAPI?.discordRpc?.updateSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [settings]);

  const handleResetTemplate = useCallback(() => {
    setSettings(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        templates: {
          ...prev.templates,
          [selectedActivity]: { ...DEFAULT_DISCORD_TEMPLATES[selectedActivity] },
        },
      };
    });
  }, [selectedActivity]);

  const currentTemplate =
    settings?.templates?.[selectedActivity] ?? DEFAULT_DISCORD_TEMPLATES[selectedActivity];

  const previewDetails = useMemo(
    () => substitutePreview(currentTemplate.details, selectedActivity),
    [currentTemplate.details, selectedActivity]
  );
  const previewState = useMemo(
    () => substitutePreview(currentTemplate.state, selectedActivity),
    [currentTemplate.state, selectedActivity]
  );

  if (!settings) return null;

  return (
    <div className="space-y-4">
      {/* Card 1: Main toggle */}
      <SettingsCard
        icon={MessageCircle}
        title="Discord Rich Presence"
        subtitle="Pokaż swoją aktywność na Discordzie"
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium">Discord Rich Presence</h3>
            <p className="text-xs text-muted-foreground">
              Wyświetlaj swoją aktywność w ShiroAni na profilu Discord
            </p>
          </div>
          <Switch checked={settings.enabled} onCheckedChange={v => updateField('enabled', v)} />
        </div>

        <Separator className="bg-border/50" />

        {/* Legacy toggles — shown when custom templates are off */}
        {!settings.useCustomTemplates && (
          <>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium">Pokaż tytuły anime</h3>
                <p className="text-xs text-muted-foreground">
                  Wyświetlaj tytuł oglądanego anime na Discordzie
                </p>
              </div>
              <Switch
                checked={settings.showAnimeDetails}
                onCheckedChange={v => updateField('showAnimeDetails', v)}
                disabled={!settings.enabled}
              />
            </div>

            <Separator className="bg-border/50" />

            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium">Pokaż czas</h3>
                <p className="text-xs text-muted-foreground">Wyświetlaj czas trwania aktywności</p>
              </div>
              <Switch
                checked={settings.showElapsedTime}
                onCheckedChange={v => updateField('showElapsedTime', v)}
                disabled={!settings.enabled}
              />
            </div>

            <Separator className="bg-border/50" />
          </>
        )}

        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium">Własne szablony</h3>
            <p className="text-xs text-muted-foreground">
              Dostosuj tekst statusu dla każdej aktywności
            </p>
          </div>
          <Switch
            checked={settings.useCustomTemplates}
            onCheckedChange={v => updateField('useCustomTemplates', v)}
            disabled={!settings.enabled}
          />
        </div>

        <div className="pt-2 border-t border-border/30">
          <Button size="sm" onClick={handleSave}>
            {saved ? <Check className="w-4 h-4" /> : null}
            {saved ? 'Zapisano' : 'Zapisz'}
          </Button>
        </div>
      </SettingsCard>

      {/* Card 2: Template editor */}
      {settings.enabled && settings.useCustomTemplates && (
        <DiscordTemplateEditor
          selectedActivity={selectedActivity}
          onActivityChange={setSelectedActivity}
          currentTemplate={currentTemplate}
          onTemplateChange={updateTemplate}
          onReset={handleResetTemplate}
        />
      )}

      {/* Card 3: Live preview */}
      {settings.enabled && settings.useCustomTemplates && (
        <SettingsCard
          icon={MessageCircle}
          title="Podgląd"
          subtitle="Tak będzie wyglądał Twój status na Discordzie"
        >
          <DiscordPreview
            details={previewDetails}
            state={previewState}
            showTimestamp={currentTemplate.showTimestamp}
            showLargeImage={currentTemplate.showLargeImage}
            showButton={currentTemplate.showButton}
            activityType={selectedActivity}
          />
        </SettingsCard>
      )}

      {/* Info callout */}
      <SettingsCard>
        <div className="flex items-start gap-2.5">
          <Info className="w-3.5 h-3.5 text-muted-foreground/70 mt-0.5 shrink-0" />
          <p className="text-xs font-medium text-muted-foreground/80">
            Discord Rich Presence wymaga uruchomionego klienta Discord na komputerze. Inni
            użytkownicy zobaczą na Twoim profilu Discord, co robisz w ShiroAni.
          </p>
        </div>
      </SettingsCard>
    </div>
  );
}
