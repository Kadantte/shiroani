import { useState, useEffect, useCallback, useMemo } from 'react';
import { MessageCircle, Check, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { SettingsCard, SettingsRow, SettingsRowLabel } from '@/components/settings/SettingsCard';
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
      {/* Main Discord toggles */}
      <SettingsCard
        icon={MessageCircle}
        title="Discord Rich Presence"
        subtitle="Pokaż swoją aktywność na Discordzie."
        headerAccessory={
          <Switch
            aria-label="Włącz Discord Rich Presence"
            checked={settings.enabled}
            onCheckedChange={v => updateField('enabled', v)}
          />
        }
      >
        {!settings.useCustomTemplates && (
          <>
            <SettingsRow>
              <SettingsRowLabel
                id="discord-details-label"
                title="Pokaż tytuły anime"
                description="Wyświetlaj tytuł oglądanego anime na Discordzie"
              />
              <Switch
                aria-labelledby="discord-details-label"
                checked={settings.showAnimeDetails}
                onCheckedChange={v => updateField('showAnimeDetails', v)}
                disabled={!settings.enabled}
              />
            </SettingsRow>

            <SettingsRow divider>
              <SettingsRowLabel
                id="discord-time-label"
                title="Pokaż czas"
                description="Wyświetlaj czas trwania aktywności"
              />
              <Switch
                aria-labelledby="discord-time-label"
                checked={settings.showElapsedTime}
                onCheckedChange={v => updateField('showElapsedTime', v)}
                disabled={!settings.enabled}
              />
            </SettingsRow>
          </>
        )}

        <SettingsRow divider={!settings.useCustomTemplates}>
          <SettingsRowLabel
            id="discord-templates-label"
            title="Własne szablony"
            description="Dostosuj tekst statusu dla każdej aktywności"
          />
          <Switch
            aria-labelledby="discord-templates-label"
            checked={settings.useCustomTemplates}
            onCheckedChange={v => updateField('useCustomTemplates', v)}
            disabled={!settings.enabled}
          />
        </SettingsRow>

        <div>
          <Button size="sm" onClick={handleSave}>
            {saved ? <Check className="w-4 h-4" /> : null}
            {saved ? 'Zapisano' : 'Zapisz'}
          </Button>
        </div>
      </SettingsCard>

      {/* Template editor */}
      {settings.enabled && settings.useCustomTemplates && (
        <DiscordTemplateEditor
          selectedActivity={selectedActivity}
          onActivityChange={setSelectedActivity}
          currentTemplate={currentTemplate}
          onTemplateChange={updateTemplate}
          onReset={handleResetTemplate}
        />
      )}

      {/* Live preview */}
      {settings.enabled && settings.useCustomTemplates && (
        <SettingsCard
          icon={MessageCircle}
          title="Podgląd"
          subtitle="Tak będzie wyglądał Twój status na Discordzie."
          tone="blue"
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
      <div className="flex items-start gap-3 rounded-xl border border-border-glass bg-background/40 px-4 py-3 text-[11.5px] leading-relaxed text-muted-foreground">
        <Info className="w-4 h-4 text-muted-foreground/80 mt-0.5 shrink-0" />
        <p>
          Status na Discordzie wymaga uruchomionego klienta Discord na komputerze. Inni użytkownicy
          zobaczą na Twoim profilu Discord, co robisz w ShiroAni.
        </p>
      </div>
    </div>
  );
}
