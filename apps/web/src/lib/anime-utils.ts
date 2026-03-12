import type { AiringAnime } from '@shiroani/shared';

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
