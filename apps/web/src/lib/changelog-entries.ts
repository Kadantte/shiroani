/**
 * In-app changelog adapter.
 *
 * The canonical release data lives in the `@shiroani/changelog` workspace
 * package and is shared with the marketing landing page. This file stays as a
 * thin adapter: it re-exports the data under the names the in-app view already
 * uses and owns the mapping from `category.kind` → `PillTag` variant (the
 * presentation concern that shouldn't leak into the shared package).
 */
import {
  RELEASES,
  type Category as ChangelogCategoryShared,
  type CategoryKind,
  type Release as ChangelogReleaseShared,
  type ReleaseType,
} from '@shiroani/changelog';

export type ChangelogCategoryKind = CategoryKind;
export type ChangelogCategory = ChangelogCategoryShared;
export type ChangelogReleaseType = ReleaseType;
export type ChangelogRelease = ChangelogReleaseShared;

/** Source of truth for in-app rendering — shared with the landing page. */
export const CHANGELOG_RELEASES: readonly ChangelogRelease[] = RELEASES;

/**
 * PillTag variant used for each changelog category kind. Kept in sync with
 * the design mock's `--cat-*` color tokens.
 */
export const CHANGELOG_CATEGORY_VARIANT: Record<
  ChangelogCategoryKind,
  'accent' | 'green' | 'blue' | 'orange' | 'muted' | 'gold'
> = {
  feature: 'accent',
  fix: 'green',
  polish: 'blue',
  security: 'orange',
  feed: 'orange',
  macos: 'blue',
  app: 'accent',
  bot: 'muted',
};
