import type { AiringAnime, AnimeDetailFuzzyDate } from '@shiroani/shared';

export function getAnimeTitle(media: AiringAnime['media']): string {
  return media.title.romaji || media.title.english || media.title.native || '?';
}

export function getCoverUrl(media: AiringAnime['media']): string | undefined {
  return media.coverImage.medium || media.coverImage.large;
}

/** Format episode progress: "Odc. 5/12" or "Odc. 5" */
export function formatEpisodeProgress(current: number, total?: number | null): string {
  return total ? `Odc. ${current}/${total}` : `Odc. ${current}`;
}

/** Format AniList score (0-100) to display format (0.0-10.0) */
export function formatScore(anilistScore: number): string {
  return (anilistScore / 10).toFixed(1);
}

/** Format an AniList FuzzyDate to "DD.MM.YYYY" (omitting missing parts) */
export function formatFuzzyDate(date?: AnimeDetailFuzzyDate): string | null {
  if (!date?.year) return null;
  const parts: string[] = [];
  if (date.day) parts.push(String(date.day).padStart(2, '0'));
  if (date.month) parts.push(String(date.month).padStart(2, '0'));
  parts.push(String(date.year));
  return parts.join('.');
}

/** Format seconds until airing to a human-readable countdown */
export function formatTimeUntilAiring(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}
