import { useState, useEffect } from 'react';
import { Bell, Check, X, BellRing } from 'lucide-react';
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
import { TooltipButton } from '@/components/ui/tooltip-button';
import { useNotificationStore } from '@/stores/useNotificationStore';
import type { NotificationSettings } from '@shiroani/shared';

const LEAD_TIME_OPTIONS = [
  { value: '0', label: 'W momencie emisji' },
  { value: '5', label: '5 minut' },
  { value: '15', label: '15 minut' },
  { value: '30', label: '30 minut' },
  { value: '60', label: '1 godzina' },
];

export function NotificationsSection() {
  const [enabled, setEnabled] = useState(false);
  const [leadTime, setLeadTime] = useState('15');
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(false);
  const [quietHoursStart, setQuietHoursStart] = useState('23:00');
  const [quietHoursEnd, setQuietHoursEnd] = useState('07:00');
  const [useSystemSound, setUseSystemSound] = useState(true);
  const [saved, setSaved] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const subscriptions = useNotificationStore(state => state.subscriptions);
  const loadSubscriptions = useNotificationStore(state => state.loadSubscriptions);
  const notifLoaded = useNotificationStore(state => state.loaded);
  const unsubscribe = useNotificationStore(state => state.unsubscribe);
  const toggleSubscription = useNotificationStore(state => state.toggleSubscription);

  // Load persisted notification settings on mount
  useEffect(() => {
    window.electronAPI?.notifications?.getSettings().then((settings: NotificationSettings) => {
      if (settings) {
        setEnabled(settings.enabled);
        setLeadTime(String(settings.leadTimeMinutes));
        if (settings.quietHours) {
          setQuietHoursEnabled(settings.quietHours.enabled);
          setQuietHoursStart(settings.quietHours.start);
          setQuietHoursEnd(settings.quietHours.end);
        }
        setUseSystemSound(settings.useSystemSound ?? true);
      }
      setLoaded(true);
    });
  }, []);

  // Load subscriptions
  useEffect(() => {
    if (!notifLoaded) loadSubscriptions();
  }, [notifLoaded, loadSubscriptions]);

  const handleSave = async () => {
    const settings: Partial<NotificationSettings> = {
      enabled,
      leadTimeMinutes: Number(leadTime),
      quietHours: {
        enabled: quietHoursEnabled,
        start: quietHoursStart,
        end: quietHoursEnd,
      },
      useSystemSound,
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

        <Separator className="bg-border/50" />

        {/* Quiet hours */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-sm font-medium">Cisza nocna</h3>
              <p className="text-xs text-muted-foreground">
                Wstrzymaj powiadomienia w wybranych godzinach
              </p>
            </div>
            <Switch
              checked={quietHoursEnabled}
              onCheckedChange={setQuietHoursEnabled}
              disabled={!enabled}
            />
          </div>
          {quietHoursEnabled && enabled && (
            <div className="flex items-center gap-3 mt-2">
              <div className="flex items-center gap-1.5">
                <label className="text-xs text-muted-foreground">Od</label>
                <input
                  type="time"
                  value={quietHoursStart}
                  onChange={e => setQuietHoursStart(e.target.value)}
                  className="h-8 px-2 text-xs rounded-md border border-border-glass bg-background/40 focus:bg-background/60 transition-colors outline-none"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <label className="text-xs text-muted-foreground">Do</label>
                <input
                  type="time"
                  value={quietHoursEnd}
                  onChange={e => setQuietHoursEnd(e.target.value)}
                  className="h-8 px-2 text-xs rounded-md border border-border-glass bg-background/40 focus:bg-background/60 transition-colors outline-none"
                />
              </div>
            </div>
          )}
        </div>

        <Separator className="bg-border/50" />

        {/* System sound */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium">Dźwięk systemowy</h3>
            <p className="text-xs text-muted-foreground">
              Odtwórz dźwięk przy wyświetlaniu powiadomienia
            </p>
          </div>
          <Switch
            checked={useSystemSound}
            onCheckedChange={setUseSystemSound}
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

      {/* Subscriptions list */}
      <SettingsCard
        icon={BellRing}
        title="Subskrypcje"
        subtitle="Anime, o których chcesz otrzymywać powiadomienia"
      >
        {subscriptions.length === 0 ? (
          <p className="text-xs text-muted-foreground/70 py-2">
            Brak subskrypcji. Dodaj anime z harmonogramu klikając ikonkę dzwonka.
          </p>
        ) : (
          <div className="space-y-2">
            {subscriptions.map(sub => (
              <div
                key={sub.anilistId}
                className="flex items-center gap-3 p-2 rounded-lg bg-background/40 border border-border-glass"
              >
                {sub.coverImage ? (
                  <img
                    src={sub.coverImage}
                    alt={sub.title}
                    className="w-8 h-11 rounded object-cover shrink-0"
                  />
                ) : (
                  <div className="w-8 h-11 rounded bg-muted shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{sub.title}</p>
                  {sub.titleRomaji && sub.titleRomaji !== sub.title && (
                    <p className="text-2xs text-muted-foreground/70 truncate">{sub.titleRomaji}</p>
                  )}
                </div>
                <Switch
                  checked={sub.enabled}
                  onCheckedChange={() => toggleSubscription(sub.anilistId)}
                />
                <TooltipButton
                  variant="ghost"
                  size="icon"
                  className="w-7 h-7 shrink-0 text-muted-foreground hover:text-destructive"
                  tooltip="Usuń subskrypcję"
                  onClick={() => unsubscribe(sub.anilistId)}
                >
                  <X className="w-3.5 h-3.5" />
                </TooltipButton>
              </div>
            ))}
          </div>
        )}
      </SettingsCard>
    </div>
  );
}
