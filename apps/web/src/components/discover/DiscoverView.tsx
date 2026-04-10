import { useEffect, useRef, useCallback, useMemo } from 'react';
import { Compass, Search, SearchX, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/EmptyState';
import { DiscoverCard } from '@/components/discover/DiscoverCard';
import { DiscoverSkeleton } from '@/components/discover/DiscoverSkeleton';
import { useDiscoverStore } from '@/stores/useDiscoverStore';
import { useLibraryStore } from '@/stores/useLibraryStore';

type Tab = 'trending' | 'popular' | 'seasonal';

const TABS: { value: Tab; label: string }[] = [
  { value: 'trending', label: 'Na czasie' },
  { value: 'popular', label: 'Popularne' },
  { value: 'seasonal', label: 'Sezonowe' },
];

/** Set of anilistIds present in the user's library */
function useLibraryAnilistIds(): Set<number> {
  const entries = useLibraryStore(s => s.entries);
  return useMemo(
    () => new Set(entries.map(e => e.anilistId).filter(Boolean) as number[]),
    [entries]
  );
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

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialFetchDone = useRef(false);

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

  const handleLoadMore = useCallback(() => {
    useDiscoverStore.getState().loadMore();
  }, []);

  // Determine which data to display
  const isSearchMode = searchQuery.trim().length > 0;
  const items = isSearchMode
    ? searchResults
    : activeTab === 'trending'
      ? trending
      : activeTab === 'popular'
        ? popular
        : seasonal;

  const page = isSearchMode
    ? searchPage
    : activeTab === 'trending'
      ? trendingPage
      : activeTab === 'popular'
        ? popularPage
        : seasonalPage;

  const showLoading = isSearchMode ? isSearching : isLoading;
  const showEmpty = !showLoading && items.length === 0;
  const showGrid = items.length > 0;

  return (
    <div className="flex-1 flex flex-col overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="shrink-0 px-5 pt-4 pb-3 space-y-3 border-b border-border/60 bg-card/20 backdrop-blur-sm">
        {/* Title row */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Compass className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-foreground leading-tight">Odkrywaj</h1>
            <p className="text-xs text-muted-foreground/70 leading-tight">
              Przeglądaj i szukaj anime
            </p>
          </div>
        </div>

        {/* Search bar */}
        <div className="relative group/search">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60 transition-colors group-focus-within/search:text-primary/70" />
          <Input
            value={searchQuery}
            onChange={e => handleSearchChange(e.target.value)}
            placeholder="Szukaj anime..."
            className="pl-8 h-8 text-sm bg-background/40 border-border-glass focus:bg-background/60 transition-colors"
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

        {/* Tabs or search label */}
        {isSearchMode ? (
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-foreground/70">Wyniki wyszukiwania</span>
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

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 pb-20">
        {/* Error state */}
        {error && !showLoading && (
          <div className="text-center py-8">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Loading state — only show skeleton on initial load (no items yet) */}
        {showLoading && items.length === 0 && <DiscoverSkeleton />}

        {/* Empty state */}
        {showEmpty && !error && (
          <EmptyState
            icon={isSearchMode ? SearchX : Compass}
            title={isSearchMode ? 'Brak wyników' : 'Brak anime do wyświetlenia'}
            subtitle={
              isSearchMode
                ? 'Spróbuj innej frazy wyszukiwania'
                : 'Nie udało się załadować anime. Spróbuj ponownie.'
            }
          />
        )}

        {/* Grid */}
        {showGrid && (
          <>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-4">
              {items.map(media => (
                <DiscoverCard key={media.id} media={media} inLibrary={libraryIds.has(media.id)} />
              ))}
            </div>

            {/* Load more */}
            {page.hasNext && (
              <div className="flex justify-center mt-6">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLoadMore}
                  disabled={showLoading}
                  className="gap-2 text-xs border-primary/20 text-primary hover:bg-primary/10 hover:text-primary"
                >
                  {showLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Załaduj więcej
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
