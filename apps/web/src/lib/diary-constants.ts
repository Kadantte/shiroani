import { Sparkles, Heart, Minus, ThumbsDown, Frown } from 'lucide-react';
import type { DiaryMood } from '@shiroani/shared';

export const DIARY_GRADIENTS: Record<string, { label: string; css: string }> = {
  sakura: {
    label: 'Sakura',
    css: 'linear-gradient(135deg, #FF92A8 0%, #FFB7C5 50%, #FFC8D6 100%)',
  },
  twilight: {
    label: 'Zmierzch',
    css: 'linear-gradient(135deg, #7C3AED 0%, #A78BFA 50%, #C4B5FD 100%)',
  },
  ocean: { label: 'Ocean', css: 'linear-gradient(135deg, #0284C7 0%, #38BDF8 50%, #7DD3FC 100%)' },
  matcha: {
    label: 'Matcha',
    css: 'linear-gradient(135deg, #15803D 0%, #4ADE80 50%, #86EFAC 100%)',
  },
  amber: {
    label: 'Bursztyn',
    css: 'linear-gradient(135deg, #B45309 0%, #F59E0B 50%, #FCD34D 100%)',
  },
  coral: { label: 'Koral', css: 'linear-gradient(135deg, #DC2626 0%, #FB7185 50%, #FECDD3 100%)' },
  mist: { label: 'Mgła', css: 'linear-gradient(135deg, #475569 0%, #94A3B8 50%, #CBD5E1 100%)' },
  lavender: {
    label: 'Lawenda',
    css: 'linear-gradient(135deg, #8B5CF6 0%, #C084FC 50%, #E9D5FF 100%)',
  },
  mint: { label: 'Mięta', css: 'linear-gradient(135deg, #0D9488 0%, #5EEAD4 50%, #99F6E4 100%)' },
  cyber: { label: 'Cyber', css: 'linear-gradient(135deg, #EC4899 0%, #8B5CF6 50%, #6366F1 100%)' },
  starlight: {
    label: 'Gwiazdy',
    css: 'linear-gradient(135deg, #1E1B4B 0%, #4338CA 50%, #818CF8 100%)',
  },
  peach: {
    label: 'Brzoskwinia',
    css: 'linear-gradient(135deg, #FB923C 0%, #FDBA74 50%, #FED7AA 100%)',
  },
};

export const MOOD_ICONS = {
  great: { Icon: Sparkles, color: 'text-yellow-400' },
  good: { Icon: Heart, color: 'text-pink-400' },
  neutral: { Icon: Minus, color: 'text-muted-foreground' },
  bad: { Icon: ThumbsDown, color: 'text-orange-400' },
  terrible: { Icon: Frown, color: 'text-red-400' },
} as const;

export const MOOD_OPTIONS: {
  value: DiaryMood;
  label: string;
  Icon: typeof Sparkles;
  color: string;
}[] = [
  { value: 'great', label: 'Świetnie', Icon: Sparkles, color: 'text-yellow-400' },
  { value: 'good', label: 'Dobrze', Icon: Heart, color: 'text-pink-400' },
  { value: 'neutral', label: 'Neutralnie', Icon: Minus, color: 'text-muted-foreground' },
  { value: 'bad', label: 'Słabo', Icon: ThumbsDown, color: 'text-orange-400' },
  { value: 'terrible', label: 'Okropnie', Icon: Frown, color: 'text-red-400' },
];

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' });
}
