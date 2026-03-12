import { cn } from '@/lib/utils';
import { DIARY_GRADIENTS } from '@/lib/diary-constants';
import type { DiaryGradient } from '@shiroani/shared';

interface GradientPickerProps {
  value: DiaryGradient | undefined;
  onChange: (gradient: DiaryGradient | undefined) => void;
}

export function GradientPicker({ value, onChange }: GradientPickerProps) {
  return (
    <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-border/30 bg-card/50 overflow-x-auto scrollbar-hide">
      <span className="text-2xs text-muted-foreground/60 mr-1">Okładka:</span>
      {Object.entries(DIARY_GRADIENTS).map(([key, { label, css }]) => (
        <button
          key={key}
          onClick={() => onChange(key as DiaryGradient)}
          title={label}
          aria-label={label}
          aria-pressed={value === key}
          className={cn(
            'w-5 h-5 rounded-full border-2 transition-all duration-150 hover:scale-110',
            value === key
              ? 'border-primary ring-2 ring-primary/30 scale-110'
              : 'border-transparent hover:border-foreground/20'
          )}
          style={{ background: css }}
        />
      ))}
      {value && (
        <button
          onClick={() => onChange(undefined)}
          aria-label="Usuń okładkę"
          className="ml-1 text-2xs text-muted-foreground/50 hover:text-foreground/70 transition-colors"
        >
          Usuń
        </button>
      )}
    </div>
  );
}
