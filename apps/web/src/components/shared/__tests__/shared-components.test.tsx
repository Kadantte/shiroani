import { render, screen } from '@/test/test-utils';
import { ViewHeader } from '@/components/shared/ViewHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Heart, Star, Plus } from 'lucide-react';

// ---------------------------------------------------------------------------
// ViewHeader
// ---------------------------------------------------------------------------
describe('ViewHeader', () => {
  const filters = [
    { value: 'all', label: 'Wszystkie' },
    { value: 'fav', label: 'Ulubione' },
  ];

  const baseProps = {
    icon: Heart,
    title: 'Moja lista',
    searchQuery: '',
    onSearchChange: vi.fn(),
    filters,
    activeFilter: 'all' as const,
    onFilterChange: vi.fn(),
  };

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the title text', () => {
    render(<ViewHeader {...baseProps} />);
    expect(screen.getByText('Moja lista')).toBeInTheDocument();
  });

  it('renders the subtitle when provided', () => {
    render(<ViewHeader {...baseProps} subtitle="Podtytuł" />);
    expect(screen.getByText('Podtytuł')).toBeInTheDocument();
  });

  it('shows the search input with current value and calls onSearchChange on typing', async () => {
    const onSearchChange = vi.fn();
    const { user } = render(
      <ViewHeader {...baseProps} searchQuery="test" onSearchChange={onSearchChange} />
    );

    const input = screen.getByPlaceholderText('Szukaj...');
    expect(input).toHaveValue('test');

    await user.type(input, 'a');
    expect(onSearchChange).toHaveBeenCalled();
  });

  it('shows clear button when searchQuery is non-empty, clicking clears the query', async () => {
    const onSearchChange = vi.fn();
    const { user, rerender } = render(
      <ViewHeader {...baseProps} searchQuery="" onSearchChange={onSearchChange} />
    );

    // No clear button when empty
    const clearButtons = screen.queryAllByRole('button');
    // Only filter buttons should be present, no clear button with SearchX
    expect(
      clearButtons.every(btn => btn.textContent === 'Wszystkie' || btn.textContent === 'Ulubione')
    ).toBe(true);

    // Re-render with non-empty query
    rerender(<ViewHeader {...baseProps} searchQuery="coś" onSearchChange={onSearchChange} />);

    // The clear button is a <button> next to the input — it's the one that is NOT a filter button
    const allButtons = screen.getAllByRole('button');
    const clearButton = allButtons.find(
      btn => btn.textContent !== 'Wszystkie' && btn.textContent !== 'Ulubione'
    );
    expect(clearButton).toBeDefined();

    await user.click(clearButton!);
    expect(onSearchChange).toHaveBeenCalledWith('');
  });

  it('renders filter buttons with correct labels and calls onFilterChange on click', async () => {
    const onFilterChange = vi.fn();
    const { user } = render(<ViewHeader {...baseProps} onFilterChange={onFilterChange} />);

    expect(screen.getByText('Wszystkie')).toBeInTheDocument();
    expect(screen.getByText('Ulubione')).toBeInTheDocument();

    await user.click(screen.getByText('Ulubione'));
    expect(onFilterChange).toHaveBeenCalledWith('fav');
  });

  it('applies active styling to the active filter', () => {
    render(<ViewHeader {...baseProps} activeFilter="fav" />);

    const favButton = screen.getByText('Ulubione').closest('button')!;
    const allButton = screen.getByText('Wszystkie').closest('button')!;

    // Active filter has bg-primary/15 in its className
    expect(favButton.className).toContain('bg-primary/15');
    expect(allButton.className).not.toContain('bg-primary/15');
  });

  it('renders view mode toggles when onViewModeChange is provided', async () => {
    const onViewModeChange = vi.fn();
    const { user } = render(
      <ViewHeader {...baseProps} viewMode="grid" onViewModeChange={onViewModeChange} />
    );

    // Two view-mode toggle buttons (grid + list) plus the 2 filter buttons = 4 buttons total
    const allButtons = screen.getAllByRole('button');
    expect(allButtons.length).toBe(4);

    // Click the list-mode toggle (second of the two icon-only buttons)
    // The view mode buttons are the first two (before filters) in the DOM — actually they're in the top row
    // Let's find them by their lack of text content (they only have SVG icons)
    const iconOnlyButtons = allButtons.filter(btn => btn.textContent === '');
    expect(iconOnlyButtons.length).toBe(2);

    // Click the second icon button (list view)
    await user.click(iconOnlyButtons[1]);
    expect(onViewModeChange).toHaveBeenCalledWith('list');

    // Click the first icon button (grid view)
    await user.click(iconOnlyButtons[0]);
    expect(onViewModeChange).toHaveBeenCalledWith('grid');
  });

  it('does not render view mode toggles when onViewModeChange is not provided', () => {
    render(<ViewHeader {...baseProps} />);

    const allButtons = screen.getAllByRole('button');
    // Only 2 filter buttons, no view mode toggles
    expect(allButtons.length).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// EmptyState
// ---------------------------------------------------------------------------
describe('EmptyState', () => {
  it('renders title and subtitle', () => {
    render(<EmptyState icon={Star} title="Brak wyników" subtitle="Spróbuj zmienić filtry" />);

    expect(screen.getByText('Brak wyników')).toBeInTheDocument();
    expect(screen.getByText('Spróbuj zmienić filtry')).toBeInTheDocument();
  });

  it('renders action button and calls onClick when clicked', async () => {
    const onClick = vi.fn();
    const { user } = render(
      <EmptyState
        icon={Star}
        title="Brak wyników"
        subtitle="Spróbuj zmienić filtry"
        action={{ label: 'Dodaj nowy', onClick, icon: Plus }}
      />
    );

    const button = screen.getByRole('button', { name: /Dodaj nowy/i });
    expect(button).toBeInTheDocument();

    await user.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not render action button when action prop is omitted', () => {
    render(<EmptyState icon={Star} title="Brak wyników" subtitle="Spróbuj zmienić filtry" />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// ConfirmDialog
// ---------------------------------------------------------------------------
describe('ConfirmDialog', () => {
  const baseProps = {
    open: true,
    onOpenChange: vi.fn(),
    title: 'Potwierdzenie',
    description: 'Czy na pewno chcesz usunąć?',
    onConfirm: vi.fn(),
  };

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders title and description when open', () => {
    render(<ConfirmDialog {...baseProps} />);

    // Radix portals content into body, so screen queries work
    expect(screen.getByText('Potwierdzenie')).toBeInTheDocument();
    expect(screen.getByText('Czy na pewno chcesz usunąć?')).toBeInTheDocument();
  });

  it('uses default Polish labels "Usuń" and "Anuluj"', () => {
    render(<ConfirmDialog {...baseProps} />);

    expect(screen.getByRole('button', { name: 'Usuń' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Anuluj' })).toBeInTheDocument();
  });

  it('calls onConfirm when confirm button is clicked', async () => {
    const onConfirm = vi.fn();
    const { user } = render(<ConfirmDialog {...baseProps} onConfirm={onConfirm} />);

    await user.click(screen.getByRole('button', { name: 'Usuń' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onOpenChange(false) when cancel button is clicked', async () => {
    const onOpenChange = vi.fn();
    const { user } = render(<ConfirmDialog {...baseProps} onOpenChange={onOpenChange} />);

    await user.click(screen.getByRole('button', { name: 'Anuluj' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('does not render content when open is false', () => {
    render(<ConfirmDialog {...baseProps} open={false} />);

    expect(screen.queryByText('Potwierdzenie')).not.toBeInTheDocument();
  });

  it('uses custom labels when provided', () => {
    render(<ConfirmDialog {...baseProps} confirmLabel="Tak" cancelLabel="Nie" />);

    expect(screen.getByRole('button', { name: 'Tak' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Nie' })).toBeInTheDocument();
  });
});
