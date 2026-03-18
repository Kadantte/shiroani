import { useEffect, useCallback } from 'react';
import { Rss, RefreshCw, Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { TooltipButton } from '@/components/ui/tooltip-button';
import { useFeedStore, getFilteredItems } from '@/stores/useFeedStore';
import { useNavigateToBrowser } from '@/hooks/useNavigateToBrowser';
import type { FeedCategory, FeedLanguage } from '@shiroani/shared';
import { FeedCard } from './FeedCard';
import { FeedLoadingAnimation } from './FeedLoadingAnimation';
import { CATEGORY_LABELS, LANGUAGE_LABELS } from './feed-constants';

// Extract stable action references outside the component
const { fetchItems, refreshFeeds, setCategoryFilter, setLanguageFilter } = useFeedStore.getState();

export function FeedView() {
  const items = useFeedStore(getFilteredItems);
  const isLoading = useFeedStore(s => s.isLoading);
  const error = useFeedStore(s => s.error);
  const hasMore = useFeedStore(s => s.hasMore);
  const categoryFilter = useFeedStore(s => s.categoryFilter);
  const languageFilter = useFeedStore(s => s.languageFilter);
  const isRefreshing = useFeedStore(s => s.isRefreshing);
  const lastRefreshNewCount = useFeedStore(s => s.lastRefreshNewCount);

  const navigateToBrowser = useNavigateToBrowser();

  const handleOpenUrl = useCallback(
    (url: string) => {
      navigateToBrowser(url);
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

  return (
    <div className="flex-1 flex flex-col overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="shrink-0 px-6 pt-5 pb-3 border-b border-border/60 bg-card/20 backdrop-blur-sm space-y-3">
        {/* Title row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Rss className="w-4 h-4 text-primary" />
            </div>
            <h1 className="text-base font-semibold text-foreground">Aktualności</h1>
            {lastRefreshNewCount !== null && lastRefreshNewCount > 0 && (
              <span
                className={cn(
                  'inline-flex items-center px-2 py-0.5 rounded-full',
                  'text-[10px] font-semibold text-primary bg-primary/15',
                  'animate-fade-in'
                )}
              >
                +{lastRefreshNewCount} nowych
              </span>
            )}
          </div>

          <TooltipButton
            variant="ghost"
            size="icon"
            className="w-8 h-8"
            onClick={refreshFeeds}
            disabled={isRefreshing}
            tooltip="Odśwież źródła"
          >
            <RefreshCw className={cn('w-4 h-4', isRefreshing && 'animate-spin')} />
          </TooltipButton>
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Category tabs */}
          <div className="flex items-center gap-0.5 rounded-lg bg-white/[0.04] p-0.5">
            {(Object.entries(CATEGORY_LABELS) as [FeedCategory | 'all', string][])
              .filter(([key]) => key !== 'community')
              .map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setCategoryFilter(key)}
                  aria-pressed={categoryFilter === key}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 cursor-pointer',
                    categoryFilter === key
                      ? 'bg-primary/15 text-primary shadow-sm'
                      : 'text-muted-foreground/60 hover:text-muted-foreground hover:bg-white/[0.04]'
                  )}
                >
                  {label}
                </button>
              ))}
          </div>

          {/* Language pills */}
          <div className="flex items-center gap-0.5 rounded-lg bg-white/[0.04] p-0.5">
            {(Object.entries(LANGUAGE_LABELS) as [FeedLanguage | 'all', string][]).map(
              ([key, label]) => (
                <button
                  key={key}
                  onClick={() => setLanguageFilter(key)}
                  aria-pressed={languageFilter === key}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 cursor-pointer',
                    languageFilter === key
                      ? 'bg-primary/15 text-primary shadow-sm'
                      : 'text-muted-foreground/60 hover:text-muted-foreground hover:bg-white/[0.04]'
                  )}
                >
                  {label}
                </button>
              )
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div
        role="region"
        aria-label="Feed aktualności"
        className="flex-1 overflow-y-auto scrollbar-thin"
      >
        {isLoading && items.length === 0 ? (
          <FeedLoadingAnimation />
        ) : error && items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <Rss className="w-10 h-10 text-destructive/60" />
            <p className="text-sm text-center max-w-xs">{error}</p>
            <Button variant="outline" size="sm" onClick={() => fetchItems()}>
              Spróbuj ponownie
            </Button>
          </div>
        ) : items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 gap-4 text-muted-foreground">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.04] flex items-center justify-center">
              <Inbox className="w-8 h-8 text-muted-foreground/40" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-medium text-foreground/70">Brak aktualności</p>
              <p className="text-xs text-muted-foreground/50">
                Nie znaleziono żadnych wpisów dla wybranych filtrów
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-primary/20 text-primary hover:bg-primary/10"
              onClick={refreshFeeds}
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Odśwież
            </Button>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map(item => (
                <FeedCard key={item.id} item={item} onOpenUrl={handleOpenUrl} />
              ))}
            </div>

            {hasMore && (
              <div className="flex justify-center pb-4">
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
                    'Załaduj więcej'
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
