import { useEffect, useState, useCallback } from 'react';
import { Bell, X, BellRing } from 'lucide-react';
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

interface NotifFormData {
  enabled: boolean;
  leadTime: string;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  useSystemSound: boolean;
}

const defaultNotifData: NotifFormData = {
  enabled: false,
  leadTime: '15',
  quietHoursEnabled: false,
  quietHoursStart: '23:00',
  quietHoursEnd: '07:00',
  useSystemSound: true,
};

/** Save a partial update to the main process immediately */
function saveToMain(data: NotifFormData) {
  const settings: Partial<NotificationSettings> = {
    enabled: data.enabled,
    leadTimeMinutes: Number(data.leadTime),
    quietHours: {
      enabled: data.quietHoursEnabled,
      start: data.quietHoursStart,
      end: data.quietHoursEnd,
    },
    useSystemSound: data.useSystemSound,
  };
  const req = window.electronAPI?.notifications?.updateSettings(settings);
  void req?.catch(() => {});
}

export function NotificationsSection() {
  const [data, setData] = useState<NotifFormData>(defaultNotifData);
  const [loaded, setLoaded] = useState(false);

  // Load settings from main process on mount
  useEffect(() => {
    let mounted = true;
    const req = window.electronAPI?.notifications?.getSettings();
    if (!req) {
      setLoaded(true);
      return () => {
        mounted = false;
      };
    }
    req
      .then(settings => {
        if (!mounted || !settings) return;
        setData({
          enabled: settings.enabled,
          leadTime: String(settings.leadTimeMinutes),
          quietHoursEnabled: settings.quietHours?.enabled ?? false,
          quietHoursStart: settings.quietHours?.start ?? '23:00',
          quietHoursEnd: settings.quietHours?.end ?? '07:00',
          useSystemSound: settings.useSystemSound ?? true,
        });
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setLoaded(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const updateAndSave = useCallback((partial: Partial<NotifFormData>) => {
    setData(prev => {
      const next = { ...prev, ...partial };
      // Schedule save outside the updater to avoid side effects in React Strict Mode
      queueMicrotask(() => saveToMain(next));
      return next;
    });
  }, []);

  const subscriptions = useNotificationStore(state => state.subscriptions);
  const loadSubscriptions = useNotificationStore(state => state.loadSubscriptions);
  const notifLoaded = useNotificationStore(state => state.loaded);
  const unsubscribe = useNotificationStore(state => state.unsubscribe);
  const toggleSubscription = useNotificationStore(state => state.toggleSubscription);

  // Load subscriptions
  useEffect(() => {
    if (!notifLoaded) loadSubscriptions();
  }, [notifLoaded, loadSubscriptions]);

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
            <h4 id="notif-enabled-label" className="text-sm font-medium">
              Powiadomienia o odcinkach
            </h4>
            <p className="text-xs text-muted-foreground">
              Otrzymuj powiadomienia gdy nowy odcinek śledzonego anime jest nadawany
            </p>
          </div>
          <Switch
            checked={data.enabled}
            onCheckedChange={v => updateAndSave({ enabled: v })}
            aria-labelledby="notif-enabled-label"
          />
        </div>

        <Separator className="bg-border/50" />

        {/* Lead time */}
        <div>
          <h4 className="text-sm font-medium mb-1">Powiadom przed emisją</h4>
          <p className="text-xs text-muted-foreground mb-2">
            Ile minut przed emisją wysłać powiadomienie
          </p>
          <Select
            value={data.leadTime}
            onValueChange={v => updateAndSave({ leadTime: v })}
            disabled={!data.enabled}
          >
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
              <h4 id="notif-quiet-label" className="text-sm font-medium">
                Cisza nocna
              </h4>
              <p className="text-xs text-muted-foreground">
                Wstrzymaj powiadomienia w wybranych godzinach
              </p>
            </div>
            <Switch
              checked={data.quietHoursEnabled}
              onCheckedChange={v => updateAndSave({ quietHoursEnabled: v })}
              disabled={!data.enabled}
              aria-labelledby="notif-quiet-label"
            />
          </div>
          {data.quietHoursEnabled && data.enabled && (
            <div className="flex items-center gap-3 mt-2">
              <div className="flex items-center gap-1.5">
                <label htmlFor="quiet-start" className="text-xs text-muted-foreground">
                  Od
                </label>
                <input
                  id="quiet-start"
                  type="time"
                  value={data.quietHoursStart}
                  onChange={e => updateAndSave({ quietHoursStart: e.target.value })}
                  className="h-8 px-2 text-xs rounded-md border border-border-glass bg-background/40 focus:bg-background/60 transition-colors outline-none"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <label htmlFor="quiet-end" className="text-xs text-muted-foreground">
                  Do
                </label>
                <input
                  id="quiet-end"
                  type="time"
                  value={data.quietHoursEnd}
                  onChange={e => updateAndSave({ quietHoursEnd: e.target.value })}
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
            <h4 id="notif-sound-label" className="text-sm font-medium">
              Dźwięk systemowy
            </h4>
            <p className="text-xs text-muted-foreground">
              Odtwórz dźwięk przy wyświetlaniu powiadomienia
            </p>
          </div>
          <Switch
            checked={data.useSystemSound}
            onCheckedChange={v => updateAndSave({ useSystemSound: v })}
            disabled={!data.enabled}
            aria-labelledby="notif-sound-label"
          />
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
                  aria-label={sub.title}
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
