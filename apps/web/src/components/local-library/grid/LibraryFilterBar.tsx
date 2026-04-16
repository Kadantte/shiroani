import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { LibraryRoot } from '@shiroani/shared';
import type {
  LibraryFilters,
  LibraryMatchFilter,
  LibrarySortMode,
} from '@/stores/useLocalLibraryStore';

const SORT_OPTIONS: Array<{ value: LibrarySortMode; label: string }> = [
  { value: 'recent', label: 'Ostatnio dodane' },
  { value: 'alphabetical', label: 'Alfabetycznie' },
  { value: 'recently-watched', label: 'Ostatnio oglądane' },
];

const MATCH_OPTIONS: Array<{ value: LibraryMatchFilter; label: string }> = [
  { value: 'all', label: 'Wszystkie' },
  { value: 'unmatched', label: 'Niedopasowane' },
  { value: 'matched', label: 'Dopasowane' },
];

interface LibraryFilterBarProps {
  filters: LibraryFilters;
  roots: LibraryRoot[];
  onChange: (patch: Partial<LibraryFilters>) => void;
  resultsCount: number;
  totalCount: number;
}

export function LibraryFilterBar({
  filters,
  roots,
  onChange,
  resultsCount,
  totalCount,
}: LibraryFilterBarProps) {
  const toggleRoot = (id: number) => {
    const selected = new Set(filters.rootIds);
    if (selected.has(id)) selected.delete(id);
    else selected.add(id);
    onChange({ rootIds: Array.from(selected) });
  };

  const clearRoots = () => onChange({ rootIds: [] });

  const showRootChips = roots.length > 1;
  const allSelected = filters.rootIds.length === 0;

  return (
    <div className="px-5 pt-4 space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/60 pointer-events-none" />
          <Input
            value={filters.search}
            onChange={e => onChange({ search: e.target.value })}
            placeholder="Szukaj w bibliotece..."
            className="h-8 pl-9 pr-8 text-xs bg-background/40 border-border-glass focus-visible:bg-background/60 transition-colors"
            aria-label="Szukaj serii"
          />
          {filters.search && (
            <button
              type="button"
              onClick={() => onChange({ search: '' })}
              aria-label="Wyczyść wyszukiwanie"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-muted/50 transition-colors"
            >
              <X className="w-3 h-3 text-muted-foreground/70" />
            </button>
          )}
        </div>

        <Select
          value={filters.matchStatus}
          onValueChange={v => onChange({ matchStatus: v as LibraryMatchFilter })}
        >
          <SelectTrigger className="w-[150px] h-8 text-xs bg-background/40 border-border-glass focus:bg-background/60 transition-colors">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MATCH_OPTIONS.map(option => (
              <SelectItem key={option.value} value={option.value} className="text-xs">
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.sort} onValueChange={v => onChange({ sort: v as LibrarySortMode })}>
          <SelectTrigger className="w-[180px] h-8 text-xs bg-background/40 border-border-glass focus:bg-background/60 transition-colors">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map(option => (
              <SelectItem key={option.value} value={option.value} className="text-xs">
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="ml-auto text-[11px] text-muted-foreground/70">
          {resultsCount === totalCount ? `${totalCount} serii` : `${resultsCount} z ${totalCount}`}
        </div>
      </div>

      {showRootChips && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={clearRoots}
            className={cn(
              'rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors border',
              allSelected
                ? 'bg-primary/15 border-primary/30 text-primary'
                : 'bg-card/40 border-border/50 text-muted-foreground/70 hover:text-foreground'
            )}
          >
            Wszystkie foldery
          </button>
          {roots.map(root => {
            const isActive = filters.rootIds.includes(root.id);
            const label = root.label ?? root.path.split(/[\\/]/).pop() ?? root.path;
            return (
              <button
                key={root.id}
                type="button"
                onClick={() => toggleRoot(root.id)}
                title={root.path}
                className={cn(
                  'rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors border max-w-[220px] truncate',
                  isActive
                    ? 'bg-primary/15 border-primary/30 text-primary'
                    : 'bg-card/40 border-border/50 text-muted-foreground/80 hover:text-foreground'
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
