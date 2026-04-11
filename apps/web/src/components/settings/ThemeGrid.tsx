import { Copy, type LucideIcon } from 'lucide-react';
import { ThemeSwatch } from '@/components/settings/ThemeSwatch';
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
}: ThemeGridProps) {
  return (
    <div className="mb-3">
      <p className="text-xs text-muted-foreground mb-2 ml-0.5 flex items-center gap-1.5">
        {Icon && <Icon className="w-3 h-3" />}
        {label}
      </p>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-1.5">
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
                className="w-7 h-7 rounded bg-background/80 backdrop-blur-sm border border-border-glass flex items-center justify-center hover:bg-accent transition-colors focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Klonuj motyw"
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
