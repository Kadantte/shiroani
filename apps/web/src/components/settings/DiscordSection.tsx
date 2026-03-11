import { useState, useEffect, useCallback, useMemo } from 'react';
import { MessageCircle, Check, Info, Clock, Image, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { SettingsCard } from '@/components/settings/SettingsCard';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { DiscordRpcSettings, DiscordActivityType } from '@shiroani/shared';
import {
  DEFAULT_DISCORD_TEMPLATES,
  DISCORD_ACTIVITY_TYPES,
  DISCORD_ACTIVITY_LABELS,
  DISCORD_TEMPLATE_VARIABLES,
} from '@shiroani/shared';

/** Sample data for live preview */
const PREVIEW_DATA: Record<
  DiscordActivityType,
  { anime_title: string; episode: string; site_name: string; library_count: string }
> = {
  watching: {
    anime_title: "Frieren: Beyond Journey's End",
    episode: 'Odcinek 12',
    site_name: 'ogladajanime.pl',
    library_count: '42',
  },
  browsing: { anime_title: '', episode: '', site_name: 'ogladajanime.pl', library_count: '42' },
  library: { anime_title: '', episode: '', site_name: '', library_count: '42' },
  diary: {
    anime_title: "Frieren: Beyond Journey's End",
    episode: '',
    site_name: '',
    library_count: '42',
  },
  schedule: { anime_title: '', episode: '', site_name: '', library_count: '42' },
  settings: { anime_title: '', episode: '', site_name: '', library_count: '42' },
  idle: { anime_title: '', episode: '', site_name: '', library_count: '42' },
};

function substitutePreview(template: string, activityType: DiscordActivityType): string {
  if (!template) return '';
  const data = PREVIEW_DATA[activityType];
  return template
    .replace(/\{anime_title\}/g, data.anime_title)
    .replace(/\{episode\}/g, data.episode)
    .replace(/\{site_name\}/g, data.site_name)
    .replace(/\{library_count\}/g, data.library_count)
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function DiscordSection() {
  const [settings, setSettings] = useState<DiscordRpcSettings | null>(null);
  const [saved, setSaved] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<DiscordActivityType>('watching');

  useEffect(() => {
    window.electronAPI?.discordRpc?.getSettings().then((s: DiscordRpcSettings) => {
      if (s) {
        // Migrate: ensure templates exist
        setSettings({
          ...s,
          useCustomTemplates: s.useCustomTemplates ?? false,
          templates: s.templates
            ? { ...DEFAULT_DISCORD_TEMPLATES, ...s.templates }
            : { ...DEFAULT_DISCORD_TEMPLATES },
        });
      }
    });
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
        <SettingsCard
          icon={MessageCircle}
          title="Szablony statusów"
          subtitle="Edytuj tekst dla każdego typu aktywności"
        >
          {/* Activity type selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Typ aktywności</label>
            <Select
              value={selectedActivity}
              onValueChange={v => setSelectedActivity(v as DiscordActivityType)}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DISCORD_ACTIVITY_TYPES.map(type => (
                  <SelectItem key={type} value={type}>
                    {DISCORD_ACTIVITY_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator className="bg-border/50" />

          {/* Template inputs */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Linia 1 (details)</label>
              <Input
                className="h-8 text-sm"
                value={currentTemplate.details}
                onChange={e => updateTemplate(selectedActivity, 'details', e.target.value)}
                placeholder="np. Ogląda anime"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Linia 2 (state)</label>
              <Input
                className="h-8 text-sm"
                value={currentTemplate.state}
                onChange={e => updateTemplate(selectedActivity, 'state', e.target.value)}
                placeholder="np. {anime_title}"
              />
            </div>
          </div>

          {/* Template toggles */}
          <div className="space-y-2">
            <TemplateToggle
              icon={Clock}
              label="Czas trwania"
              checked={currentTemplate.showTimestamp}
              onChange={v => updateTemplate(selectedActivity, 'showTimestamp', v)}
            />
            <TemplateToggle
              icon={Image}
              label="Okładka anime"
              checked={currentTemplate.showLargeImage}
              onChange={v => updateTemplate(selectedActivity, 'showLargeImage', v)}
            />
            <TemplateToggle
              icon={ExternalLink}
              label="Przycisk AniList"
              checked={currentTemplate.showButton}
              onChange={v => updateTemplate(selectedActivity, 'showButton', v)}
            />
          </div>

          {/* Available variables */}
          <div className="bg-muted/30 rounded-lg p-3 space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Dostępne zmienne:</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {DISCORD_TEMPLATE_VARIABLES.map(v => (
                <span key={v.key} className="text-xs text-muted-foreground">
                  <code className="text-primary/80 bg-primary/5 px-1 rounded text-2xs">
                    {v.key}
                  </code>{' '}
                  — {v.description}
                </span>
              ))}
            </div>
          </div>

          {/* Reset button */}
          <div className="flex justify-end">
            <Button variant="ghost" size="sm" className="text-xs" onClick={handleResetTemplate}>
              Resetuj do domyślnych
            </Button>
          </div>
        </SettingsCard>
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
            użytkownicy zobaczą, co robisz w ShiroAni, na Twoim profilu Discord.
          </p>
        </div>
      </SettingsCard>
    </div>
  );
}

/** Small toggle row for template options */
function TemplateToggle({
  icon: Icon,
  label,
  checked,
  onChange,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <div className="flex items-center gap-2">
        <Icon className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-sm">{label}</span>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

/** Discord-style presence preview card */
function DiscordPreview({
  details,
  state,
  showTimestamp,
  showLargeImage,
  showButton,
  activityType,
}: {
  details: string;
  state: string;
  showTimestamp: boolean;
  showLargeImage: boolean;
  showButton: boolean;
  activityType: DiscordActivityType;
}) {
  const isWatching = activityType === 'watching' || activityType === 'diary';

  return (
    <div className="bg-[#2b2d31] rounded-lg p-3 text-white/90 font-sans">
      <p className="text-[10px] font-semibold text-white/60 uppercase mb-2">Gra w grę</p>
      <div className="flex gap-3">
        {/* Large image */}
        {showLargeImage && (
          <div className="w-[60px] h-[60px] rounded-lg bg-[#1e1f22] shrink-0 flex items-center justify-center overflow-hidden">
            {isWatching ? (
              <div className="w-full h-full bg-gradient-to-br from-purple-500/30 to-blue-500/30 flex items-center justify-center">
                <span className="text-lg">🎬</span>
              </div>
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                <span className="text-[10px] font-bold text-white/40">SA</span>
              </div>
            )}
          </div>
        )}

        {/* Text content */}
        <div className="min-w-0 flex flex-col justify-center gap-0.5">
          <p className="text-xs font-semibold text-white truncate">ShiroAni</p>
          {details && <p className="text-[11px] text-white/70 truncate">{details}</p>}
          {state && <p className="text-[11px] text-white/70 truncate">{state}</p>}
          {showTimestamp && <p className="text-[11px] text-white/50">00:42:15 upłynęło</p>}
        </div>
      </div>

      {/* AniList button */}
      {showButton && isWatching && (
        <div className="mt-2">
          <div className="w-full py-1.5 rounded bg-[#4e505899] text-center text-[11px] font-medium text-white/80">
            Pokaż na AniList
          </div>
        </div>
      )}
    </div>
  );
}
