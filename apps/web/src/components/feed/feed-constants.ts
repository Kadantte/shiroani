import type { FeedCategory, FeedLanguage } from '@shiroani/shared';

export const CATEGORY_LABELS: Record<FeedCategory | 'all', string> = {
  all: 'Wszystko',
  news: 'Wiadomości',
  episodes: 'Odcinki',
  reviews: 'Recenzje',
  community: 'Społeczność',
};

export const LANGUAGE_LABELS: Record<FeedLanguage | 'all', string> = {
  all: 'Wszystkie',
  en: 'Angielski',
  pl: 'Polski',
};

export const CATEGORY_COLORS: Record<FeedCategory, string> = {
  news: 'bg-blue-500/15 text-blue-400',
  episodes: 'bg-green-500/15 text-green-400',
  reviews: 'bg-amber-500/15 text-amber-400',
  community: 'bg-purple-500/15 text-purple-400',
};
