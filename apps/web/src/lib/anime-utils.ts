import type { AiringAnime } from '@shiroani/shared';

export function getAnimeTitle(media: AiringAnime['media']): string {
  return media.title.romaji || media.title.english || media.title.native || '?';
}

export function getCoverUrl(media: AiringAnime['media']): string | undefined {
  return media.coverImage.medium || media.coverImage.large;
}
