import { useCallback, useEffect, useMemo, useState } from 'react';
import { NotebookPen, Plus, SearchX, Download, Upload, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
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
import { useDiaryStore, getFilteredDiaryEntries } from '@/stores/useDiaryStore';
import { DiaryEntryGrid } from './DiaryEntryGrid';
import { DiaryEditor } from './DiaryEditor';
import { pluralize } from '@shiroani/shared';
import type { DiaryEntry } from '@shiroani/shared';
import type { DiarySortBy } from '@/stores/useDiaryStore';

const DIARY_FILTER_OPTIONS = [
  { value: 'all' as const, label: 'Wszystkie' },
  { value: 'pinned' as const, label: 'Przypięte' },
  { value: 'with_anime' as const, label: 'Z anime' },
];

const DIARY_SORT_OPTIONS = [
  { value: 'createdAt', label: 'Data utworzenia' },
  { value: 'updatedAt', label: 'Data edycji' },
  { value: 'title', label: 'Tytuł' },
] as const;

const {
  setFilter,
  setSearchQuery,
  setViewMode,
  setSort,
  openEditor,
  closeEditor,
  createEntry,
  updateEntry,
  removeEntry,
  fetchEntries,
  initListeners,
  cleanupListeners,
} = useDiaryStore.getState();

export function DiaryView() {
  const entries = useDiaryStore(s => s.entries);
  const activeFilter = useDiaryStore(s => s.activeFilter);
  const searchQuery = useDiaryStore(s => s.searchQuery);
  const viewMode = useDiaryStore(s => s.viewMode);
  const sortBy = useDiaryStore(s => s.sortBy);
  const sortOrder = useDiaryStore(s => s.sortOrder);
  const isEditorOpen = useDiaryStore(s => s.isEditorOpen);
  const selectedEntry = useDiaryStore(s => s.selectedEntry);

  const [entryToRemove, setEntryToRemove] = useState<DiaryEntry | null>(null);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);

  const handleSortChange = useCallback(
    (value: string) => {
      setSort(value as DiarySortBy, sortOrder);
    },
    [sortOrder]
  );

  const toggleSortOrder = useCallback(() => {
    setSort(sortBy, sortOrder === 'asc' ? 'desc' : 'asc');
  }, [sortBy, sortOrder]);

  const handleTogglePin = useCallback(
    (e: DiaryEntry) => updateEntry({ id: e.id, isPinned: !e.isPinned }),
    []
  );

  useEffect(() => {
    initListeners();
    fetchEntries();
    return () => cleanupListeners();
  }, [initListeners, fetchEntries, cleanupListeners]);

  const filteredEntries = useMemo(
    () => getFilteredDiaryEntries({ entries, activeFilter, searchQuery, sortBy, sortOrder }),
    [entries, activeFilter, searchQuery, sortBy, sortOrder]
  );

  const subtitle =
    entries.length > 0
      ? `${entries.length} ${pluralize(entries.length, 'wpis', 'wpisy', 'wpisów')}`
      : undefined;

  return (
    <div className="flex-1 flex flex-col overflow-hidden animate-fade-in">
      {/* Header */}
      <ViewHeader
        icon={NotebookPen}
        title="Dziennik"
        subtitle={subtitle}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Szukaj w dzienniku..."
        filters={DIARY_FILTER_OPTIONS}
        activeFilter={activeFilter}
        onFilterChange={setFilter}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        actions={
          <>
            <Select value={sortBy} onValueChange={handleSortChange}>
              <SelectTrigger className="w-[170px] h-8 text-xs bg-background/40 border-border-glass focus:bg-background/60 transition-colors">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DIARY_SORT_OPTIONS.map(option => (
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
            <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={() => openEditor()}>
              <Plus className="w-3.5 h-3.5" />
              Nowy wpis
            </Button>
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
          </>
        }
      />

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
                  Spróbuj innych słów kluczowych lub zmień filtr
                </p>
              </div>
            </div>
          ) : (
            <EmptyState
              icon={NotebookPen}
              title="Twój dziennik jest pusty"
              subtitle="Zacznij zapisywać przemyślenia o anime, recenzje odcinków i notatki"
              action={{
                label: 'Napisz pierwszy wpis',
                icon: Plus,
                onClick: () => openEditor(),
              }}
            />
          )
        ) : (
          <DiaryEntryGrid
            entries={filteredEntries}
            viewMode={viewMode}
            onSelect={openEditor}
            onRemove={setEntryToRemove}
            onTogglePin={handleTogglePin}
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

      {/* Export/Import dialogs */}
      <ExportDialog open={isExportOpen} onOpenChange={setIsExportOpen} type="diary" />
      <ImportDialog open={isImportOpen} onOpenChange={setIsImportOpen} type="diary" />

      {/* Confirm removal dialog (single instance) */}
      <ConfirmDialog
        open={!!entryToRemove}
        onOpenChange={open => {
          if (!open) setEntryToRemove(null);
        }}
        title="Usuń wpis"
        description={`Czy na pewno chcesz usunąć "${entryToRemove?.title || 'Bez tytułu'}" z dziennika?`}
        onConfirm={() => {
          if (entryToRemove) {
            removeEntry(entryToRemove.id);
            setEntryToRemove(null);
          }
        }}
      />
    </div>
  );
}
