import { useState } from 'react';
import { Eye } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useDockStore } from '@/stores/useDockStore';
import type { ActiveView } from '@/stores/useAppStore';
import { SettingsCard } from '@/components/settings/SettingsCard';
import { ALL_NAV_ITEMS, ALWAYS_VISIBLE_VIEWS } from '@/lib/nav-items';
import { DockStage } from '@/components/shared/DockStage';
import { useDockPreviewItems } from '@/hooks/useDockPreviewItems';

export function ViewsSection() {
  const edge = useDockStore(s => s.edge);
  const hiddenViews = useDockStore(s => s.hiddenViews);
  const toggleViewVisibility = useDockStore(s => s.toggleViewVisibility);
  const [hoveredId, setHoveredId] = useState<ActiveView | null>(null);

  const dockItems = useDockPreviewItems(hoveredId);

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
