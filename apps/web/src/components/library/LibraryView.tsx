import { useCallback, useMemo, useState } from 'react';
import {
  BookOpen,
  Globe,
  SearchX,
  BarChart3,
  Download,
  Upload,
  ArrowUpDown,
  Dices,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TooltipButton } from '@/components/ui/tooltip-button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { ExportDialog } from '@/components/shared/ExportDialog';
import { ImportDialog } from '@/components/shared/ImportDialog';
import { ViewHeader } from '@/components/shared/ViewHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { useLibraryStore, getFilteredEntries } from '@/stores/useLibraryStore';
import { AnimeCard } from '@/components/library/AnimeCard';
import { AnimeDetailModal } from '@/components/library/AnimeDetailModal';
import { LibraryListItem } from '@/components/library/LibraryListItem';
import { LibrarySkeleton } from '@/components/library/LibrarySkeleton';
import { LibraryStats } from '@/components/library/LibraryStats';
import { useBrowserStore } from '@/stores/useBrowserStore';
import { useAppStore } from '@/stores/useAppStore';
import { STATUS_FILTER_OPTIONS } from '@/lib/constants';
import { useNextAiringMap } from '@/hooks/useNextAiringMap';
import { pluralize } from '@shiroani/shared';
import type { AnimeEntry } from '@shiroani/shared';

const SORT_OPTIONS = [
  { value: 'title', label: 'Tytuł' },
  { value: 'score', label: 'Ocena' },
  { value: 'progress', label: 'Postęp' },
  { value: 'updatedAt', label: 'Ostatnia aktualizacja' },
] as const;

const {
  setFilter,
  setSearchQuery,
  setViewMode,
  setSort,
  openDetail,
  closeDetail,
  removeFromLibrary,
} = useLibraryStore.getState();

