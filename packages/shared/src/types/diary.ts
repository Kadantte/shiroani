/**
 * Diary Types - Core types for the diary/journal feature
 */

export type DiaryMood = 'great' | 'good' | 'neutral' | 'bad' | 'terrible';

export type DiaryGradient =
  | 'sakura'
  | 'twilight'
  | 'ocean'
  | 'matcha'
  | 'amber'
  | 'coral'
  | 'mist'
  | 'lavender'
  | 'mint'
  | 'cyber'
  | 'starlight'
  | 'peach';

export interface DiaryEntry {
  id: number;
  title: string;
  contentJson: string;
  coverGradient?: DiaryGradient;
  mood?: DiaryMood;
  tags?: string[];
  animeId?: number;
  animeTitle?: string;
  animeCoverImage?: string;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DiaryCreatePayload {
  title: string;
  contentJson: string;
  coverGradient?: DiaryGradient;
  mood?: DiaryMood;
  tags?: string[];
  animeId?: number;
  animeTitle?: string;
  animeCoverImage?: string;
}

export interface DiaryUpdatePayload {
  id: number;
  title?: string;
  contentJson?: string;
  coverGradient?: DiaryGradient | null;
  mood?: DiaryMood | null;
  tags?: string[] | null;
  animeId?: number | null;
  animeTitle?: string | null;
  animeCoverImage?: string | null;
  isPinned?: boolean;
}
