/**
 * Landing changelog adapter.
 *
 * Release data is sourced from the shared `@shiroani/changelog` package —
 * the single source of truth, also consumed by the in-app view in
 * `apps/web`. This file keeps the field names the landing UI was built
 * against (`dateShort`, `slug`) and exposes a `currentVersion()` helper
 * used by the hero, navbar, footer and suite tagline.
 */
import {
  RELEASES,
  type Category as SharedCategory,
  type CategoryKind,
  type Release as SharedRelease,
} from '@shiroani/changelog';

export type CategorySlug = CategoryKind;

export interface ReleaseCategory {
  slug: CategorySlug;
  label: string;
  // entries are rendered via set:html in ChangelogPage.astro to allow <code> tags.
  // Source is author-controlled static data only — never accept user input here.
  entries: string[];
}

export interface Release {
  version: string;
  date: string;
  dateShort: string;
  title: string;
  description: string;
  type: 'major' | 'minor';
  categories: ReleaseCategory[];
}

function adaptCategory(category: SharedCategory): ReleaseCategory {
  return {
    slug: category.kind,
    label: category.label,
    entries: [...category.entries],
  };
}

function adaptRelease(release: SharedRelease): Release {
  return {
    version: release.version,
    date: release.date,
    dateShort: release.shortDate,
    title: release.title,
    description: release.description,
    type: release.type,
    categories: release.categories.map(adaptCategory),
  };
}

export const releases: Release[] = RELEASES.map(adaptRelease);

export const currentVersion = (): string => releases[0].version;

export const latestRelease: Release = releases[0];
