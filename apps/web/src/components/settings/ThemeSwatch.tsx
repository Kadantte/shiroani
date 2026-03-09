import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ThemeOption } from '@/lib/theme';
import type { Theme } from '@shiroani/shared';

export function ThemeSwatch({
  option,
  isActive,
  onSelect,
  onPreview,
  onPreviewEnd,
}: {
  option: ThemeOption;
  isActive: boolean;
  onSelect: (theme: Theme) => void;
  onPreview: (theme: Theme) => void;
  onPreviewEnd: () => void;
}) {
  return (
    <button
      onClick={() => onSelect(option.value)}
      onMouseEnter={() => onPreview(option.value)}
      onMouseLeave={onPreviewEnd}
      className={cn(
        'relative flex flex-col items-center gap-2 p-2.5 rounded-xl',
        'transition-all duration-200',
        'hover:bg-accent/40 hover:scale-105',
        isActive && 'ring-2 ring-primary/70 bg-primary/10'
      )}
    >
      <div
        className={cn(
          'w-10 h-10 rounded-full border-2 shadow-sm transition-all duration-200',
          isActive ? 'border-primary/70 scale-110' : 'border-border-glass'
        )}
        style={{ backgroundColor: option.color }}
      >
        {isActive && (
          <div className="w-full h-full flex items-center justify-center">
            <Check className="w-4 h-4 text-white drop-shadow" />
          </div>
        )}
      </div>
      <span
        className={cn(
          'text-2xs truncate max-w-[70px] transition-colors',
          isActive ? 'text-primary font-medium' : 'text-muted-foreground'
        )}
      >
        {option.label}
      </span>
    </button>
  );
}
