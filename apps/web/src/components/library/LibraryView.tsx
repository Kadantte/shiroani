import { useEffect, useMemo, useCallback } from 'react';
import { Search, LayoutGrid, List, BookOpen, Globe, SearchX } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { AnimeCard } from '@/components/library/AnimeCard';
import { AnimeDetailModal } from '@/components/library/AnimeDetailModal';
import { useBrowserStore } from '@/stores/useBrowserStore';
import { useAppStore } from '@/stores/useAppStore';
import type { AnimeStatus, AnimeEntry } from '@shiroani/shared';

const FILTER_TABS: { value: AnimeStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Wszystkie' },
  { value: 'watching', label: 'Ogladam' },
  { value: 'completed', label: 'Ukonczone' },
  { value: 'plan_to_watch', label: 'Planowane' },
  { value: 'on_hold', label: 'Wstrzymane' },
  { value: 'dropped', label: 'Porzucone' },
];

export function LibraryView() {
  const {
    entries,
    activeFilter,
    searchQuery,
    viewMode,
    isDetailOpen,
    selectedEntry,
    setFilter,
    setSearchQuery,
    setViewMode,
    openDetail,
    closeDetail,
    removeFromLibrary,
    getFilteredEntries,
    initListeners,
    cleanupListeners,
  } = useLibraryStore();

  const { openTab } = useBrowserStore();
  const navigateTo = useAppStore(s => s.navigateTo);

  // Navigate to the browser view and open the resume URL
  const handleContinue = useCallback(
    (entry: AnimeEntry) => {
      if (!entry.resumeUrl) return;
      openTab(entry.resumeUrl);
      navigateTo('browser');
    },
    [openTab, navigateTo]
  );

  // Initialize socket listeners
  useEffect(() => {
    initListeners();
    return () => cleanupListeners();
  }, [initListeners, cleanupListeners]);

  const filteredEntries = useMemo(
    () => getFilteredEntries(),
    [getFilteredEntries, entries, activeFilter, searchQuery]
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-6 pt-5 pb-3 space-y-3 border-b border-border bg-card/30">
        {/* Title row */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-foreground">Moja Biblioteka</h1>
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="w-8 h-8"
                  onClick={() => setViewMode('grid')}
                >
                  <LayoutGrid className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Widok siatki</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="w-8 h-8"
                  onClick={() => setViewMode('list')}
                >
                  <List className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Widok listy</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Szukaj w bibliotece..."
            className="pl-8 h-8 text-sm bg-background/50"
          />
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
          {FILTER_TABS.map(tab => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value)}
              className={cn(
                'px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap',
                'transition-all duration-150',
                activeFilter === tab.value
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4 py-16">
            {searchQuery ? (
              <>
                <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center">
                  <SearchX className="w-7 h-7 opacity-40" />
                </div>
                <div className="text-center space-y-1.5">
                  <p className="text-sm font-medium text-foreground/70">Brak wynikow</p>
                  <p className="text-xs text-muted-foreground/60 max-w-[200px]">
                    Sprobuj innych slow kluczowych lub zmien filtr statusu
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <BookOpen className="w-7 h-7 text-primary/40" />
                </div>
                <div className="text-center space-y-1.5">
                  <p className="text-sm font-medium text-foreground/70">
                    Twoja biblioteka jest pusta
                  </p>
                  <p className="text-xs text-muted-foreground/60 max-w-[240px]">
                    Przejdz do przegladarki i dodaj anime klikajac ikone zakladki na pasku
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-1 gap-1.5 text-xs"
                  onClick={() => navigateTo('browser')}
                >
                  <Globe className="w-3.5 h-3.5" />
                  Otworz przegladarke
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
                onSelect={openDetail}
                onContinue={handleContinue}
                onRemove={e => removeFromLibrary(e.id)}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-1">
            {filteredEntries.map(entry => (
              <div
                key={entry.id}
                onClick={() => openDetail(entry)}
                className={cn(
                  'flex items-center gap-3 p-2 rounded-lg cursor-pointer',
                  'hover:bg-accent/50 transition-colors duration-150'
                )}
              >
                {entry.coverImage ? (
                  <img
                    src={entry.coverImage}
                    alt={entry.title}
                    className="w-10 h-14 rounded object-cover shrink-0"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-10 h-14 rounded bg-muted shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium truncate">{entry.title}</h3>
                  <p className="text-xs text-muted-foreground">
                    Odc. {entry.currentEpisode}
                    {entry.episodes ? `/${entry.episodes}` : ''} &middot;{' '}
                    {FILTER_TABS.find(f => f.value === entry.status)?.label ?? entry.status}
                  </p>
                </div>
                {entry.score != null && entry.score > 0 && (
                  <span className="text-xs font-medium text-primary shrink-0">
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
    </div>
  );
}
