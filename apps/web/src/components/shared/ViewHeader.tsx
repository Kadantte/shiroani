import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Search, SearchX, LayoutGrid, List } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { TooltipButton } from '@/components/ui/tooltip-button';

interface FilterOption<T extends string = string> {
  value: T;
  label: string;
}

interface ViewHeaderProps<T extends string = string> {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  searchPlaceholder?: string;
  filters: FilterOption<T>[];
  activeFilter: T;
  onFilterChange: (filter: T) => void;
  viewMode?: 'grid' | 'list';
  onViewModeChange?: (mode: 'grid' | 'list') => void;
}

export function ViewHeader<T extends string = string>({
  icon: Icon,
  title,
  subtitle,
  actions,
  searchQuery,
  onSearchChange,
  searchPlaceholder = 'Szukaj...',
  filters,
  activeFilter,
  onFilterChange,
  viewMode,
  onViewModeChange,
}: ViewHeaderProps<T>) {
  return (
    <div className="shrink-0 px-5 pt-4 pb-3 space-y-3 border-b border-border/60 bg-card/20 backdrop-blur-sm">
      {/* Title row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-foreground leading-tight">{title}</h1>
            {subtitle && (
              <p className="text-2xs text-muted-foreground/70 leading-tight">{subtitle}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          {actions}
          {onViewModeChange && (
            <>
              <div className="w-px h-4 bg-border/50 mx-1" />
              <TooltipButton
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="icon"
                className={cn(
                  'w-8 h-8',
                  viewMode === 'grid' && 'bg-primary/10 text-primary hover:bg-primary/15'
                )}
                onClick={() => onViewModeChange('grid')}
                tooltip="Widok siatki"
              >
                <LayoutGrid className="w-4 h-4" />
              </TooltipButton>
              <TooltipButton
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="icon"
                className={cn(
                  'w-8 h-8',
                  viewMode === 'list' && 'bg-primary/10 text-primary hover:bg-primary/15'
                )}
                onClick={() => onViewModeChange('list')}
                tooltip="Widok listy"
              >
                <List className="w-4 h-4" />
              </TooltipButton>
            </>
          )}
        </div>
      </div>

      {/* Search bar */}
      <div className="relative group/search">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60 transition-colors group-focus-within/search:text-primary/70" />
        <Input
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="pl-8 h-8 text-sm bg-background/40 border-border-glass focus:bg-background/60 transition-colors"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground/70 transition-colors"
          >
            <SearchX className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide -mx-1 px-1">
        {filters.map(tab => {
          const isActive = activeFilter === tab.value;
          return (
            <button
              key={tab.value}
              onClick={() => onFilterChange(tab.value)}
              className={cn(
                'relative px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap',
                'transition-all duration-200',
                isActive
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground/80'
              )}
            >
              {tab.label}
              {isActive && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export type { FilterOption, ViewHeaderProps };
