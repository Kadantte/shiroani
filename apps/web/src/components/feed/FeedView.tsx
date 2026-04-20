import { useEffect, useCallback, useMemo, useRef, useState } from 'react';
import { Rss, RefreshCw, Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { TooltipButton } from '@/components/ui/tooltip-button';
import { ViewHeader } from '@/components/shared/ViewHeader';
import { KanjiWatermark } from '@/components/shared/KanjiWatermark';
import { useFeedStore, getFilteredItems } from '@/stores/useFeedStore';
import { useNavigateToBrowser } from '@/hooks/useNavigateToBrowser';
import { pluralize } from '@shiroani/shared';
import type { FeedCategory, FeedItem, FeedLanguage } from '@shiroani/shared';
import { FeedHero } from './FeedHero';
import { FeedListItem } from './FeedListItem';
import { FeedSidebar } from './FeedSidebar';
import { FeedReaderModal } from './FeedReaderModal';
import { FeedLoadingAnimation } from './FeedLoadingAnimation';
import { CATEGORY_LABELS, LANGUAGE_LABELS } from './feed-constants';

// Extract stable action references outside the component
const {
  fetchItems,
  refreshFeeds,
  setCategoryFilter,
  setLanguageFilter,
  setSourceFilter,
  markAllSeen,
} = useFeedStore.getState();

type FeedViewState = 'loading' | 'error' | 'empty' | 'content';

export function getFeedViewState({
  itemsCount,
  isLoading,
  isRefreshing,
  isBootstrapping,
  error,
}: {
  itemsCount: number;
  isLoading: boolean;
  isRefreshing: boolean;
  isBootstrapping: boolean;
  error: string | null;
}): FeedViewState {
  if (itemsCount === 0 && (isLoading || isRefreshing || isBootstrapping)) {
    return 'loading';
  }

  if (error && itemsCount === 0) {
    return 'error';
  }

  if (itemsCount === 0) {
    return 'empty';
  }

  return 'content';
}

// Category filter pills drawn under ViewHeader search
const CATEGORY_FILTER_OPTIONS = (
  Object.entries(CATEGORY_LABELS) as [FeedCategory | 'all', string][]
)
  .filter(([key]) => key !== 'community')
  .map(([value, label]) => ({ value, label }));

const LANGUAGE_FILTER_OPTIONS = (
  Object.entries(LANGUAGE_LABELS) as [FeedLanguage | 'all', string][]
).map(([value, label]) => ({ value, label }));

export function FeedView() {
  const items = useFeedStore(getFilteredItems);
  const sources = useFeedStore(s => s.sources);
  const total = useFeedStore(s => s.total);
  const isLoading = useFeedStore(s => s.isLoading);
  const error = useFeedStore(s => s.error);
  const hasMore = useFeedStore(s => s.hasMore);
  const categoryFilter = useFeedStore(s => s.categoryFilter);
  const languageFilter = useFeedStore(s => s.languageFilter);
  const sourceFilter = useFeedStore(s => s.sourceFilter);
  const isRefreshing = useFeedStore(s => s.isRefreshing);
  const isBootstrapping = useFeedStore(s => s.isBootstrapping);
  const lastRefreshNewCount = useFeedStore(s => s.lastRefreshNewCount);
  const hasTriggeredVisibleBootstrap = useRef(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [readerItem, setReaderItem] = useState<FeedItem | null>(null);
  const [isReaderOpen, setIsReaderOpen] = useState(false);

  const navigateToBrowser = useNavigateToBrowser();

  const handleOpenInReader = useCallback((item: FeedItem) => {
    setReaderItem(item);
    setIsReaderOpen(true);
  }, []);

  const handleOpenExternal = useCallback(
    (item: FeedItem) => {
      navigateToBrowser(item.url);
    },
    [navigateToBrowser]
  );

  const handleLoadMore = useCallback(() => {
    fetchItems(true);
  }, []);

  // Clear the refresh count badge after 5 seconds
  useEffect(() => {
    if (lastRefreshNewCount !== null && lastRefreshNewCount > 0) {
      const timer = setTimeout(() => {
        useFeedStore.setState({ lastRefreshNewCount: null });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [lastRefreshNewCount]);

  // Entering the Feed view counts as "caught up" — clears the newtab greeting's
  // unread subscription counter. Fires once per mount.
  useEffect(() => {
    markAllSeen();
  }, []);

  useEffect(() => {
    const canBootstrapVisibleFeed =
      items.length === 0 &&
      !isLoading &&
      !isRefreshing &&
      !isBootstrapping &&
      !error &&
      categoryFilter === 'all' &&
      languageFilter === 'all';

    if (!canBootstrapVisibleFeed || hasTriggeredVisibleBootstrap.current) {
      return;
    }

    hasTriggeredVisibleBootstrap.current = true;
    fetchItems(false, { bootstrapIfEmpty: true });
  }, [
    items.length,
    isLoading,
    isRefreshing,
    isBootstrapping,
    error,
    categoryFilter,
    languageFilter,
  ]);

  // Client-side search overlay on top of store-filtered items
  const searchedItems = useMemo(() => {
    const needle = searchQuery.trim().toLowerCase();
    if (!needle) return items;
    return items.filter(item => {
      const title = item.title?.toLowerCase() ?? '';
      const description = item.description?.toLowerCase() ?? '';
      const source = item.sourceName?.toLowerCase() ?? '';
      const author = item.author?.toLowerCase() ?? '';
      return (
        title.includes(needle) ||
        description.includes(needle) ||
        source.includes(needle) ||
        author.includes(needle)
      );
    });
  }, [items, searchQuery]);

  const heroItem = searchedItems[0] ?? null;
  const listItems = heroItem ? searchedItems.slice(1) : searchedItems;

  const subtitle = useMemo(() => {
    const sourceCount = sources.filter(s => s.enabled).length;
    const totalLabel =
      total > 0 ? `${total} ${pluralize(total, 'wpis', 'wpisy', 'wpisów')}` : 'Brak wpisów';
    if (sourceCount === 0) return totalLabel;
    return `${totalLabel} · ${sourceCount} ${pluralize(sourceCount, 'źródło', 'źródła', 'źródeł')}`;
  }, [sources, total]);

  const viewState = getFeedViewState({
    itemsCount: items.length,
    isLoading,
    isRefreshing,
    isBootstrapping,
    error,
  });

  const handleSearchChange = useCallback((q: string) => {
    setSearchQuery(q);
  }, []);

  const handleCategoryFilterChange = useCallback((category: FeedCategory | 'all') => {
    setCategoryFilter(category);
  }, []);

  // Mark the first 4 items as "unread" for the glow treatment — we don't yet
  // persist a real read-state, so approximate with positional freshness.
  const unreadIdSet = useMemo(() => {
    const ids = new Set<number>();
    for (let i = 0; i < Math.min(4, listItems.length); i += 1) {
      ids.add(listItems[i].id);
    }
    return ids;
  }, [listItems]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden animate-fade-in relative">
      {/* View header — title / search / category tabs */}
      <ViewHeader
        icon={Rss}
        title="Aktualności"
        subtitle={subtitle}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        searchPlaceholder="Szukaj artykułów..."
        filters={CATEGORY_FILTER_OPTIONS}
        activeFilter={categoryFilter}
        onFilterChange={handleCategoryFilterChange}
        actions={
          <>
            {/* Language pill toggle — mirrors mock sub-header */}
            <div
              className="flex items-center gap-0.5 rounded-lg bg-white/[0.04] border border-white/[0.06] p-0.5"
              role="group"
              aria-label="Język"
            >
              {LANGUAGE_FILTER_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setLanguageFilter(value)}
                  aria-pressed={languageFilter === value}
                  className={cn(
                    'px-2.5 h-6 rounded-md text-[11px] font-medium transition-colors duration-150',
                    languageFilter === value
                      ? 'bg-primary/20 text-primary'
                      : 'text-muted-foreground/80 hover:text-foreground'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="w-px h-4 bg-border-glass mx-1" />

            <TooltipButton
              variant="ghost"
              size="icon"
              className={cn(
                'w-8 h-8 relative',
                lastRefreshNewCount !== null &&
                  lastRefreshNewCount > 0 &&
                  'text-primary hover:text-primary'
              )}
              onClick={() => refreshFeeds()}
              disabled={isRefreshing}
              tooltip="Odśwież źródła"
            >
              <RefreshCw className={cn('w-4 h-4', isRefreshing && 'animate-spin')} />
              {lastRefreshNewCount !== null && lastRefreshNewCount > 0 && (
                <span
                  aria-label={`${lastRefreshNewCount} nowych`}
                  className={cn(
                    'absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full',
                    'bg-primary text-[9px] font-bold leading-none grid place-items-center',
                    'text-background animate-fade-in'
                  )}
                >
                  +{lastRefreshNewCount}
                </span>
              )}
            </TooltipButton>
          </>
        }
      />

      {/* Content region with clipped watermark layer */}
      <div className="flex-1 relative overflow-hidden">
        {/* Decorative kanji watermark — 報 (hou: news / report). */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <KanjiWatermark kanji="報" position="br" size={300} opacity={0.03} />
        </div>

        <div className="absolute inset-0 overflow-y-auto overflow-x-hidden scrollbar-thin">
          <div className="relative z-[1]">
            {viewState === 'loading' ? (
              <FeedLoadingAnimation />
            ) : viewState === 'error' ? (
              <div className="flex-1 flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
                <Rss className="w-10 h-10 text-destructive/60" />
                <p className="text-sm text-center max-w-xs">{error}</p>
                <Button variant="outline" size="sm" onClick={() => fetchItems()}>
                  Spróbuj ponownie
                </Button>
              </div>
            ) : viewState === 'empty' ? (
              <div className="flex-1 flex flex-col items-center justify-center py-20 gap-4 text-muted-foreground">
                <div className="w-16 h-16 rounded-2xl bg-white/[0.04] flex items-center justify-center">
                  <Inbox className="w-8 h-8 text-muted-foreground/40" />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-sm font-medium text-foreground/70">Brak aktualności</p>
                  <p className="text-xs text-muted-foreground/50">
                    Dla wybranych filtrów nie ma żadnych wpisów
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-primary/20 text-primary hover:bg-primary/10"
                  onClick={() => refreshFeeds()}
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                  Odśwież
                </Button>
              </div>
            ) : (
              <div
                role="region"
                aria-label="Feed aktualności"
                className={cn(
                  'px-6 pt-4 pb-16 gap-4 grid',
                  'grid-cols-1 xl:grid-cols-[minmax(0,1fr)_300px]'
                )}
              >
                {/* Left column — hero + list */}
                <div className="min-w-0 flex flex-col gap-3">
                  {heroItem && <FeedHero item={heroItem} onOpen={handleOpenInReader} />}

                  {searchedItems.length === 0 && searchQuery ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
                      <Inbox className="w-8 h-8 opacity-40" />
                      <div className="text-center space-y-1">
                        <p className="text-sm font-medium text-foreground/70">Brak wyników</p>
                        <p className="text-xs text-muted-foreground/50">
                          Nie znaleziono artykułów dla „{searchQuery}"
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {listItems.map(item => (
                        <FeedListItem
                          key={item.id}
                          item={item}
                          unread={unreadIdSet.has(item.id)}
                          onOpen={handleOpenInReader}
                          onOpenExternal={handleOpenExternal}
                        />
                      ))}
                    </div>
                  )}

                  {hasMore && !searchQuery && (
                    <div className="flex justify-center pt-3 pb-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                          'border-white/[0.08] text-muted-foreground/70',
                          'hover:border-white/[0.12] hover:text-foreground',
                          'transition-all duration-200'
                        )}
                        onClick={handleLoadMore}
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                            Ładowanie...
                          </>
                        ) : (
                          'Pokaż więcej'
                        )}
                      </Button>
                    </div>
                  )}
                </div>

                {/* Right sidebar */}
                <div className="min-w-0 xl:sticky xl:top-2">
                  <FeedSidebar
                    sources={sources}
                    items={items}
                    sourceFilter={sourceFilter}
                    onSetSourceFilter={setSourceFilter}
                    totalCount={total}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reader modal */}
      <FeedReaderModal
        item={readerItem}
        open={isReaderOpen}
        onOpenChange={open => {
          setIsReaderOpen(open);
          if (!open) {
            // keep item briefly so the closing animation has content to render
            setTimeout(() => setReaderItem(null), 200);
          }
        }}
        relatedItems={items}
        onOpenRelated={handleOpenInReader}
        onOpenExternal={handleOpenExternal}
      />
    </div>
  );
}
