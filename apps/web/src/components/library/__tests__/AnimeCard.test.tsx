import { render, screen } from '@/test/test-utils';
import { AnimeCard } from '@/components/library/AnimeCard';
import type { AnimeEntry } from '@shiroani/shared';

vi.mock('@/components/library/CountdownBadge', () => ({
  CountdownBadge: ({ episode }: { airingAt: number; episode: number }) => (
    <div data-testid="countdown-badge">Ep {episode}</div>
  ),
}));

function createEntry(overrides: Partial<AnimeEntry> = {}): AnimeEntry {
  return {
    id: 1,
    title: 'Steins;Gate',
    status: 'watching',
    currentEpisode: 5,
    episodes: 12,
    score: 9,
    coverImage: 'https://example.com/cover.jpg',
    resumeUrl: 'https://example.com/watch/5',
    addedAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-06-01T00:00:00Z',
    ...overrides,
  };
}

describe('AnimeCard', () => {
  const onSelect = vi.fn();
  const onContinue = vi.fn();
  const onRemove = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders anime title', () => {
    render(<AnimeCard entry={createEntry()} onSelect={onSelect} />);

    expect(screen.getByText('Steins;Gate')).toBeInTheDocument();
  });

  it('renders progress text with total episodes', () => {
    render(
      <AnimeCard entry={createEntry({ currentEpisode: 5, episodes: 12 })} onSelect={onSelect} />
    );

    expect(screen.getByText('Odc. 5/12')).toBeInTheDocument();
  });

  it('renders progress text without total episodes', () => {
    render(
      <AnimeCard
        entry={createEntry({ currentEpisode: 3, episodes: undefined })}
        onSelect={onSelect}
      />
    );

    expect(screen.getByText('Odc. 3')).toBeInTheDocument();
  });

  it('shows score badge when score is greater than 0', () => {
    render(<AnimeCard entry={createEntry({ score: 8 })} onSelect={onSelect} />);

    expect(screen.getByText('8/10')).toBeInTheDocument();
  });

  it('hides score badge when score is 0', () => {
    render(<AnimeCard entry={createEntry({ score: 0 })} onSelect={onSelect} />);

    expect(screen.queryByText('0/10')).not.toBeInTheDocument();
  });

  it('hides score badge when score is undefined', () => {
    render(<AnimeCard entry={createEntry({ score: undefined })} onSelect={onSelect} />);

    expect(screen.queryByText(/\/10/)).not.toBeInTheDocument();
  });

  it('shows placeholder image when no coverImage', () => {
    render(<AnimeCard entry={createEntry({ coverImage: undefined })} onSelect={onSelect} />);

    expect(screen.getByText('Brak okładki')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('shows cover image when coverImage is provided', () => {
    render(<AnimeCard entry={createEntry()} onSelect={onSelect} />);

    const img = screen.getByRole('img', { name: 'Steins;Gate' });
    expect(img).toHaveAttribute('src', 'https://example.com/cover.jpg');
  });

  it('calls onSelect with entry when card is clicked', async () => {
    const entry = createEntry();
    const { user } = render(<AnimeCard entry={entry} onSelect={onSelect} />);

    await user.click(screen.getByText('Steins;Gate'));

    expect(onSelect).toHaveBeenCalledWith(entry);
  });

  it('shows action buttons on hover', async () => {
    const entry = createEntry();
    const { user } = render(
      <AnimeCard entry={entry} onSelect={onSelect} onContinue={onContinue} onRemove={onRemove} />
    );

    expect(screen.getByTitle('Edytuj')).toBeInTheDocument();

    await user.hover(screen.getByText('Steins;Gate'));

    expect(screen.getByTitle('Kontynuuj')).toBeInTheDocument();
    expect(screen.getByTitle('Edytuj')).toBeInTheDocument();
    expect(screen.getByTitle('Usuń')).toBeInTheDocument();
  });

  it('shows continue button only when resumeUrl exists', () => {
    const { rerender } = render(
      <AnimeCard
        entry={createEntry({ resumeUrl: undefined })}
        onSelect={onSelect}
        onContinue={onContinue}
      />
    );

    expect(screen.queryByTitle('Kontynuuj')).not.toBeInTheDocument();

    rerender(
      <AnimeCard
        entry={createEntry({ resumeUrl: 'https://example.com/watch/5' })}
        onSelect={onSelect}
        onContinue={onContinue}
      />
    );

    expect(screen.getByTitle('Kontynuuj')).toBeInTheDocument();
  });

  it('does not show continue button when onContinue is not provided', () => {
    render(
      <AnimeCard
        entry={createEntry({ resumeUrl: 'https://example.com/watch/5' })}
        onSelect={onSelect}
      />
    );

    expect(screen.queryByTitle('Kontynuuj')).not.toBeInTheDocument();
  });

  it('calls onRemove when remove button is clicked', async () => {
    const entry = createEntry();
    const { user } = render(<AnimeCard entry={entry} onSelect={onSelect} onRemove={onRemove} />);

    await user.hover(screen.getByText('Steins;Gate'));
    await user.click(screen.getByTitle('Usuń'));

    expect(onRemove).toHaveBeenCalledWith(entry);
  });

  it('does not call onSelect when remove button is clicked', async () => {
    const entry = createEntry();
    const { user } = render(<AnimeCard entry={entry} onSelect={onSelect} onRemove={onRemove} />);

    await user.hover(screen.getByText('Steins;Gate'));
    await user.click(screen.getByTitle('Usuń'));

    // onSelect should only have been called 0 times from the button click
    // (stopPropagation prevents the card click)
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('renders status label from STATUS_CONFIG', () => {
    render(<AnimeCard entry={createEntry({ status: 'completed' })} onSelect={onSelect} />);

    expect(screen.getByText('Ukończone')).toBeInTheDocument();
  });

  it('does not show remove button when onRemove is not provided', () => {
    render(<AnimeCard entry={createEntry()} onSelect={onSelect} />);

    expect(screen.queryByTitle('Usuń')).not.toBeInTheDocument();
  });
});
