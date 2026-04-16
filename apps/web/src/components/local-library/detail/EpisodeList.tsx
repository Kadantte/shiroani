import { useEffect, useMemo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { LocalEpisode, PlaybackProgress } from '@shiroani/shared';
import { EpisodeRow } from './EpisodeRow';

interface EpisodeListProps {
  episodes: LocalEpisode[];
  progressByEpisode: Record<number, PlaybackProgress>;
  onPlay: (episodeId: number) => void;
  onToggleWatched: (episodeId: number, watched: boolean) => void;
}

/** Virtualize only past a threshold — short lists render plainly to keep the
 *  DOM simple and avoid a11y surprises. */
const VIRTUALIZATION_THRESHOLD = 50;
const ROW_HEIGHT = 78; // px — EpisodeRow fixed height incl. spacing
const ROW_GAP = 6;

interface EpisodeGroup {
  season: number | null;
  episodes: LocalEpisode[];
}

/** Split episodes by season for grouped display. Null-season episodes fall
 *  into a single "No season" group at the end. */
function groupBySeason(episodes: LocalEpisode[]): EpisodeGroup[] {
  const bySeason = new Map<number | null, LocalEpisode[]>();
  for (const ep of episodes) {
    const key = ep.parsedSeason ?? null;
    const bucket = bySeason.get(key) ?? [];
    bucket.push(ep);
    bySeason.set(key, bucket);
  }
  const groups: EpisodeGroup[] = [];
  const seasons = Array.from(bySeason.keys()).sort((a, b) => {
    if (a === null) return 1;
    if (b === null) return -1;
    return a - b;
  });
  for (const season of seasons) {
    groups.push({ season, episodes: bySeason.get(season) ?? [] });
  }
  return groups;
}

export function EpisodeList({
  episodes,
  progressByEpisode,
  onPlay,
  onToggleWatched,
}: EpisodeListProps) {
  const groups = useMemo(() => groupBySeason(episodes), [episodes]);
  const hasMultipleSeasons = groups.length > 1;

  // Short list → plain render, no virtualization.
  if (episodes.length <= VIRTUALIZATION_THRESHOLD) {
    return (
      <div className="space-y-4">
        {groups.map(group => (
          <div key={`s${group.season ?? 'none'}`} className="space-y-1.5">
            {hasMultipleSeasons && (
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/70 px-1 pt-2">
                {group.season === null ? 'Inne' : `Sezon ${group.season}`}
              </h3>
            )}
            <div className="space-y-1.5">
              {group.episodes.map(ep => (
                <EpisodeRow
                  key={ep.id}
                  episode={ep}
                  progress={progressByEpisode[ep.id]}
                  onPlay={onPlay}
                  onToggleWatched={onToggleWatched}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <VirtualizedEpisodeList
      groups={groups}
      hasMultipleSeasons={hasMultipleSeasons}
      progressByEpisode={progressByEpisode}
      onPlay={onPlay}
      onToggleWatched={onToggleWatched}
    />
  );
}

interface VirtualizedEpisodeListProps {
  groups: EpisodeGroup[];
  hasMultipleSeasons: boolean;
  progressByEpisode: Record<number, PlaybackProgress>;
  onPlay: (episodeId: number) => void;
  onToggleWatched: (episodeId: number, watched: boolean) => void;
}

/** Flat virtualization with heterogeneous rows (headers + episodes). */
type FlatItem =
  | { kind: 'header'; label: string; key: string }
  | { kind: 'episode'; episode: LocalEpisode; key: string };

function VirtualizedEpisodeList({
  groups,
  hasMultipleSeasons,
  progressByEpisode,
  onPlay,
  onToggleWatched,
}: VirtualizedEpisodeListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const flatItems: FlatItem[] = useMemo(() => {
    const items: FlatItem[] = [];
    for (const group of groups) {
      if (hasMultipleSeasons) {
        items.push({
          kind: 'header',
          label: group.season === null ? 'Inne' : `Sezon ${group.season}`,
          key: `header-${group.season ?? 'none'}`,
        });
      }
      for (const ep of group.episodes) {
        items.push({ kind: 'episode', episode: ep, key: `ep-${ep.id}` });
      }
    }
    return items;
  }, [groups, hasMultipleSeasons]);

  const virtualizer = useVirtualizer({
    count: flatItems.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: index => (flatItems[index].kind === 'header' ? 36 : ROW_HEIGHT + ROW_GAP),
    overscan: 8,
  });

  useEffect(() => {
    virtualizer.measure();
  }, [flatItems.length, virtualizer]);

  return (
    <div
      ref={scrollRef}
      className="relative max-h-[70vh] overflow-auto"
      style={{ contain: 'strict' }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          position: 'relative',
          width: '100%',
        }}
      >
        {virtualizer.getVirtualItems().map(virtualItem => {
          const item = flatItems[virtualItem.index];
          return (
            <div
              key={virtualItem.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                transform: `translateY(${virtualItem.start}px)`,
                paddingBottom: ROW_GAP,
              }}
            >
              {item.kind === 'header' ? (
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/70 px-1 pt-2 pb-1">
                  {item.label}
                </h3>
              ) : (
                <EpisodeRow
                  episode={item.episode}
                  progress={progressByEpisode[item.episode.id]}
                  onPlay={onPlay}
                  onToggleWatched={onToggleWatched}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
