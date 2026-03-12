import { useCallback, useMemo, useState } from 'react';
import { BookOpen, Globe, SearchX, BarChart3, Download, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TooltipButton } from '@/components/ui/tooltip-button';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { ExportDialog } from '@/components/shared/ExportDialog';
import { ImportDialog } from '@/components/shared/ImportDialog';
import { ViewHeader } from '@/components/shared/ViewHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { useLibraryStore, getFilteredEntries } from '@/stores/useLibraryStore';
import { AnimeCard } from '@/components/library/AnimeCard';
import { AnimeDetailModal } from '@/components/library/AnimeDetailModal';
import { LibraryListItem } from '@/components/library/LibraryListItem';
import { LibraryStats } from '@/components/library/LibraryStats';
import { useBrowserStore } from '@/stores/useBrowserStore';
import { useAppStore } from '@/stores/useAppStore';
import { STATUS_FILTER_OPTIONS } from '@/lib/constants';
import { useNextAiringMap } from '@/hooks/useNextAiringMap';
import { pluralize } from '@shiroani/shared';
import type { AnimeEntry } from '@shiroani/shared';

export function LibraryView() {
  const {
    entries,
    activeFilter,
    searchQuery,
    sortBy,
    sortOrder,
    viewMode,
    isDetailOpen,
    selectedEntry,
    setFilter,
    setSearchQuery,
    setViewMode,
    openDetail,
    closeDetail,
    removeFromLibrary,
  } = useLibraryStore();

  const [showStats, setShowStats] = useState(false);
  const [entryToRemove, setEntryToRemove] = useState<AnimeEntry | null>(null);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);

  const { openTab } = useBrowserStore();
  const navigateTo = useAppStore(s => s.navigateTo);

  const nextAiringMap = useNextAiringMap();

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
        title="Moja Biblioteka"
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
        {filteredEntries.length === 0 ? (
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
