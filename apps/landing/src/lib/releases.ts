/**
 * Landing changelog adapter.
 *
 * The canonical release data lives in the `@shiroani/changelog` workspace
 * package and is shared with the desktop app's in-app changelog view. This
 * file stays as a thin adapter: it re-exports the data under the names the
 * landing components already use and owns the mapping from `category.kind` →
 * the lucide icon + tailwind color class that used to live inline.
 */
import { MessageCircle, Monitor, Rss, Shield, Sparkles, Wrench } from 'lucide-react';
import {
  RELEASES,
  type Category as SharedCategory,
  type CategoryKind,
  type Release as SharedRelease,
} from '@shiroani/changelog';

export type { CategoryKind };

export interface ChangeEntry {
  icon: typeof Sparkles;
  text: string;
}

export interface ReleaseCategory {
  label: string;
  icon: typeof Sparkles;
  color: string;
  entries: ChangeEntry[];
}

export interface Release {
  version: string;
  date: string;
  title: string;
  description: string;
  categories: ReleaseCategory[];
}

/** Marketing-side presentation for each category kind. */
interface CategoryPresentation {
  icon: typeof Sparkles;
  color: string;
}

const CATEGORY_PRESENTATION: Record<CategoryKind, CategoryPresentation> = {
  feature: { icon: Sparkles, color: 'text-primary' },
  fix: { icon: Wrench, color: 'text-muted-foreground' },
  polish: { icon: Wrench, color: 'text-muted-foreground' },
  security: { icon: Shield, color: 'text-primary' },
  feed: { icon: Rss, color: 'text-primary' },
  macos: { icon: Monitor, color: 'text-muted-foreground' },
  app: { icon: Monitor, color: 'text-primary' },
  bot: { icon: MessageCircle, color: 'text-gold' },
};

/** Maps a category kind to its lucide icon (used in section headings). */
export function iconForKind(kind: CategoryKind): typeof Sparkles {
  return CATEGORY_PRESENTATION[kind].icon;
}

function adaptCategory(cat: SharedCategory): ReleaseCategory {
  const { icon, color } = CATEGORY_PRESENTATION[cat.kind];
  return {
    label: cat.label,
    icon,
    color,
    entries: cat.entries.map(text => ({ icon, text })),
  };
}

function adaptRelease(release: SharedRelease): Release {
  return {
    version: release.version,
    date: release.date,
    title: release.title,
    description: release.description,
    categories: release.categories.map(adaptCategory),
  };
}

export const releases: Release[] = RELEASES.map(adaptRelease);

export const latestRelease = releases[0];
