import { useEffect, useRef, useCallback, useMemo, useState } from 'react';
import { Compass, Search, SearchX, X, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/EmptyState';
import { KanjiWatermark } from '@/components/shared/KanjiWatermark';
import { DiscoverCard } from '@/components/discover/DiscoverCard';
import { DiscoverSkeleton } from '@/components/discover/DiscoverSkeleton';
import { RandomDiscoveryPanel } from '@/components/discover/RandomDiscoveryPanel';
import { AnimeInfoDialog } from '@/components/schedule/AnimeInfoDialog';
import { useDiscoverStore, type DiscoverMedia } from '@/stores/useDiscoverStore';
import { useLibraryStore } from '@/stores/useLibraryStore';
import type { AiringAnime } from '@shiroani/shared';

type Tab = 'trending' | 'popular' | 'seasonal' | 'random';

const TABS: { value: Tab; label: string }[] = [
  { value: 'trending', label: 'Na czasie' },
  { value: 'popular', label: 'Popularne' },
  { value: 'seasonal', label: 'Sezonowe' },
  { value: 'random', label: 'Losowe' },
];

/** Set of anilistIds present in the user's library */
function useLibraryAnilistIds(): Set<number> {
  const entries = useLibraryStore(s => s.entries);
  return useMemo(
    () => new Set(entries.map(e => e.anilistId).filter(Boolean) as number[]),
    [entries]
  );
}

function getDiscoverTitle(media: DiscoverMedia): string {
  return media.title.english || media.title.romaji || media.title.native || '?';
}

export function DiscoverView() {
  const activeTab = useDiscoverStore(s => s.activeTab);
  const searchQuery = useDiscoverStore(s => s.searchQuery);
  const isLoading = useDiscoverStore(s => s.isLoading);
  const isSearching = useDiscoverStore(s => s.isSearching);
  const error = useDiscoverStore(s => s.error);

  const trending = useDiscoverStore(s => s.trending);
  const popular = useDiscoverStore(s => s.popular);
  const seasonal = useDiscoverStore(s => s.seasonal);
  const searchResults = useDiscoverStore(s => s.searchResults);

  const trendingPage = useDiscoverStore(s => s.trendingPage);
  const popularPage = useDiscoverStore(s => s.popularPage);
  const seasonalPage = useDiscoverStore(s => s.seasonalPage);
  const searchPage = useDiscoverStore(s => s.searchPage);

  const libraryIds = useLibraryAnilistIds();

  const [selectedAnime, setSelectedAnime] = useState<AiringAnime | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleCardClick = useCallback((media: DiscoverMedia) => {
    // Map DiscoverMedia to a minimal AiringAnime shape for the dialog
    const asAiring: AiringAnime = {
      id: media.id,
      airingAt: media.nextAiringEpisode?.airingAt ?? 0,
      episode: media.nextAiringEpisode?.episode ?? 0,
      media: {
        id: media.id,
        title: media.title,
        coverImage: media.coverImage,
        episodes: media.episodes,
        status: media.status ?? 'UNKNOWN',
        genres: media.genres ?? [],
        format: media.format,
        averageScore: media.averageScore,
        popularity: media.popularity,
      },
    };
    setSelectedAnime(asAiring);
    setDialogOpen(true);
  }, []);

  const handleAddToLibrary = useCallback((media: DiscoverMedia) => {
    const title = getDiscoverTitle(media);
    const entries = useLibraryStore.getState().entries;
    const alreadyByAnilist = entries.some(e => e.anilistId === media.id);
    const alreadyByTitle = entries.some(e => e.title.toLowerCase() === title.toLowerCase());
    if (alreadyByAnilist || alreadyByTitle) {
      toast.error('To anime jest już w bibliotece');
      return;
    }

    try {
      useLibraryStore.getState().addToLibrary({
        anilistId: media.id,
        title,
        titleRomaji: media.title.romaji,
        titleNative: media.title.native,
        coverImage:
          media.coverImage.large || media.coverImage.extraLarge || media.coverImage.medium,
        episodes: media.episodes,
        status: 'plan_to_watch',
      });
      toast.success('Dodano do biblioteki', { description: title });
    } catch {
      toast.error('Nie udało się dodać do biblioteki');
    }
  }, []);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialFetchDone = useRef(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Fetch trending on mount
  useEffect(() => {
    if (initialFetchDone.current) return;
    initialFetchDone.current = true;
    const { fetchTrending, trending } = useDiscoverStore.getState();
    if (trending.length === 0) fetchTrending();
  }, []);

  // Handle tab change — fetch if data is empty
  const handleTabChange = useCallback((tab: Tab) => {
    const store = useDiscoverStore.getState();
    store.setTab(tab);
    if (tab === 'trending' && store.trending.length === 0) store.fetchTrending();
    else if (tab === 'popular' && store.popular.length === 0) store.fetchPopular();
    else if (tab === 'seasonal' && store.seasonal.length === 0) store.fetchSeasonal();
    else if (tab === 'random' && store.randomPool.length === 0) store.fetchRandomPool();
  }, []);

  // Debounced search
  const handleSearchChange = useCallback((value: string) => {
    const store = useDiscoverStore.getState();
    store.setSearchQuery(value);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.trim()) {
      debounceRef.current = setTimeout(() => {
        useDiscoverStore.getState().search(value.trim());
      }, 400);
    }
  }, []);

  const handleClearSearch = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    useDiscoverStore.getState().clearSearch();
  }, []);

  const handleRetry = useCallback(() => {
    const store = useDiscoverStore.getState();
    if (store.isSearching && store.searchQuery.trim()) {
      store.search(store.searchQuery.trim());
    } else {
      switch (store.activeTab) {
        case 'trending':
          store.fetchTrending();
          break;
        case 'popular':
          store.fetchPopular();
          break;
        case 'seasonal':
          store.fetchSeasonal();
          break;
        case 'random':
          store.fetchRandomPool();
          break;
      }
    }
  }, []);

  // Infinite scroll — callback ref so the observer re-attaches when the sentinel mounts/unmounts
  const sentinelRef = useCallback((node: HTMLDivElement | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
    if (!node) return;

    observerRef.current = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          const state = useDiscoverStore.getState();
          if (!state.isLoading) state.loadMore();
        }
      },
      { rootMargin: '200px' }
    );
    observerRef.current.observe(node);
  }, []);

  // Determine which data to display
  const isSearchMode = searchQuery.trim().length > 0;
  const isRandomMode = !isSearchMode && activeTab === 'random';

  const items = isSearchMode
    ? searchResults
    : activeTab === 'trending'
      ? trending
      : activeTab === 'popular'
        ? popular
        : activeTab === 'seasonal'
          ? seasonal
          : [];

  const page = isSearchMode
    ? searchPage
    : activeTab === 'trending'
      ? trendingPage
      : activeTab === 'popular'
        ? popularPage
        : activeTab === 'seasonal'
          ? seasonalPage
          : { current: 1, hasNext: false };

  const showLoading = isSearchMode ? isSearching : isLoading;
  const showEmpty = !isRandomMode && !showLoading && items.length === 0;
  const showGrid = !isRandomMode && items.length > 0;

  return (
    <div className="flex-1 flex flex-col overflow-hidden animate-fade-in relative">
      {/* ── Editorial view header (matches .vh pattern) ─────────────── */}
      <div className="relative flex items-center justify-between border-b border-border-glass px-7 pt-[18px] pb-4 shrink-0">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="size-9 rounded-[10px] grid place-items-center flex-shrink-0 bg-primary/15 border border-primary/30 text-primary">
            <Compass className="w-[18px] h-[18px]" />
          </div>
          <div className="min-w-0">
            <h1 className="text-[20px] font-extrabold tracking-[-0.02em] leading-none text-foreground truncate">
              Odkrywaj
            </h1>
            <span className="block mt-[3px] font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium truncate">
              Trendy · sezon · losowe
            </span>
          </div>
        </div>
      </div>

      {/* ── Search + tab row ────────────────────────────────────────── */}
      <div className="px-7 pt-3 pb-3 space-y-3 border-b border-border-glass shrink-0">
        <div className="relative group/search">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60 transition-colors group-focus-within/search:text-primary/70" />
          <Input
            value={searchQuery}
            onChange={e => handleSearchChange(e.target.value)}
            placeholder="Szukaj anime..."
            className="pl-8 h-8 text-sm"
          />
          {searchQuery && (
            <button
              onClick={handleClearSearch}
              aria-label="Wyczyść wyszukiwanie"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground/70 transition-colors"
            >
              <SearchX className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Tabs or search-results label */}
        {isSearchMode ? (
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary/90 font-semibold">
              Wyniki wyszukiwania
            </span>
            <button
              onClick={handleClearSearch}
              className="flex items-center gap-1 text-2xs text-muted-foreground hover:text-foreground/70 transition-colors"
            >
              <X className="w-3 h-3" />
              Wyczyść
            </button>
          </div>
        ) : (
          <div
            role="tablist"
            className="flex items-center gap-1 overflow-x-auto scrollbar-hide -mx-1 px-1"
          >
            {TABS.map(tab => {
              const isActive = activeTab === tab.value;
              return (
                <button
                  key={tab.value}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => handleTabChange(tab.value)}
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
        )}
      </div>

      {/* ── Content region with clipped kanji watermark layer ──────── */}
      <div className="flex-1 relative overflow-hidden">
        {/* Decorative kanji watermark — 探 (saga/tan: search / explore).
            Clipped wrapper keeps the glyph's negative offsets from producing
            scrollbars on either axis. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <KanjiWatermark kanji="探" position="br" size={300} opacity={0.03} />
        </div>

        <div className="absolute inset-0 overflow-y-auto overflow-x-hidden">
          <div className="relative z-[1] px-7 pt-5 pb-24">
            {/* Random discovery — owns its own loading/error/empty */}
            {isRandomMode && (
              <RandomDiscoveryPanel
                libraryIds={libraryIds}
                onCardClick={handleCardClick}
                onError={handleRetry}
              />
            )}

            {/* Error state */}
            {!isRandomMode && error && !showLoading && (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
                <p className="text-sm text-center max-w-xs">{error}</p>
                <Button variant="outline" size="sm" onClick={handleRetry} className="gap-2 text-xs">
                  <RefreshCw className="w-3.5 h-3.5" />
                  Spróbuj ponownie
                </Button>
              </div>
            )}

            {/* Loading state — only show skeleton on initial load (no items yet) */}
            {!isRandomMode && showLoading && items.length === 0 && <DiscoverSkeleton />}

            {/* Empty state */}
            {showEmpty && !error && (
              <EmptyState
                icon={isSearchMode ? SearchX : Compass}
                title={isSearchMode ? 'Brak wyników' : 'Brak anime do wyświetlenia'}
                subtitle={
                  isSearchMode
                    ? 'Spróbuj innej frazy wyszukiwania'
                    : 'Nie udało się załadować anime.'
                }
              />
            )}

            {/* Grid — responsive 2:3 anime cards */}
            {showGrid && (
              <div
                className={cn(
                  'grid gap-3.5',
                  'grid-cols-2',
                  'sm:grid-cols-3',
                  'md:grid-cols-4',
                  'lg:grid-cols-5',
                  '2xl:grid-cols-6'
                )}
              >
                {items.map(media => (
                  <DiscoverCard
                    key={media.id}
                    media={media}
                    inLibrary={libraryIds.has(media.id)}
                    onClick={() => handleCardClick(media)}
                    onAddToLibrary={handleAddToLibrary}
                  />
                ))}
              </div>
            )}

            {/* Infinite scroll sentinel */}
            {!isRandomMode && page.hasNext && (
              <div ref={sentinelRef} className="flex justify-center py-8">
                {isLoading && <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />}
              </div>
            )}
          </div>
        </div>
      </div>

      <AnimeInfoDialog anime={selectedAnime} open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
