import { memo, useCallback } from 'react';
import { Rss, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { timeAgo } from '@shiroani/shared';
import type { FeedItem } from '@shiroani/shared';
import { CATEGORY_LABELS, CATEGORY_COLORS } from './feed-constants';

function FeedImage({ src, alt }: { src: string; alt: string }) {
  const handleError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
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
        decoding="async"
        draggable={false}
        onError={handleError}
        className="relative w-full h-full object-cover"
      />
    </div>
  );
}

interface FeedCardProps {
  item: FeedItem;
  onOpenUrl: (url: string) => void;
}

export const FeedCard = memo(function FeedCard({ item, onOpenUrl }: FeedCardProps) {
  const publishedTime = item.publishedAt ? timeAgo(item.publishedAt) : timeAgo(item.createdAt);

  return (
    <article
      className={cn(
        'group rounded-xl border border-white/[0.06] bg-card/50',
        'overflow-hidden transition-colors duration-200',
        'hover:border-white/[0.12] hover:bg-card/65 hover:shadow-md hover:shadow-black/10'
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
          <span
            className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold leading-tight text-white/90 shrink-0"
            style={{ backgroundColor: item.sourceColor }}
          >
            {item.sourceName}
          </span>

          <span
            className={cn(
              'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium leading-tight',
              CATEGORY_COLORS[item.sourceCategory]
            )}
          >
            {CATEGORY_LABELS[item.sourceCategory]}
          </span>

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
              'transition-all duration-150',
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
});
