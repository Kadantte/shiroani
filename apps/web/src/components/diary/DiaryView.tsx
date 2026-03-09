import { useEffect, useMemo } from 'react';
import { Search, LayoutGrid, List, NotebookPen, Plus, SearchX } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { TooltipButton } from '@/components/ui/tooltip-button';
import { useDiaryStore, getFilteredDiaryEntries } from '@/stores/useDiaryStore';
import { DiaryEntryGrid } from './DiaryEntryGrid';
import { DiaryEditor } from './DiaryEditor';

const DIARY_FILTER_OPTIONS = [
  { value: 'all' as const, label: 'Wszystkie' },
  { value: 'pinned' as const, label: 'Przypięte' },
  { value: 'with_anime' as const, label: 'Z anime' },
];

export function DiaryView() {
  const {
    entries,
    activeFilter,
    searchQuery,
    viewMode,
    isEditorOpen,
    selectedEntry,
    setFilter,
    setSearchQuery,
    setViewMode,
    openEditor,
    closeEditor,
    createEntry,
    updateEntry,
    removeEntry,
    initListeners,
    cleanupListeners,
  } = useDiaryStore();

  useEffect(() => {
    initListeners();
    return () => cleanupListeners();
  }, [initListeners, cleanupListeners]);

  const filteredEntries = useMemo(
    () => getFilteredDiaryEntries({ entries, activeFilter, searchQuery }),
    [entries, activeFilter, searchQuery]
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden animate-fade-in">
      {/* Header — same pattern as LibraryView */}
      <div className="shrink-0 px-5 pt-4 pb-3 space-y-3 border-b border-border/60 bg-card/20 backdrop-blur-sm">
        {/* Title row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <NotebookPen className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-foreground leading-tight">Dziennik</h1>
              {entries.length > 0 && (
                <p className="text-2xs text-muted-foreground/70 leading-tight">
                  {entries.length}{' '}
                  {entries.length === 1 ? 'wpis' : entries.length < 5 ? 'wpisy' : 'wpisów'}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={() => openEditor()}>
              <Plus className="w-3.5 h-3.5" />
              Nowy wpis
            </Button>
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

        {/* Search */}
        <div className="relative group/search">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60 transition-colors group-focus-within/search:text-primary/70" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Szukaj w dzienniku..."
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
          {DIARY_FILTER_OPTIONS.map(tab => {
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
                    Spróbuj innych słów kluczowych lub zmień filtr
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-2xl bg-primary/8 flex items-center justify-center border border-primary/10">
                  <NotebookPen className="w-8 h-8 text-primary/30" />
                </div>
                <div className="text-center space-y-1.5">
                  <p className="text-sm font-medium text-foreground/70">Twój dziennik jest pusty</p>
                  <p className="text-xs text-muted-foreground/60 max-w-[240px]">
                    Zacznij pisać swoje przemyślenia o anime, recenzje odcinków i notatki
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-1 gap-1.5 text-xs border-primary/20 text-primary hover:bg-primary/10 hover:text-primary"
                  onClick={() => openEditor()}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Napisz pierwszy wpis
                </Button>
              </>
            )}
          </div>
        ) : (
          <DiaryEntryGrid
            entries={filteredEntries}
            viewMode={viewMode}
            onSelect={openEditor}
            onRemove={e => removeEntry(e.id)}
            onTogglePin={e => updateEntry({ id: e.id, isPinned: !e.isPinned })}
          />
        )}
      </div>

      {/* Editor dialog */}
      {isEditorOpen && (
        <DiaryEditor
          entry={selectedEntry}
          open={isEditorOpen}
          onClose={closeEditor}
          onCreate={createEntry}
          onUpdate={updateEntry}
        />
      )}
    </div>
  );
}
