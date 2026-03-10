import { useCallback, useMemo, useState } from 'react';
import {
  Search,
  LayoutGrid,
  List,
  BookOpen,
  Globe,
  SearchX,
  BarChart3,
  Download,
  Upload,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { TooltipButton } from '@/components/ui/tooltip-button';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { ExportDialog } from '@/components/shared/ExportDialog';
import { ImportDialog } from '@/components/shared/ImportDialog';
import { useLibraryStore, getFilteredEntries } from '@/stores/useLibraryStore';
import { AnimeCard } from '@/components/library/AnimeCard';
import { AnimeDetailModal } from '@/components/library/AnimeDetailModal';
import { LibraryStats } from '@/components/library/LibraryStats';
import { useBrowserStore } from '@/stores/useBrowserStore';
import { useAppStore } from '@/stores/useAppStore';
import { STATUS_FILTER_OPTIONS } from '@/lib/constants';
import { CountdownBadge } from '@/components/library/CountdownBadge';
import { useNextAiringMap } from '@/hooks/useNextAiringMap';
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

  return (
    <div className="flex-1 flex flex-col overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="shrink-0 px-5 pt-4 pb-3 space-y-3 border-b border-border/60 bg-card/20 backdrop-blur-sm">
        {/* Title row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-foreground leading-tight">
                Moja Biblioteka
              </h1>
              {entries.length > 0 && (
                <p className="text-2xs text-muted-foreground/70 leading-tight">
                  {entries.length}{' '}
                  {entries.length === 1 ? 'pozycja' : entries.length < 5 ? 'pozycje' : 'pozycji'}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-0.5">
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
            <div className="w-px h-4 bg-border/50 mx-1" />
            <TooltipButton
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="icon"
              className={cn(
                'w-8 h-8',
                viewMode === 'grid' && 'bg-primary/10 text-primary hover:bg-primary/15'
              )}
              onClick={() => setViewMode('grid')}
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
              onClick={() => setViewMode('list')}
              tooltip="Widok listy"
            >
              <List className="w-4 h-4" />
            </TooltipButton>
          </div>
        </div>

        {/* Search bar */}
        <div className="relative group/search">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60 transition-colors group-focus-within/search:text-primary/70" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Szukaj w bibliotece..."
            className="pl-8 h-8 text-sm bg-background/40 border-border-glass focus:bg-background/60 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground/70 transition-colors"
            >
              <SearchX className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide -mx-1 px-1">
          {STATUS_FILTER_OPTIONS.map(tab => {
            const isActive = activeFilter === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => setFilter(tab.value)}
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

      {/* Stats dashboard */}
      {showStats && <LibraryStats />}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 pb-20">
        {filteredEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4 py-16">
            {searchQuery ? (
              <>
                <div className="w-14 h-14 rounded-2xl bg-muted/40 flex items-center justify-center border border-border-glass">
                  <SearchX className="w-7 h-7 opacity-40" />
                </div>
                <div className="text-center space-y-1.5">
                  <p className="text-sm font-medium text-foreground/70">Brak wyników</p>
                  <p className="text-xs text-muted-foreground/60 max-w-[200px]">
                    Spróbuj innych słów kluczowych lub zmień filtr statusu
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-2xl bg-primary/8 flex items-center justify-center border border-primary/10">
                  <BookOpen className="w-8 h-8 text-primary/30" />
                </div>
                <div className="text-center space-y-1.5">
                  <p className="text-sm font-medium text-foreground/70">
                    Twoja biblioteka jest pusta
                  </p>
                  <p className="text-xs text-muted-foreground/60 max-w-[240px]">
                    Przejdź do przeglądarki i dodaj anime klikając ikonę zakładki na pasku
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-1 gap-1.5 text-xs border-primary/20 text-primary hover:bg-primary/10 hover:text-primary"
                  onClick={() => navigateTo('browser')}
                >
                  <Globe className="w-3.5 h-3.5" />
                  Otwórz przeglądarkę
                </Button>
              </>
            )}
          </div>
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
              <div
                key={entry.id}
                onClick={() => openDetail(entry)}
                className={cn(
                  'flex items-center gap-3 p-2.5 rounded-xl cursor-pointer',
                  'hover:bg-accent/40 transition-all duration-150',
                  'border border-transparent hover:border-border-glass',
                  'group/list-item'
                )}
              >
                {entry.coverImage ? (
                  <img
                    src={entry.coverImage}
                    alt={entry.title}
                    className="w-10 h-14 rounded-lg object-cover shrink-0 border border-border-glass"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-10 h-14 rounded-lg bg-muted/50 shrink-0 border border-border-glass" />
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium truncate group-hover/list-item:text-primary transition-colors">
                    {entry.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Odc. {entry.currentEpisode}
                    {entry.episodes ? `/${entry.episodes}` : ''} &middot;{' '}
                    {STATUS_FILTER_OPTIONS.find(f => f.value === entry.status)?.label ??
                      entry.status}
                  </p>
                </div>
                {entry.anilistId && nextAiringMap.get(entry.anilistId) && (
                  <div className="shrink-0">
                    <CountdownBadge
                      airingAt={nextAiringMap.get(entry.anilistId)!.airingAt}
                      episode={nextAiringMap.get(entry.anilistId)!.episode}
                    />
                  </div>
                )}
                {entry.score != null && entry.score > 0 && (
                  <span className="text-xs font-semibold text-primary/80 shrink-0 tabular-nums">
                    {entry.score}/10
                  </span>
                )}
              </div>
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
