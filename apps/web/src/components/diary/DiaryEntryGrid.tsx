import { cn } from '@/lib/utils';
import { Pin, Sparkles, Heart, Minus, ThumbsDown, Frown } from 'lucide-react';
import type { DiaryEntry } from '@shiroani/shared';
import { DiaryEntryCard } from './DiaryEntryCard';

const DIARY_GRADIENTS: Record<string, string> = {
  sakura: 'linear-gradient(135deg, #FF92A8 0%, #FFB7C5 50%, #FFC8D6 100%)',
  twilight: 'linear-gradient(135deg, #7C3AED 0%, #A78BFA 50%, #C4B5FD 100%)',
  ocean: 'linear-gradient(135deg, #0284C7 0%, #38BDF8 50%, #7DD3FC 100%)',
  matcha: 'linear-gradient(135deg, #15803D 0%, #4ADE80 50%, #86EFAC 100%)',
  amber: 'linear-gradient(135deg, #B45309 0%, #F59E0B 50%, #FCD34D 100%)',
  coral: 'linear-gradient(135deg, #DC2626 0%, #FB7185 50%, #FECDD3 100%)',
  mist: 'linear-gradient(135deg, #475569 0%, #94A3B8 50%, #CBD5E1 100%)',
  lavender: 'linear-gradient(135deg, #8B5CF6 0%, #C084FC 50%, #E9D5FF 100%)',
  mint: 'linear-gradient(135deg, #0D9488 0%, #5EEAD4 50%, #99F6E4 100%)',
  cyber: 'linear-gradient(135deg, #EC4899 0%, #8B5CF6 50%, #6366F1 100%)',
  starlight: 'linear-gradient(135deg, #1E1B4B 0%, #4338CA 50%, #818CF8 100%)',
  peach: 'linear-gradient(135deg, #FB923C 0%, #FDBA74 50%, #FED7AA 100%)',
};

const MOOD_ICONS = {
  great: { Icon: Sparkles, color: 'text-yellow-400' },
  good: { Icon: Heart, color: 'text-pink-400' },
  neutral: { Icon: Minus, color: 'text-muted-foreground' },
  bad: { Icon: ThumbsDown, color: 'text-orange-400' },
  terrible: { Icon: Frown, color: 'text-red-400' },
} as const;

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' });
}

interface DiaryEntryGridProps {
  entries: DiaryEntry[];
  viewMode: 'grid' | 'list';
  onSelect: (entry: DiaryEntry) => void;
  onRemove: (entry: DiaryEntry) => void;
  onTogglePin: (entry: DiaryEntry) => void;
}

export function DiaryEntryGrid({
  entries,
  viewMode,
  onSelect,
  onRemove,
  onTogglePin,
}: DiaryEntryGridProps) {
  if (viewMode === 'grid') {
    return (
      <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
        {entries.map(entry => (
          <DiaryEntryCard
            key={entry.id}
            entry={entry}
            onSelect={onSelect}
            onRemove={onRemove}
            onTogglePin={onTogglePin}
          />
        ))}
      </div>
    );
  }

  // List view
  return (
    <div className="space-y-0.5">
      {entries.map(entry => {
        const gradient = entry.coverGradient ? DIARY_GRADIENTS[entry.coverGradient] : null;
        const MoodInfo = entry.mood ? MOOD_ICONS[entry.mood] : null;

        return (
          <div
            key={entry.id}
            onClick={() => onSelect(entry)}
            className={cn(
              'flex items-center gap-3 p-2.5 rounded-xl cursor-pointer',
              'hover:bg-accent/40 transition-all duration-150',
              'border border-transparent hover:border-border-glass',
              'group/list-item'
            )}
          >
            {/* Gradient accent bar */}
            <div
              className="w-1 h-10 rounded-full shrink-0"
              style={{ background: gradient ?? 'var(--muted)' }}
            />

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                {entry.isPinned && (
                  <Pin className="w-3 h-3 text-primary fill-primary rotate-45 shrink-0" />
                )}
                <h3 className="text-sm font-medium truncate group-hover/list-item:text-primary transition-colors">
                  {entry.title || 'Bez tytułu'}
                </h3>
              </div>
              <p className="text-xs text-muted-foreground/60 mt-0.5 truncate">
                {formatDate(entry.createdAt)}
                {entry.animeTitle && <> · {entry.animeTitle}</>}
              </p>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-2 shrink-0">
              {MoodInfo && <MoodInfo.Icon className={cn('w-3.5 h-3.5', MoodInfo.color)} />}
              {entry.tags?.slice(0, 1).map(tag => (
                <span
                  key={tag}
                  className="px-1.5 py-0.5 rounded-full text-2xs bg-primary/10 text-primary/70"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
