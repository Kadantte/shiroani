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
        'relative flex flex-col items-center gap-1.5 p-2 rounded-lg',
        'transition-all duration-150',
        'hover:bg-accent/50',
        isActive && 'ring-2 ring-primary bg-accent/30'
      )}
    >
      <div
        className="w-8 h-8 rounded-full border-2 border-border shadow-sm"
        style={{ backgroundColor: option.color }}
      >
        {isActive && (
          <div className="w-full h-full flex items-center justify-center">
            <Check className="w-4 h-4 text-white drop-shadow" />
          </div>
        )}
      </div>
      <span className="text-2xs text-muted-foreground truncate max-w-[60px]">{option.label}</span>
    </button>
  );
}
