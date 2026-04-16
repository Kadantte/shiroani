import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { LocalSeries, SeriesProgressSummary } from '@shiroani/shared';
import { SeriesCard } from './SeriesCard';

interface SeriesGridProps {
  series: LocalSeries[];
  progressBySeries: Record<number, SeriesProgressSummary>;
  onOpenSeries: (id: number) => void;
}

/** Target card width in px — column count is derived from container width. */
const TARGET_CARD_WIDTH = 180;
/** Gap between cards (both axes). */
const GAP = 12;

/**
 * Virtualized responsive grid of series cards.
 *
 * Column count is recalculated whenever the scroll container resizes (via
 * ResizeObserver), then the virtualizer sees one row per chunk of N cards.
 * At 2000+ series the visible DOM stays under ~30 nodes.
 */
export function SeriesGrid({ series, progressBySeries, onOpenSeries }: SeriesGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useLayoutEffect(() => {
    const node = scrollRef.current;
    if (!node) return;

    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(node);
    // Initial measurement — ResizeObserver fires on attach but we want the
    // first render to already have the correct width so there's no flash.
    setContainerWidth(node.clientWidth);

    return () => observer.disconnect();
  }, []);

  const columnCount = useMemo(() => {
    if (containerWidth <= 0) return 1;
    // Account for the gap between columns: N cards + (N-1) gaps <= width
    //   N * W + (N-1) * G <= width  =>  N <= (width + G) / (W + G)
    const cols = Math.floor((containerWidth + GAP) / (TARGET_CARD_WIDTH + GAP));
    return Math.max(1, cols);
  }, [containerWidth]);

  const rowCount = Math.ceil(series.length / columnCount);

  // Derive actual card width so columns fully fill the container (no dead
  // space on the right). The aspect ratio is 3:4 so height = width * 4/3.
  const cardWidth = useMemo(() => {
    if (columnCount === 0 || containerWidth === 0) return TARGET_CARD_WIDTH;
    return (containerWidth - GAP * (columnCount - 1)) / columnCount;
  }, [columnCount, containerWidth]);

  // Card height: poster (4/3 of width) + title/meta block + row gap.
  //
  // Title block measures ~64px rendered: px-2.5 py-2 padding (16px total) +
  // 2-line title (`text-xs` / `leading-tight` ≈ 30px) + space-y-0.5 gap (2px)
  // + meta row (`text-[10px]` ≈ 14px) = 62px. Pad up to 68 so nothing gets
  // clipped by `overflow-hidden` on the card.
  const TITLE_BLOCK_HEIGHT = 68;
  const rowHeight = Math.round(cardWidth * (4 / 3)) + TITLE_BLOCK_HEIGHT + GAP;

  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => rowHeight,
    overscan: 5,
  });

  // Re-measure when the row height changes (e.g. container resized).
  useEffect(() => {
    virtualizer.measure();
  }, [rowHeight, virtualizer]);

  const renderRow = useCallback(
    (rowIndex: number) => {
      const startIdx = rowIndex * columnCount;
      const endIdx = Math.min(startIdx + columnCount, series.length);
      const cells: React.ReactNode[] = [];
      for (let i = startIdx; i < endIdx; i += 1) {
        const s = series[i];
        cells.push(
          <div
            key={s.id}
            style={{
              width: cardWidth,
              flexShrink: 0,
            }}
          >
            <SeriesCard series={s} progress={progressBySeries[s.id]} onSelect={onOpenSeries} />
          </div>
        );
      }
      return cells;
    },
    [cardWidth, columnCount, series, progressBySeries, onOpenSeries]
  );

  return (
    <div ref={scrollRef} className="flex-1 overflow-auto px-5 pb-20" style={{ contain: 'strict' }}>
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map(virtualRow => (
          <div
            key={virtualRow.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              transform: `translateY(${virtualRow.start}px)`,
              display: 'flex',
              gap: GAP,
            }}
          >
            {renderRow(virtualRow.index)}
          </div>
        ))}
      </div>
    </div>
  );
}
