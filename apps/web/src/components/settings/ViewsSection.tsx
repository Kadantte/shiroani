import { useMemo, useState } from 'react';
import {
  BookOpen,
  Calendar,
  Compass,
  Eye,
  History,
  NotebookPen,
  Rss,
  Settings,
  User,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useDockStore } from '@/stores/useDockStore';
import type { ActiveView } from '@/stores/useAppStore';
import { SettingsCard } from '@/components/settings/SettingsCard';
import { ALL_NAV_ITEMS, ALWAYS_VISIBLE_VIEWS } from '@/lib/nav-items';
import { DockStage, type DockStageItem } from '@/components/shared/DockStage';
import { APP_LOGO_URL } from '@/lib/constants';

const ICON_BY_VIEW: Partial<Record<ActiveView, LucideIcon>> = {
  library: BookOpen,
  discover: Compass,
  diary: NotebookPen,
  schedule: Calendar,
  feed: Rss,
  profile: User,
  changelog: History,
  settings: Settings,
};

export function ViewsSection() {
  const edge = useDockStore(s => s.edge);
  const hiddenViews = useDockStore(s => s.hiddenViews);
  const toggleViewVisibility = useDockStore(s => s.toggleViewVisibility);
  const [hoveredId, setHoveredId] = useState<ActiveView | null>(null);

  // Slots shown in the preview — only the currently-visible views, in nav order.
  const dockItems = useMemo<DockStageItem[]>(() => {
    return ALL_NAV_ITEMS.filter(item => {
      const alwaysOn = ALWAYS_VISIBLE_VIEWS.has(item.id);
      return alwaysOn || !hiddenViews.includes(item.id);
    }).map(item => {
      const Icon = ICON_BY_VIEW[item.id];
      const icon =
        item.id === 'browser' ? (
          <img src={APP_LOGO_URL} alt="" draggable={false} className="h-3.5 w-3.5 object-contain" />
        ) : Icon ? (
          <Icon className="h-3 w-3" />
        ) : undefined;
      return {
        id: item.id,
        highlighted: hoveredId === item.id,
        icon,
      };
    });
  }, [hiddenViews, hoveredId]);

  return (
    <SettingsCard
      icon={Eye}
      title="Widoczność widoków"
      subtitle="Ukryj sekcje, których nie używasz. Ustawienia są zawsze dostępne."
    >
      <DockStage edge={edge} items={dockItems} height={140} />

      <div className="grid grid-cols-2 gap-2">
        {ALL_NAV_ITEMS.map(item => {
          const alwaysOn = ALWAYS_VISIBLE_VIEWS.has(item.id);
          const visible = alwaysOn || !hiddenViews.includes(item.id);
          const labelId = `view-visibility-${item.id}`;
          return (
            <div
              key={item.id}
              onMouseEnter={() => visible && setHoveredId(item.id)}
              onMouseLeave={() => setHoveredId(prev => (prev === item.id ? null : prev))}
              onFocus={() => visible && setHoveredId(item.id)}
              onBlur={() => setHoveredId(prev => (prev === item.id ? null : prev))}
              className="flex items-center justify-between rounded-lg border border-border-glass/70 bg-background/30 px-3 py-2 transition-colors duration-150 hover:border-border-glass"
            >
              <span className="text-[12px] font-medium text-foreground" id={labelId}>
                {item.label}
                {alwaysOn && (
                  <span className="ml-2 text-2xs font-normal text-muted-foreground/70">
                    (zawsze)
                  </span>
                )}
              </span>
              <Switch
                checked={visible}
                disabled={alwaysOn}
                onCheckedChange={() => toggleViewVisibility(item.id)}
                aria-labelledby={labelId}
              />
            </div>
          );
        })}
      </div>
    </SettingsCard>
  );
}
