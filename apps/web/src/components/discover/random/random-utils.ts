import type { DiscoverMedia } from '@/stores/useDiscoverStore';
import {
  ANILIST_FORMAT_LABELS,
  ANILIST_STATUS_LABELS,
  ANILIST_SEASON_LABELS,
} from '@/lib/constants';

export function getTitle(t: DiscoverMedia['title']): string {
  return t.english || t.romaji || t.native || '?';
}

export function stripHtml(s?: string): string {
  if (!s) return '';
  return s
    .replace(/<br\s*\/?>(\s*)/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export interface ShowcaseMeta {
  cover?: string;
  banner?: string;
  title: string;
  formatLabel: string | null;
  statusLabel: string | null;
  yearLabel: string | null;
  synopsis: string;
}

export function buildShowcaseMeta(media: DiscoverMedia): ShowcaseMeta {
  const cover = media.coverImage.extraLarge || media.coverImage.large || media.coverImage.medium;
  const banner = media.bannerImage || cover;
  const formatLabel = media.format ? (ANILIST_FORMAT_LABELS[media.format] ?? media.format) : null;
  const statusLabel = media.status ? (ANILIST_STATUS_LABELS[media.status] ?? media.status) : null;
  const yearLabel =
    media.seasonYear && media.season
      ? `${ANILIST_SEASON_LABELS[media.season] ?? media.season} ${media.seasonYear}`
      : media.seasonYear
        ? String(media.seasonYear)
        : null;

  return {
    cover,
    banner,
    title: getTitle(media.title),
    formatLabel,
    statusLabel,
    yearLabel,
    synopsis: stripHtml(media.description),
  };
}
