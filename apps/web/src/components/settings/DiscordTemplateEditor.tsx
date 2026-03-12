import { Clock, Image, ExternalLink, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SettingsCard } from '@/components/settings/SettingsCard';
import type { DiscordActivityType, DiscordPresenceTemplate } from '@shiroani/shared';
import {
  DISCORD_ACTIVITY_TYPES,
  DISCORD_ACTIVITY_LABELS,
  DISCORD_TEMPLATE_VARIABLES,
} from '@shiroani/shared';

interface DiscordTemplateEditorProps {
  selectedActivity: DiscordActivityType;
  onActivityChange: (activity: DiscordActivityType) => void;
  currentTemplate: DiscordPresenceTemplate;
  onTemplateChange: (type: DiscordActivityType, field: string, value: string | boolean) => void;
  onReset: () => void;
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
      <Switch aria-label={label} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

export function DiscordTemplateEditor({
  selectedActivity,
  onActivityChange,
  currentTemplate,
  onTemplateChange,
  onReset,
}: DiscordTemplateEditorProps) {
  return (
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
          onValueChange={v => onActivityChange(v as DiscordActivityType)}
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
          <label className="text-xs font-medium text-muted-foreground">Linia 1 (opis)</label>
          <Input
            className="h-8 text-sm"
            value={currentTemplate.details}
            onChange={e => onTemplateChange(selectedActivity, 'details', e.target.value)}
            placeholder="np. Ogląda anime"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Linia 2 (stan)</label>
          <Input
            className="h-8 text-sm"
            value={currentTemplate.state}
            onChange={e => onTemplateChange(selectedActivity, 'state', e.target.value)}
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
          onChange={v => onTemplateChange(selectedActivity, 'showTimestamp', v)}
        />
        <TemplateToggle
          icon={Image}
          label="Okładka anime"
          checked={currentTemplate.showLargeImage}
          onChange={v => onTemplateChange(selectedActivity, 'showLargeImage', v)}
        />
        <TemplateToggle
          icon={ExternalLink}
          label="Przycisk AniList"
          checked={currentTemplate.showButton}
          onChange={v => onTemplateChange(selectedActivity, 'showButton', v)}
        />
      </div>

      {/* Available variables */}
      <div className="bg-muted/30 rounded-lg p-3 space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground">Dostępne zmienne:</p>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {DISCORD_TEMPLATE_VARIABLES.map(v => (
            <span key={v.key} className="text-xs text-muted-foreground">
              <code className="text-primary/80 bg-primary/5 px-1 rounded text-2xs">{v.key}</code> —{' '}
              {v.description}
            </span>
          ))}
        </div>
      </div>

      {/* Reset button */}
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" className="text-xs" onClick={onReset}>
          Przywróć domyślne
        </Button>
      </div>
    </SettingsCard>
  );
}
