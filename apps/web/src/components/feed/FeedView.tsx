import { useEffect, useCallback } from 'react';
import { Rss, RefreshCw, ExternalLink, Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { TooltipButton } from '@/components/ui/tooltip-button';
import { useFeedStore, getFilteredItems } from '@/stores/useFeedStore';
import { useNavigateToBrowser } from '@/hooks/useNavigateToBrowser';
import type { FeedItem, FeedCategory, FeedLanguage } from '@shiroani/shared';

// ── Helpers ──────────────────────────────────────────────────────

function timeAgo(dateString: string): string {
  const now = Date.now();
  const date = new Date(dateString).getTime();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'teraz';
  if (minutes < 60) return `${minutes} min temu`;
  if (hours < 24) return `${hours} godz. temu`;
  if (days < 7) return `${days} dn. temu`;
  return new Date(dateString).toLocaleDateString('pl-PL');
}

const CATEGORY_LABELS: Record<FeedCategory | 'all', string> = {
  all: 'Wszystko',
  news: 'Wiadomości',
  episodes: 'Odcinki',
  reviews: 'Recenzje',
  community: 'Społeczność',
};

const LANGUAGE_LABELS: Record<FeedLanguage | 'all', string> = {
  all: 'Wszystkie',
  en: 'English',
  pl: 'Polski',
};

const CATEGORY_COLORS: Record<FeedCategory, string> = {
  news: 'bg-blue-500/15 text-blue-400',
  episodes: 'bg-green-500/15 text-green-400',
  reviews: 'bg-amber-500/15 text-amber-400',
  community: 'bg-purple-500/15 text-purple-400',
};

// Extract stable action references outside the component
const { fetchItems, refreshFeeds, setCategoryFilter, setLanguageFilter } = useFeedStore.getState();

// ── Loading Animation ────────────────────────────────────────────

/**
 * Delightful SVG loading animation with animated RSS signal waves,
 * floating news card silhouettes, and subtle sparkle effects.
 */
function FeedLoadingAnimation() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-20 gap-6 select-none">
      <div className="relative w-48 h-48">
        <svg viewBox="0 0 200 200" className="w-full h-full" aria-hidden="true">
          <defs>
            <linearGradient id="feed-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.8" />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
            </linearGradient>
            <linearGradient id="card-grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.15" />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.05" />
            </linearGradient>
          </defs>

          {/* Signal waves expanding outward from center */}
          {[0, 1, 2].map(i => (
            <circle
              key={`wave-${i}`}
              cx="100"
              cy="110"
              r="20"
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="1.5"
              opacity="0"
            >
              <animate
                attributeName="r"
                from="20"
                to="80"
                dur="2.4s"
                begin={`${i * 0.8}s`}
                repeatCount="indefinite"
              />
              <animate
                attributeName="opacity"
                values="0.5;0.2;0"
                dur="2.4s"
                begin={`${i * 0.8}s`}
                repeatCount="indefinite"
              />
            </circle>
          ))}

          {/* RSS Icon - dot */}
          <circle cx="82" cy="128" r="6" fill="url(#feed-grad)">
            <animate attributeName="r" values="6;7;6" dur="2s" repeatCount="indefinite" />
          </circle>

          {/* RSS Icon - inner arc */}
          <path
            d="M 78 108 A 26 26 0 0 1 104 134"
            fill="none"
            stroke="url(#feed-grad)"
            strokeWidth="5"
            strokeLinecap="round"
          >
            <animate
              attributeName="stroke-opacity"
              values="0.4;0.9;0.4"
              dur="2s"
              begin="0.3s"
              repeatCount="indefinite"
            />
          </path>

          {/* RSS Icon - outer arc */}
          <path
            d="M 78 90 A 44 44 0 0 1 122 134"
            fill="none"
            stroke="url(#feed-grad)"
            strokeWidth="5"
            strokeLinecap="round"
          >
            <animate
              attributeName="stroke-opacity"
              values="0.3;0.8;0.3"
              dur="2s"
              begin="0.6s"
              repeatCount="indefinite"
            />
          </path>

          {/* Floating card 1 - top right */}
          <g>
            <animateTransform
              attributeName="transform"
              type="translate"
              values="0,0; 3,-8; 0,0"
              dur="4s"
              repeatCount="indefinite"
            />
            <rect
              x="138"
              y="42"
              width="36"
              height="26"
              rx="4"
              fill="url(#card-grad)"
              stroke="hsl(var(--primary))"
              strokeWidth="0.5"
              strokeOpacity="0.2"
            />
            <rect
              x="142"
              y="47"
              width="16"
              height="2"
              rx="1"
              fill="hsl(var(--primary))"
              fillOpacity="0.15"
            />
            <rect
              x="142"
              y="52"
              width="28"
              height="2"
              rx="1"
              fill="hsl(var(--primary))"
              fillOpacity="0.1"
            />
            <rect
              x="142"
              y="57"
              width="22"
              height="2"
              rx="1"
              fill="hsl(var(--primary))"
              fillOpacity="0.08"
            />
            <animate
              attributeName="opacity"
              values="0;0.8;0.8;0"
              dur="4s"
              repeatCount="indefinite"
            />
          </g>

          {/* Floating card 2 - top left */}
          <g>
            <animateTransform
              attributeName="transform"
              type="translate"
              values="0,0; -4,-6; 0,0"
              dur="5s"
              begin="1.2s"
              repeatCount="indefinite"
            />
            <rect
              x="22"
              y="50"
              width="40"
              height="28"
              rx="4"
              fill="url(#card-grad)"
              stroke="hsl(var(--primary))"
              strokeWidth="0.5"
              strokeOpacity="0.2"
            />
            <rect
              x="26"
              y="55"
              width="12"
              height="8"
              rx="2"
              fill="hsl(var(--primary))"
              fillOpacity="0.12"
            />
            <rect
              x="26"
              y="66"
              width="32"
              height="2"
              rx="1"
              fill="hsl(var(--primary))"
              fillOpacity="0.1"
            />
            <rect
              x="26"
              y="71"
              width="24"
              height="2"
              rx="1"
              fill="hsl(var(--primary))"
              fillOpacity="0.08"
            />
            <animate
              attributeName="opacity"
              values="0;0.7;0.7;0"
              dur="5s"
              begin="1.2s"
              repeatCount="indefinite"
            />
          </g>

          {/* Floating card 3 - right middle */}
          <g>
            <animateTransform
              attributeName="transform"
              type="translate"
              values="0,0; 5,-10; 0,0"
              dur="4.5s"
              begin="0.6s"
              repeatCount="indefinite"
            />
            <rect
              x="148"
              y="110"
              width="32"
              height="24"
              rx="4"
              fill="url(#card-grad)"
              stroke="hsl(var(--primary))"
              strokeWidth="0.5"
              strokeOpacity="0.2"
            />
            <rect
              x="152"
              y="115"
              width="10"
              height="6"
              rx="1.5"
              fill="hsl(var(--primary))"
              fillOpacity="0.12"
            />
            <rect
              x="152"
              y="124"
              width="24"
              height="2"
              rx="1"
              fill="hsl(var(--primary))"
              fillOpacity="0.1"
            />
            <rect
              x="152"
              y="129"
              width="18"
              height="1.5"
              rx="0.75"
              fill="hsl(var(--primary))"
              fillOpacity="0.08"
            />
            <animate
              attributeName="opacity"
              values="0;0.6;0.6;0"
              dur="4.5s"
              begin="0.6s"
              repeatCount="indefinite"
            />
          </g>

          {/* Sparkles */}
          {[
            { cx: 155, cy: 35, delay: '0s' },
            { cx: 35, cy: 85, delay: '1.5s' },
            { cx: 165, cy: 85, delay: '0.8s' },
            { cx: 60, cy: 35, delay: '2.1s' },
          ].map((s, i) => (
            <circle key={`sparkle-${i}`} cx={s.cx} cy={s.cy} r="1.5" fill="hsl(var(--primary))">
              <animate
                attributeName="opacity"
                values="0;0.8;0"
                dur="2s"
                begin={s.delay}
                repeatCount="indefinite"
              />
              <animate
                attributeName="r"
                values="0.5;2;0.5"
                dur="2s"
                begin={s.delay}
                repeatCount="indefinite"
              />
            </circle>
          ))}
        </svg>
      </div>

      {/* Loading text with animated dots */}
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground/60">
        <span>Pobieranie aktualności</span>
        <span className="inline-flex w-6">
          {[0, 1, 2].map(i => (
            <span
              key={i}
              className="inline-block w-1 h-1 rounded-full bg-primary/50"
              style={{
                animation: 'feed-dot 1.4s infinite',
                animationDelay: `${i * 0.2}s`,
              }}
            />
          ))}
        </span>
      </div>

      {/* Inline keyframes for the dots animation */}
      <style>{`
        @keyframes feed-dot {
          0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}

// ── Image with fallback ──────────────────────────────────────────

function FeedImage({ src, alt }: { src: string; alt: string }) {
  const handleError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    // Replace the broken image with a gradient placeholder
    const img = e.currentTarget;
    img.style.display = 'none';
  }, []);

  return (
    <div className="relative w-full aspect-video bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
      <Rss className="w-8 h-8 text-muted-foreground/20 absolute" />
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onError={handleError}
        className={cn(
          'relative w-full h-full object-cover',
          'transition-transform duration-500 ease-out',
          'group-hover:scale-105'
        )}
      />
    </div>
  );
}

// ── Feed Card ────────────────────────────────────────────────────

interface FeedCardProps {
  item: FeedItem;
  onOpenUrl: (url: string) => void;
}

function FeedCard({ item, onOpenUrl }: FeedCardProps) {
  const publishedTime = item.publishedAt ? timeAgo(item.publishedAt) : timeAgo(item.createdAt);

  return (
    <article
      className={cn(
        'group rounded-xl border border-white/[0.06] bg-card/50 backdrop-blur-sm',
        'overflow-hidden transition-all duration-300 ease-out',
        'hover:border-white/[0.12] hover:shadow-lg hover:shadow-black/20',
        'hover:-translate-y-0.5'
      )}
    >
      {/* Image */}
      <button
        onClick={() => onOpenUrl(item.url)}
        className="block w-full overflow-hidden cursor-pointer"
        tabIndex={-1}
        aria-hidden="true"
      >
        {item.imageUrl ? (
          <FeedImage src={item.imageUrl} alt="" />
        ) : (
          <div
            className={cn(
              'w-full aspect-video',
              'bg-gradient-to-br from-primary/10 to-primary/5',
              'flex items-center justify-center'
            )}
          >
            <Rss className="w-8 h-8 text-muted-foreground/20" />
          </div>
        )}
      </button>

      {/* Content */}
      <div className="p-4 space-y-2.5">
        {/* Badges */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Source badge */}
          <span
            className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold leading-tight text-white/90 shrink-0"
            style={{ backgroundColor: item.sourceColor }}
          >
            {item.sourceName}
          </span>

          {/* Category badge */}
          <span
            className={cn(
              'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium leading-tight',
              CATEGORY_COLORS[item.sourceCategory]
            )}
          >
            {CATEGORY_LABELS[item.sourceCategory]}
          </span>

          {/* Language indicator */}
          <span className="text-[10px] text-muted-foreground/60 font-medium uppercase tracking-wider">
            {item.sourceLanguage === 'pl' ? 'PL' : 'EN'}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-sm font-semibold leading-snug text-foreground line-clamp-2">
          <button
            onClick={() => onOpenUrl(item.url)}
            className={cn(
              'text-left hover:text-primary transition-colors duration-200 cursor-pointer',
              'focus-visible:outline-none focus-visible:text-primary'
            )}
          >
            {item.title}
          </button>
        </h3>

        {/* Description */}
        {item.description && (
          <p className="text-xs text-muted-foreground/70 leading-relaxed line-clamp-2">
            {item.description}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground/50">
            <time dateTime={item.publishedAt ?? item.createdAt}>{publishedTime}</time>
            {item.author && (
              <>
                <span aria-hidden="true">·</span>
                <span className="truncate max-w-[120px]">{item.author}</span>
              </>
            )}
          </div>

          <button
            onClick={() => onOpenUrl(item.url)}
            className={cn(
              'p-1 rounded-md text-muted-foreground/40',
              'hover:text-primary hover:bg-primary/10',
              'transition-colors duration-200',
              'opacity-0 group-hover:opacity-100',
              'focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary'
            )}
            aria-label={`Otwórz: ${item.title}`}
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </article>
  );
}

// ── Main View ────────────────────────────────────────────────────

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
        ) : error ? (
          <div className="flex-1 flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <Rss className="w-10 h-10 text-destructive/60" />
            <p className="text-sm text-center max-w-xs">{error}</p>
            <Button variant="outline" size="sm" onClick={() => fetchItems()}>
              Spróbuj ponownie
            </Button>
          </div>
        ) : items.length === 0 ? (
          /* Empty state */
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
            {/* Card grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map(item => (
                <FeedCard key={item.id} item={item} onOpenUrl={handleOpenUrl} />
              ))}
            </div>

            {/* Load more */}
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
