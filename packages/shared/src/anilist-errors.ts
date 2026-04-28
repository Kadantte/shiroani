export type AniListErrorKind = 'api-disabled' | 'rate-limit' | 'network' | 'unknown';

export function classifyAniListError(message: string | null | undefined): AniListErrorKind {
  if (!message) return 'unknown';
  const m = message.toLowerCase();
  if (m.includes('temporarily disabled')) return 'api-disabled';
  if (m.includes('rate limit') || m.includes('429')) return 'rate-limit';
  if (m.includes('network') || m.includes('timeout') || m.includes('fetch')) return 'network';
  return 'unknown';
}
