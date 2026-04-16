import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FolderOpen, Image as ImageIcon, Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';
import type { AniListSearchHit, PosterKind } from '@shiroani/shared';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useLocalLibraryStore } from '@/stores/useLocalLibraryStore';

interface PosterPickerDialogProps {
  seriesId: number;
  kind: PosterKind;
  open: boolean;
  onClose: () => void;
  /** Pre-seeded search term — usually the series's display or parsed title. */
  initialQuery?: string;
}

type Tab = 'search' | 'file';

const SEARCH_DEBOUNCE_MS = 300;

function titleOf(hit: AniListSearchHit): string {
  return hit.titleRomaji ?? hit.titleEnglish ?? hit.titleNative ?? `#${hit.anilistId}`;
}

export function PosterPickerDialog({
  seriesId,
  kind,
  open,
  onClose,
  initialQuery,
}: PosterPickerDialogProps) {
  const searchAniList = useLocalLibraryStore(s => s.searchAniList);
  const setFromUrl = useLocalLibraryStore(s => s.setSeriesArtworkFromUrl);
  const setFromFile = useLocalLibraryStore(s => s.setSeriesArtworkFromFile);

  const [tab, setTab] = useState<Tab>('search');
  const [query, setQuery] = useState(initialQuery ?? '');
  const [results, setResults] = useState<AniListSearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedHit, setSelectedHit] = useState<AniListSearchHit | null>(null);
  const [localFilePath, setLocalFilePath] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Reset local state whenever the dialog opens so reopening on a different
  // series doesn't leak a stale selection.
  useEffect(() => {
    if (!open) return;
    setTab('search');
    setQuery(initialQuery ?? '');
    setResults([]);
    setSearchError(null);
    setSelectedHit(null);
    setLocalFilePath(null);
    setSubmitting(false);
  }, [open, initialQuery]);

  // Debounced AniList search. Aborted when the query changes mid-flight
  // by tagging each fetch with a token we compare after it resolves.
  const fetchTokenRef = useRef(0);
  useEffect(() => {
    if (!open || tab !== 'search') return;
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setSearchError(null);
      setSearching(false);
      return;
    }
    const token = ++fetchTokenRef.current;
    const timer = setTimeout(async () => {
      setSearching(true);
      setSearchError(null);
      try {
        const hits = await searchAniList(trimmed);
        if (fetchTokenRef.current !== token) return;
        setResults(hits);
      } catch (err) {
        if (fetchTokenRef.current !== token) return;
        const message = err instanceof Error ? err.message : String(err);
        setResults([]);
        setSearchError(message);
      } finally {
        if (fetchTokenRef.current === token) setSearching(false);
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, tab, open, searchAniList]);

  const handlePickLocalFile = useCallback(async () => {
    if (typeof window === 'undefined' || !window.shiroaniLocalLibrary?.pickFile) {
      toast.error('Wybór pliku jest dostępny tylko w aplikacji.');
      return;
    }
    try {
      const result = await window.shiroaniLocalLibrary.pickFile({
        title: kind === 'poster' ? 'Wybierz plakat' : 'Wybierz baner',
        filters: [{ name: 'Obrazy', extensions: ['png', 'jpg', 'jpeg', 'webp'] }],
      });
      if (result.cancelled || !result.path) return;
      setLocalFilePath(result.path);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }, [kind]);

  const handleSubmitUrl = useCallback(
    async (hit: AniListSearchHit) => {
      const url = kind === 'poster' ? hit.coverImageUrl : hit.bannerImageUrl;
      if (!url) {
        toast.error(
          kind === 'poster' ? 'Ten tytuł nie ma dużego plakatu.' : 'Ten tytuł nie ma banera.'
        );
        return;
      }
      setSubmitting(true);
      try {
        await setFromUrl(seriesId, kind, url);
        toast.success(kind === 'poster' ? 'Plakat zaktualizowany.' : 'Baner zaktualizowany.');
        onClose();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : String(err));
      } finally {
        setSubmitting(false);
      }
    },
    [kind, onClose, seriesId, setFromUrl]
  );

  const handleSubmitFile = useCallback(async () => {
    if (!localFilePath) return;
    setSubmitting(true);
    try {
      await setFromFile(seriesId, kind, localFilePath);
      toast.success(kind === 'poster' ? 'Plakat zaktualizowany.' : 'Baner zaktualizowany.');
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }, [kind, localFilePath, onClose, seriesId, setFromFile]);

  const title = kind === 'poster' ? 'Zmień plakat serii' : 'Zmień baner serii';
  const description =
    kind === 'poster'
      ? 'Wyszukaj plakat w AniList lub wybierz obraz z komputera.'
      : 'Wyszukaj baner w AniList lub wybierz obraz z komputera.';

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {/* Tab switch */}
        <div className="flex items-center gap-1 rounded-md border border-border/60 bg-card/40 p-1 w-fit">
          <TabButton
            active={tab === 'search'}
            onClick={() => setTab('search')}
            icon={<Search className="w-3.5 h-3.5" />}
            label="Wyszukaj AniList"
          />
          <TabButton
            active={tab === 'file'}
            onClick={() => setTab('file')}
            icon={<FolderOpen className="w-3.5 h-3.5" />}
            label="Z komputera"
          />
        </div>

        {tab === 'search' ? (
          <SearchTab
            kind={kind}
            query={query}
            onQueryChange={setQuery}
            results={results}
            searching={searching}
            searchError={searchError}
            selectedHit={selectedHit}
            onSelectHit={setSelectedHit}
            onSubmit={handleSubmitUrl}
            submitting={submitting}
          />
        ) : (
          <FileTab
            kind={kind}
            filePath={localFilePath}
            onPickFile={handlePickLocalFile}
            onSubmit={handleSubmitFile}
            submitting={submitting}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors',
        active ? 'bg-primary/20 text-primary' : 'text-muted-foreground/80 hover:text-foreground'
      )}
    >
      {icon}
      {label}
    </button>
  );
}

// -------------------- Search tab --------------------

interface SearchTabProps {
  kind: PosterKind;
  query: string;
  onQueryChange: (v: string) => void;
  results: AniListSearchHit[];
  searching: boolean;
  searchError: string | null;
  selectedHit: AniListSearchHit | null;
  onSelectHit: (hit: AniListSearchHit | null) => void;
  onSubmit: (hit: AniListSearchHit) => void;
  submitting: boolean;
}

function SearchTab({
  kind,
  query,
  onQueryChange,
  results,
  searching,
  searchError,
  selectedHit,
  onSelectHit,
  onSubmit,
  submitting,
}: SearchTabProps) {
  const trimmedQuery = query.trim();

  return (
    <div className="flex flex-col gap-3 max-h-[60vh] min-h-[300px]">
      <Input
        autoFocus
        placeholder="Wpisz tytuł anime…"
        value={query}
        onChange={e => onQueryChange(e.target.value)}
      />

      {searchError && (
        <p className="text-xs text-destructive" role="alert">
          {searchError}
        </p>
      )}

      {!trimmedQuery && !searching && (
        <p className="text-xs text-muted-foreground/70">
          Zacznij pisać, aby wyszukać tytuł w AniList.
        </p>
      )}

      {trimmedQuery && !searching && results.length === 0 && !searchError && (
        <p className="text-xs text-muted-foreground/70">Brak wyników dla tego zapytania.</p>
      )}

      {/* Results grid */}
      {results.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 overflow-y-auto pr-1">
          {results.map(hit => (
            <ResultCard
              key={hit.anilistId}
              hit={hit}
              selected={selectedHit?.anilistId === hit.anilistId}
              onSelect={() => onSelectHit(hit)}
            />
          ))}
        </div>
      )}

      {searching && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground/80">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Wyszukiwanie…
        </div>
      )}

      {/* Preview of selected hit */}
      {selectedHit && (
        <SelectedHitPreview
          hit={selectedHit}
          kind={kind}
          submitting={submitting}
          onSubmit={() => onSubmit(selectedHit)}
        />
      )}
    </div>
  );
}

