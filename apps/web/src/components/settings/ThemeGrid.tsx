import { Copy, type LucideIcon } from 'lucide-react';
import { ThemeSwatch } from '@/components/settings/ThemeSwatch';
import { cn } from '@/lib/utils';
import type { ThemeOption } from '@/lib/theme';
import type { Theme } from '@shiroani/shared';

interface ThemeGridProps {
  themes: ThemeOption[];
  label: string;
  icon?: LucideIcon;
  activeTheme: Theme;
  onSelect: (theme: Theme) => void;
  onPreview: (theme: Theme) => void;
  onPreviewEnd: () => void;
  onClone: (sourceTheme: string) => void;
  /** Optional trailing content in the header row (e.g. import button). */
  action?: React.ReactNode;
  className?: string;
}

export function ThemeGrid({
  themes,
  label,
  icon: Icon,
  activeTheme,
  onSelect,
  onPreview,
  onPreviewEnd,
  onClone,
  action,
  className,
}: ThemeGridProps) {
  return (
    <div className={cn('space-y-2.5', className)}>
      {/* Editorial divider label: mono, uppercase, with a thin rule */}
      <div className="flex items-center gap-2.5 text-muted-foreground">
        <span className="flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.18em] font-semibold">
          {Icon && <Icon className="w-3 h-3" aria-hidden="true" />}
          {label}
          <span className="tabular-nums text-muted-foreground/60">· {themes.length}</span>
        </span>
        <span className="flex-1 h-px bg-border-glass" />
        {action}
      </div>

      <div className="grid grid-cols-5 gap-2 sm:gap-2.5">
        {themes.map(opt => (
          <div key={opt.value} className="relative group">
            <ThemeSwatch
              option={opt}
              isActive={activeTheme === opt.value}
              onSelect={onSelect}
              onPreview={onPreview}
              onPreviewEnd={onPreviewEnd}
            />
            {/* Hover-reveal clone button */}
            <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
              <button
                onClick={e => {
                  e.stopPropagation();
                  onClone(opt.value);
                }}
                className="w-6 h-6 rounded bg-background/85 backdrop-blur-sm border border-border-glass flex items-center justify-center hover:bg-accent transition-colors focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`Klonuj motyw ${opt.label}`}
              >
                <Copy className="w-3 h-3 text-foreground" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
