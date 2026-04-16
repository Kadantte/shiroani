import { useEffect, useMemo, useRef, useState } from 'react';
import { FolderOpen, FolderPlus, RefreshCw, SearchX, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/EmptyState';
import { useLocalLibraryStore, getFilteredSeries } from '@/stores/useLocalLibraryStore';
import { useFfmpegStore } from '@/stores/useFfmpegStore';
import { FfmpegSetupDialog } from '../ffmpeg/FfmpegSetupDialog';
import { ScanProgressBanner } from '../ScanProgressBanner';
import { LibraryHeader } from './LibraryHeader';
import { LibraryFilterBar } from './LibraryFilterBar';
import { ContinueWatchingRow } from './ContinueWatchingRow';
import { SeriesGrid } from './SeriesGrid';

export function LibraryGridView() {
  const roots = useLocalLibraryStore(s => s.roots);
  const series = useLocalLibraryStore(s => s.series);
  const filters = useLocalLibraryStore(s => s.filters);
  const seriesProgress = useLocalLibraryStore(s => s.seriesProgress);
  const continueWatching = useLocalLibraryStore(s => s.continueWatching);
  const scanProgress = useLocalLibraryStore(s => s.scanProgress);
  const isAddingRoot = useLocalLibraryStore(s => s.isAddingRoot);
  const error = useLocalLibraryStore(s => s.error);
  const pickAndAddRoot = useLocalLibraryStore(s => s.pickAndAddRoot);
  const removeRoot = useLocalLibraryStore(s => s.removeRoot);
  const startScan = useLocalLibraryStore(s => s.startScan);
  const rescanAll = useLocalLibraryStore(s => s.rescanAll);
  const cancelScan = useLocalLibraryStore(s => s.cancelScan);
  const updateFilters = useLocalLibraryStore(s => s.updateFilters);
  const openSeries = useLocalLibraryStore(s => s.openSeries);
  const openPlayer = useLocalLibraryStore(s => s.openPlayer);

  const ffmpegInstalled = useFfmpegStore(s => s.status.installed);

  const [setupOpen, setSetupOpen] = useState(false);
  const pendingAddRoot = useRef(false);

  // Mount-only hydration fallback for when the view renders after the socket
  // has already connected (the store's `onConnect` handles the first-connect
  // case). We read the store imperatively via `getState()` so this effect has
  // no reactive deps — previously depending on `roots.length`/`series.length`/
  // `isLoading` caused an infinite loop: `refreshRoots` toggles `isLoading`,
  // the promise resolves with an empty `roots: []`, the effect re-runs with
  // the same `roots.length === 0 && !isLoading` condition and fires again.
  useEffect(() => {
    const state = useLocalLibraryStore.getState();
    if (state.roots.length === 0 && !state.isLoading) {
      state.refreshRoots();
    }
    if (state.series.length === 0) {
      state.refreshSeries();
    }
    void state.refreshContinueWatching();
  }, []);

  const continueAddRoot = () => {
    pendingAddRoot.current = false;
    void pickAndAddRoot();
  };

  const handleAddFolder = () => {
    if (!ffmpegInstalled) {
      pendingAddRoot.current = true;
      setSetupOpen(true);
      return;
    }
    continueAddRoot();
  };

  const handleSetupOpenChange = (open: boolean) => {
    setSetupOpen(open);
    if (!open && pendingAddRoot.current && !ffmpegInstalled) {
      pendingAddRoot.current = false;
      toast.warning('FFmpeg jest wymagany, zanim dodasz folder z plikami.');
    }
  };

  const handleFfmpegReady = () => {
    if (pendingAddRoot.current) {
      setSetupOpen(false);
      continueAddRoot();
    }
  };

  const handleRescanAll = () => {
    if (!ffmpegInstalled) {
      setSetupOpen(true);
      return;
    }
    void rescanAll();
  };

  const handleRescanRoot = (rootId: number) => {
    if (!ffmpegInstalled) {
      setSetupOpen(true);
      return;
    }
    void startScan(rootId);
  };

  const filteredSeries = useMemo(
    () => getFilteredSeries({ series, filters, seriesProgress }),
    [series, filters, seriesProgress]
  );

  const hasRoots = roots.length > 0;
  const hasSeries = series.length > 0;
  const isAnyScanRunning = Object.keys(scanProgress).length > 0;
  const filtersActive =
    filters.search !== '' || filters.rootIds.length > 0 || filters.matchStatus !== 'all';

  const scanBanners = Object.entries(scanProgress).map(([rootIdStr, progress]) => {
    const rootId = Number(rootIdStr);
    const root = roots.find(r => r.id === rootId);
    if (!root) return null;
    return (
      <ScanProgressBanner
        key={rootId}
        rootPath={root.path}
        rootLabel={root.label}
        progress={progress}
        onCancel={() => void cancelScan(rootId)}
      />
    );
  });

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <LibraryHeader
        seriesCount={series.length}
        hasRoots={hasRoots}
        isAddingRoot={isAddingRoot}
        isAnyScanRunning={isAnyScanRunning}
        onAddFolder={handleAddFolder}
        onRescanAll={handleRescanAll}
        onOpenFfmpegSetup={() => setSetupOpen(true)}
      />

      {!hasRoots ? (
        <div className="flex-1 overflow-auto">
          <EmptyState
            icon={FolderOpen}
            title="Brak dodanych folderów"
            subtitle="Wskaż folder z plikami .mkv / .mp4, aby zacząć budować bibliotekę lokalną."
            action={{
              label: isAddingRoot ? 'Dodawanie...' : 'Dodaj folder',
              onClick: handleAddFolder,
              icon: FolderPlus,
            }}
          />
        </div>
      ) : (
        <>
          {/* Scan banners + error */}
          {(error || scanBanners.some(Boolean)) && (
            <div className="shrink-0 px-5 pt-3 space-y-2">
              {error && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                  {error}
                </div>
              )}
              {scanBanners.some(Boolean) && <div className="space-y-2">{scanBanners}</div>}
            </div>
          )}

          {/* Roots row: compact when >1, hidden otherwise (single root users
              don't need a chip). We still show a discreet remove control per
              root in the filter bar when the user wants to manage them. */}
          {roots.length > 0 && (
            <div className="shrink-0 px-5 pt-3">
              <div className="flex flex-wrap gap-1.5">
                {roots.map(root => {
                  const isScanning = Boolean(scanProgress[root.id]);
                  return (
                    <div
                      key={root.id}
                      className="group inline-flex items-center gap-1 rounded-full border border-border/50 bg-card/30 pl-2.5 pr-1 py-0.5 text-[11px]"
                    >
                      <FolderOpen className="w-3 h-3 text-primary/60 shrink-0" />
                      <span className="max-w-[240px] truncate text-foreground/70" title={root.path}>
                        {root.label ?? root.path.split(/[\\/]/).pop() ?? root.path}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 text-muted-foreground/50 hover:text-primary"
                        onClick={() => handleRescanRoot(root.id)}
                        disabled={isScanning}
                        aria-label={`Przeskanuj ponownie ${root.label ?? root.path}`}
                        title="Skanuj ponownie"
                      >
                        <RefreshCw className={isScanning ? 'w-3 h-3 animate-spin' : 'w-3 h-3'} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 text-muted-foreground/50 hover:text-destructive"
                        onClick={() => void removeRoot(root.id)}
                        disabled={isScanning}
                        aria-label={`Usuń folder ${root.label ?? root.path}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {continueWatching.length > 0 && (
            <div className="shrink-0 pt-4">
              <ContinueWatchingRow
                items={continueWatching}
                onPlay={openPlayer}
                onOpenSeries={openSeries}
              />
            </div>
          )}

          <LibraryFilterBar
            filters={filters}
            roots={roots}
            onChange={updateFilters}
            resultsCount={filteredSeries.length}
            totalCount={series.length}
          />

          {/* Grid area */}
          {!hasSeries ? (
            <div className="flex-1 overflow-auto">
              <EmptyState
                icon={FolderOpen}
                title="Jeszcze nic nie znaleziono"
                subtitle='Kliknij "Przeskanuj", aby zacząć indeksowanie plików w twoich folderach.'
                action={{
                  label: 'Przeskanuj wszystkie',
                  onClick: handleRescanAll,
                  icon: RefreshCw,
                }}
              />
            </div>
          ) : filteredSeries.length === 0 ? (
            <div className="flex-1 overflow-auto">
              {filtersActive ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4 py-16">
                  <div className="w-14 h-14 rounded-2xl bg-muted/40 flex items-center justify-center border border-border-glass">
                    <SearchX className="w-7 h-7 opacity-40" />
                  </div>
                  <div className="text-center space-y-1.5">
                    <p className="text-sm font-medium text-foreground/70">Brak wyników</p>
                    <p className="text-xs text-muted-foreground/60 max-w-[260px]">
                      Zmień kryteria wyszukiwania lub wyczyść filtry, aby zobaczyć wszystkie serie.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4 py-16">
                  <p className="text-sm text-muted-foreground/70">Brak serii do wyświetlenia.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 min-h-0 pt-3">
              <SeriesGrid
                series={filteredSeries}
                progressBySeries={seriesProgress}
                onOpenSeries={openSeries}
              />
            </div>
          )}
        </>
      )}

      <FfmpegSetupDialog
        open={setupOpen}
        onOpenChange={handleSetupOpenChange}
        onReady={handleFfmpegReady}
      />
    </div>
  );
}