function ResultCard({
  hit,
  selected,
  onSelect,
}: {
  hit: AniListSearchHit;
  selected: boolean;
  onSelect: () => void;
}) {
  const title = titleOf(hit);
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'group relative rounded-md overflow-hidden border transition-all text-left',
        selected ? 'border-primary ring-2 ring-primary/40' : 'border-border/60 hover:border-border'
      )}
    >
      <div className="aspect-[3/4] bg-muted/30">
        {hit.coverImageUrl ? (
          <img
            src={hit.coverImageUrl}
            alt={title}
            loading="lazy"
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="w-6 h-6 text-muted-foreground/40" />
          </div>
        )}
      </div>
      <div className="p-2">
        <p className="text-[11px] font-medium text-foreground/90 truncate">{title}</p>
        <p className="text-[10px] text-muted-foreground/70 truncate">
          {[hit.format, hit.seasonYear].filter(Boolean).join(' • ') || '—'}
        </p>
      </div>
    </button>
  );
}

function SelectedHitPreview({
  hit,
  kind,
  submitting,
  onSubmit,
}: {
  hit: AniListSearchHit;
  kind: PosterKind;
  submitting: boolean;
  onSubmit: () => void;
}) {
  const url = kind === 'poster' ? hit.coverImageUrl : hit.bannerImageUrl;
  const missing =
    (kind === 'poster' && !hit.coverImageUrl) || (kind === 'banner' && !hit.bannerImageUrl);

  return (
    <div className="mt-2 border-t border-border/40 pt-3">
      <div className="flex items-start gap-3">
        {kind === 'poster' && hit.coverImageUrl ? (
          <img
            src={hit.coverImageUrl}
            alt=""
            aria-hidden
            referrerPolicy="no-referrer"
            className="w-24 aspect-[3/4] rounded object-cover border border-border/40"
          />
        ) : kind === 'banner' && hit.bannerImageUrl ? (
          <img
            src={hit.bannerImageUrl}
            alt=""
            aria-hidden
            referrerPolicy="no-referrer"
            className="w-60 aspect-[21/9] rounded object-cover border border-border/40"
          />
        ) : (
          <div
            className={cn(
              'flex items-center justify-center bg-muted/30 border border-border/40 rounded',
              kind === 'poster' ? 'w-24 aspect-[3/4]' : 'w-60 aspect-[21/9]'
            )}
          >
            <ImageIcon className="w-5 h-5 text-muted-foreground/50" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{titleOf(hit)}</p>
          <p className="text-[11px] text-muted-foreground/70 truncate">
            {[hit.format, hit.seasonYear].filter(Boolean).join(' • ') || '—'}
          </p>
          {missing && (
            <p className="text-[11px] text-amber-400/90 mt-1">
              {kind === 'poster' ? 'Ten tytuł nie ma dużego plakatu.' : 'Ten tytuł nie ma banera.'}
            </p>
          )}
          <div className="mt-3 flex justify-end">
            <Button size="sm" onClick={onSubmit} disabled={!url || submitting} className="gap-1.5">
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {kind === 'poster' ? 'Ustaw plakat' : 'Ustaw baner'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// -------------------- File tab --------------------

interface FileTabProps {
  kind: PosterKind;
  filePath: string | null;
  onPickFile: () => void;
  onSubmit: () => void;
  submitting: boolean;
}

function FileTab({ kind, filePath, onPickFile, onSubmit, submitting }: FileTabProps) {
  // Convert the absolute path to a file:// URL for the preview <img>. This
  // bypasses the custom protocol (which only serves cached copies) and lets
  // the user see the source image before confirming.
  const previewSrc = useMemo(() => {
    if (!filePath) return null;
    const normalised = filePath.replace(/\\/g, '/');
    return normalised.startsWith('/') ? `file://${normalised}` : `file:///${normalised}`;
  }, [filePath]);

  return (
    <div className="flex flex-col gap-3 min-h-[300px]">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onPickFile} className="gap-2">
          <FolderOpen className="w-3.5 h-3.5" />
          Przeglądaj…
        </Button>
        {filePath && (
          <span className="text-xs text-muted-foreground/80 truncate flex-1" title={filePath}>
            {filePath}
          </span>
        )}
      </div>

      <p className="text-[11px] text-muted-foreground/70">
        Obsługiwane formaty: PNG, JPG, WEBP. Maksymalny rozmiar: 20 MB.
      </p>

      {previewSrc && (
        <div className="flex justify-center py-4">
          <img
            src={previewSrc}
            alt=""
            aria-hidden
            className={cn(
              'rounded border border-border/40 object-cover',
              kind === 'poster' ? 'w-40 aspect-[3/4]' : 'w-full max-w-md aspect-[21/9]'
            )}
          />
        </div>
      )}

      <div className="mt-auto flex justify-end">
        <Button onClick={onSubmit} disabled={!filePath || submitting} className="gap-1.5">
          {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {kind === 'poster' ? 'Ustaw plakat' : 'Ustaw baner'}
        </Button>
      </div>
    </div>
  );
}
