import { useMemo } from 'react';
import {
  BookOpen,
  Calendar,
  Compass,
  History,
  NotebookPen,
  Rss,
  Settings,
  User,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useDockStore } from '@/stores/useDockStore';
import type { ActiveView } from '@/stores/useAppStore';
import { ALL_NAV_ITEMS, ALWAYS_VISIBLE_VIEWS } from '@/lib/nav-items';
import { APP_LOGO_URL } from '@/lib/constants';
import type { DockStageItem } from '@/components/shared/DockStage';

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

/**
 * Returns a memoized `DockStageItem[]` representing the currently visible
 * navigation slots. Pass `hoveredId` to highlight a specific slot (used by
 * `ViewsSection`'s hover interaction); omit it for a static preview.
 *
 * Single source of truth for the icon map and mascot slot across
 * `ViewsSection`, `DockSection`, and `DockStep`.
 */
export function useDockPreviewItems(hoveredId: ActiveView | null = null): DockStageItem[] {
  const hiddenViews = useDockStore(s => s.hiddenViews);

  return useMemo<DockStageItem[]>(() => {
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
}
