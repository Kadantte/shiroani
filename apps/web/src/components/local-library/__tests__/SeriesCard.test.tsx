import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { SeriesCard } from '@/components/local-library/grid/SeriesCard';
import type { LocalSeries, SeriesProgressSummary } from '@shiroani/shared';

function makeSeries(overrides: Partial<LocalSeries> = {}): LocalSeries {
  return {
    id: 1,
    rootId: 1,
    folderPath: '/lib/frieren',
    parsedTitle: 'Frieren',
    displayTitle: null,
    anilistId: null,
    matchStatus: 'unmatched',
    matchConfidence: null,
    posterPath: null,
    bannerPath: null,
    synopsis: null,
    genres: null,
    season: null,
    year: 2023,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('SeriesCard', () => {
  it('renders the series title', () => {
    render(<SeriesCard series={makeSeries()} onSelect={vi.fn()} />);
    expect(screen.getByText('Frieren')).toBeInTheDocument();
  });

  it('shows a watched/total counter when progress exists', () => {
    const progress: SeriesProgressSummary = {
      seriesId: 1,
      watchedCount: 3,
      totalCount: 12,
      lastWatchedAt: null,
      resumeEpisodeId: null,
      resumePositionSeconds: null,
      resumeDurationSeconds: null,
    };
    render(<SeriesCard series={makeSeries()} progress={progress} onSelect={vi.fn()} />);
    expect(screen.getByText('3/12')).toBeInTheDocument();
    expect(screen.getByText(/3 \/ 12 odc\./)).toBeInTheDocument();
  });

  it('shows "Niedopasowane" badge for unmatched series', () => {
    render(<SeriesCard series={makeSeries({ matchStatus: 'unmatched' })} onSelect={vi.fn()} />);
    expect(screen.getByText('Niedopasowane')).toBeInTheDocument();
  });

  it('fires onSelect with the series id on click', async () => {
    const onSelect = vi.fn();
    const { user } = render(<SeriesCard series={makeSeries({ id: 42 })} onSelect={onSelect} />);
    await user.click(screen.getByRole('button'));
    expect(onSelect).toHaveBeenCalledWith(42);
  });

  it('fires onSelect on Enter key press', async () => {
    const onSelect = vi.fn();
    const { user } = render(<SeriesCard series={makeSeries({ id: 7 })} onSelect={onSelect} />);
    const card = screen.getByRole('button');
    card.focus();
    await user.keyboard('{Enter}');
    expect(onSelect).toHaveBeenCalledWith(7);
  });
});
