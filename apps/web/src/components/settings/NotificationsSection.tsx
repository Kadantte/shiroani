import { useState, useEffect } from 'react';
import { Bell, Check, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import type { NotificationSettings } from '@shiroani/shared';

const LEAD_TIME_OPTIONS = [
  { value: '5', label: '5 minut' },
  { value: '15', label: '15 minut' },
  { value: '30', label: '30 minut' },
  { value: '60', label: '1 godzina' },
];

export function NotificationsSection() {
  const [enabled, setEnabled] = useState(false);
  const [leadTime, setLeadTime] = useState('15');
  const [saved, setSaved] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Load persisted notification settings on mount
  useEffect(() => {
    window.electronAPI?.notifications?.getSettings().then((settings: NotificationSettings) => {
      if (settings) {
        setEnabled(settings.enabled);
        setLeadTime(String(settings.leadTimeMinutes));
      }
      setLoaded(true);
    });
  }, []);

  const handleSave = async () => {
    const settings: NotificationSettings = {
      enabled,
      leadTimeMinutes: Number(leadTime),
    };

    await window.electronAPI?.notifications?.updateSettings(settings);

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (!loaded) return null;

  return (
    <div className="space-y-4">
      <SettingsCard
        icon={Bell}
        title="Powiadomienia"
        subtitle="Ustawienia powiadomień o nowych odcinkach"
      >
        {/* Enable notifications */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium">Powiadomienia o odcinkach</h3>
            <p className="text-xs text-muted-foreground">
              Otrzymuj powiadomienia gdy nowy odcinek śledzonego anime jest nadawany
            </p>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>

        <Separator className="bg-border/50" />

        {/* Lead time */}
        <div>
          <h3 className="text-sm font-medium mb-1">Wyprzedzenie</h3>
          <p className="text-xs text-muted-foreground mb-2">
            Ile minut przed emisją wysłać powiadomienie
          </p>
          <Select value={leadTime} onValueChange={setLeadTime} disabled={!enabled}>
            <SelectTrigger className="w-40 h-8 text-xs bg-background/40 border-border-glass focus:bg-background/60 transition-colors">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LEAD_TIME_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value} className="text-xs">
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
            Powiadomienia działają tylko dla anime ze statusem &ldquo;Oglądane&rdquo; w bibliotece,
            które mają przypisane ID z AniList.
          </p>
        </div>
      </SettingsCard>
    </div>
  );
}