export function LibraryView() {
  const entries = useLibraryStore(s => s.entries);
  const activeFilter = useLibraryStore(s => s.activeFilter);
  const searchQuery = useLibraryStore(s => s.searchQuery);
  const sortBy = useLibraryStore(s => s.sortBy);
  const sortOrder = useLibraryStore(s => s.sortOrder);
  const viewMode = useLibraryStore(s => s.viewMode);
  const isLoading = useLibraryStore(s => s.isLoading);
  const isDetailOpen = useLibraryStore(s => s.isDetailOpen);
  const selectedEntry = useLibraryStore(s => s.selectedEntry);

  const [showStats, setShowStats] = useState(false);
  const [entryToRemove, setEntryToRemove] = useState<AnimeEntry | null>(null);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);

  const { openTab } = useBrowserStore();
  const navigateTo = useAppStore(s => s.navigateTo);

  const nextAiringMap = useNextAiringMap();

  const handleSortChange = useCallback(
    (value: string) => {
      setSort(value as 'title' | 'score' | 'progress' | 'updatedAt', sortOrder);
    },
    [sortOrder]
  );

  const toggleSortOrder = useCallback(() => {
    setSort(sortBy, sortOrder === 'asc' ? 'desc' : 'asc');
  }, [sortBy, sortOrder]);

  const handleRandomPick = useCallback(() => {
    const planToWatch = entries.filter(e => e.status === 'plan_to_watch');
    if (planToWatch.length === 0) return;
    const randomEntry = planToWatch[Math.floor(Math.random() * planToWatch.length)];
    openDetail(randomEntry);
  }, [entries]);

  // Navigate to the browser view and open the resume URL
  const handleContinue = useCallback(
    (entry: AnimeEntry) => {
      if (!entry.resumeUrl) return;
      openTab(entry.resumeUrl);
      navigateTo('browser');
    },
    [openTab, navigateTo]
  );

  const filteredEntries = useMemo(
    () => getFilteredEntries({ entries, activeFilter, searchQuery, sortBy, sortOrder }),
    [entries, activeFilter, searchQuery, sortBy, sortOrder]
  );

  const subtitle =
    entries.length > 0
      ? `${entries.length} ${pluralize(entries.length, 'pozycja', 'pozycje', 'pozycji')}`
      : undefined;

  return (
    <div className="flex-1 flex flex-col overflow-hidden animate-fade-in">
      {/* Header */}
      <ViewHeader
        icon={BookOpen}
        title="Moja biblioteka"
        subtitle={subtitle}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Szukaj w bibliotece..."
        filters={STATUS_FILTER_OPTIONS}
        activeFilter={activeFilter}
        onFilterChange={setFilter}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        actions={
          <>
            <Select value={sortBy} onValueChange={handleSortChange}>
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
            <TooltipButton
              variant="ghost"
              size="icon"
              className="w-8 h-8"
              onClick={toggleSortOrder}
              tooltip={sortOrder === 'asc' ? 'Rosnąco' : 'Malejąco'}
            >
              <ArrowUpDown
                className={cn('w-4 h-4 transition-transform', sortOrder === 'asc' && 'rotate-180')}
              />
            </TooltipButton>
            <div className="w-px h-4 bg-border/50 mx-1" />
            <TooltipButton
              variant="ghost"
              size="icon"
              className="w-8 h-8"
              onClick={() => setIsExportOpen(true)}
              tooltip="Eksportuj"
            >
              <Download className="w-4 h-4" />
            </TooltipButton>
            <TooltipButton
              variant="ghost"
              size="icon"
              className="w-8 h-8"
              onClick={() => setIsImportOpen(true)}
              tooltip="Importuj"
            >
              <Upload className="w-4 h-4" />
            </TooltipButton>
            <div className="w-px h-4 bg-border/50 mx-1" />
            <TooltipButton
              variant="ghost"
              size="icon"
              className="w-8 h-8"
              disabled={!entries.some(e => e.status === 'plan_to_watch')}
              onClick={handleRandomPick}
              tooltip="Losowe anime"
            >
              <Dices className="w-4 h-4" />
            </TooltipButton>
            <TooltipButton
              variant={showStats ? 'secondary' : 'ghost'}
              size="icon"
              className={cn(
                'w-8 h-8 transition-all duration-200',
                showStats && 'bg-primary/10 text-primary hover:bg-primary/15'
              )}
              onClick={() => setShowStats(v => !v)}
              tooltip="Statystyki"
            >
              <BarChart3 className="w-4 h-4" />
            </TooltipButton>
          </>
        }
      />

      {/* Stats dashboard */}
      {showStats && <LibraryStats />}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 pb-20">
        {isLoading ? (
          <LibrarySkeleton />
        ) : filteredEntries.length === 0 ? (
          searchQuery ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4 py-16">
              <div className="w-14 h-14 rounded-2xl bg-muted/40 flex items-center justify-center border border-border-glass">
                <SearchX className="w-7 h-7 opacity-40" />
              </div>
              <div className="text-center space-y-1.5">
                <p className="text-sm font-medium text-foreground/70">Brak wyników</p>
                <p className="text-xs text-muted-foreground/60 max-w-[200px]">
                  Spróbuj innych słów kluczowych lub zmień filtr statusu
                </p>
              </div>
            </div>
          ) : (
            <EmptyState
              icon={BookOpen}
              title="Twoja biblioteka jest pusta"
              subtitle="Przejdź do przeglądarki i dodaj anime klikając ikonę zakładki na pasku"
              action={{
                label: 'Otwórz przeglądarkę',
                icon: Globe,
                onClick: () => navigateTo('browser'),
              }}
            />
          )
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3">
            {filteredEntries.map(entry => (
              <AnimeCard
                key={entry.id}
                entry={entry}
                nextAiring={entry.anilistId ? (nextAiringMap.get(entry.anilistId) ?? null) : null}
                onSelect={openDetail}
                onContinue={handleContinue}
                onRemove={setEntryToRemove}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-0.5">
            {filteredEntries.map(entry => (
              <LibraryListItem
                key={entry.id}
                entry={entry}
                nextAiring={entry.anilistId ? (nextAiringMap.get(entry.anilistId) ?? null) : null}
                onClick={() => openDetail(entry)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Detail modal */}
      <AnimeDetailModal
        entry={selectedEntry}
        open={isDetailOpen}
        onOpenChange={open => {
          if (!open) closeDetail();
        }}
      />

      {/* Export/Import dialogs */}
      <ExportDialog open={isExportOpen} onOpenChange={setIsExportOpen} type="library" />
      <ImportDialog open={isImportOpen} onOpenChange={setIsImportOpen} type="library" />

      {/* Confirm removal dialog (single instance for all cards) */}
      <ConfirmDialog
        open={!!entryToRemove}
        onOpenChange={open => {
          if (!open) setEntryToRemove(null);
        }}
        title="Usuń z biblioteki"
        description={`Czy na pewno chcesz usunąć "${entryToRemove?.title}" z biblioteki?`}
        onConfirm={() => {
          if (entryToRemove) {
            removeFromLibrary(entryToRemove.id);
            setEntryToRemove(null);
          }
        }}
      />
    </div>
  );
}
