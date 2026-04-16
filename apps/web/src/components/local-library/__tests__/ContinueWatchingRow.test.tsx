import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { ContinueWatchingRow } from '@/components/local-library/grid/ContinueWatchingRow';
import type {
  ContinueWatchingItem,
  LocalEpisode,
  LocalSeries,
  PlaybackProgress,
} from '@shiroani/shared';

function makeItem(id: number, overrides: Partial<ContinueWatchingItem> = {}): ContinueWatchingItem {
  const series: LocalSeries = {
    id,
    rootId: 1,
    folderPath: `/lib/${id}`,
    parsedTitle: `Series ${id}`,
    displayTitle: null,
    anilistId: null,
    matchStatus: 'unmatched',
    matchConfidence: null,
    posterPath: null,
    bannerPath: null,
    synopsis: null,
    genres: null,
    season: null,
    year: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };
  const episode: LocalEpisode = {
    id: id * 10,
    seriesId: id,
    filePath: `/lib/${id}/01.mkv`,
    fileSize: 1024,
    fileHash: null,
    durationSeconds: 1400,
    width: null,
    height: null,
    videoCodec: null,
    audioTracks: null,
    subtitleTracks: null,
    parsedEpisodeNumber: 1,
    parsedSeason: 1,
    parsedTitle: `Episode ${id}`,
    releaseGroup: null,
    kind: 'episode',
    mtime: '2026-01-01T00:00:00Z',
    createdAt: '2026-01-01T00:00:00Z',
  };
  const progress: PlaybackProgress = {
    episodeId: id * 10,
    positionSeconds: 500,
    durationSeconds: 1400,
    completed: false,
    completedAt: null,
    watchCount: 0,
    updatedAt: '2026-04-15T00:00:00Z',
  };
  return { series, episode, progress, ...overrides };
}

describe('ContinueWatchingRow', () => {
  it('renders nothing when the items array is empty', () => {
    const { container } = render(
      <ContinueWatchingRow items={[]} onPlay={vi.fn()} onOpenSeries={vi.fn()} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders a card for each item', () => {
    render(
      <ContinueWatchingRow
        items={[makeItem(1), makeItem(2)]}
        onPlay={vi.fn()}
        onOpenSeries={vi.fn()}
      />
    );
    expect(screen.getByText('Series 1')).toBeInTheDocument();
    expect(screen.getByText('Series 2')).toBeInTheDocument();
  });

  it('fires onPlay when the card is clicked', async () => {
    const onPlay = vi.fn();
    const { user } = render(
      <ContinueWatchingRow items={[makeItem(1)]} onPlay={onPlay} onOpenSeries={vi.fn()} />
    );
    const card = screen.getByText('Series 1').closest('div[class*="relative"]');
    expect(card).not.toBeNull();
    await user.click(card as Element);
    expect(onPlay).toHaveBeenCalledWith(10);
  });

  it('fires onOpenSeries when the title is clicked', async () => {
    const onOpenSeries = vi.fn();
    const { user } = render(
      <ContinueWatchingRow items={[makeItem(3)]} onPlay={vi.fn()} onOpenSeries={onOpenSeries} />
    );
    await user.click(screen.getByText('Series 3'));
    expect(onOpenSeries).toHaveBeenCalledWith(3);
  });
});
