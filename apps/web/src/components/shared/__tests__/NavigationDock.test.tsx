import { render, screen, act } from '@/test/test-utils';
import { vi } from 'vitest';
import { useAppStore } from '@/stores/useAppStore';
import { useDockStore } from '@/stores/useDockStore';
import { NavigationDock } from '../NavigationDock';

vi.mock('@/lib/platform', () => ({ IS_ELECTRON: false }));

const NAV_ITEMS = [
  { id: 'browser', label: 'Internet' },
  { id: 'library', label: 'Biblioteka' },
  { id: 'diary', label: 'Dziennik' },
  { id: 'schedule', label: 'Harmonogram' },
  { id: 'settings', label: 'Ustawienia' },
] as const;

beforeEach(() => {
  useAppStore.setState({ activeView: 'browser' });
  useDockStore.setState({
    edge: 'bottom',
    offset: 50,
    autoHide: false,
    draggable: true,
    showLabels: true,
    isDragging: false,
    dragPosition: null,
    isExpanded: false,
    initialized: true,
  });
});

describe('NavigationDock', () => {
  it('renders all navigation items with correct labels', () => {
    render(<NavigationDock hasBg={false} />);

    for (const { label } of NAV_ITEMS) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it('renders all items as accessible buttons with aria-label', () => {
    render(<NavigationDock hasBg={false} />);

    for (const { label } of NAV_ITEMS) {
      const button = screen.getByRole('button', { name: label });
      expect(button).toBeInTheDocument();
    }
  });

  it('marks the active view with aria-current="page"', () => {
    useAppStore.setState({ activeView: 'library' });
    render(<NavigationDock hasBg={false} />);

    const activeButton = screen.getByRole('button', { name: 'Biblioteka' });
    expect(activeButton).toHaveAttribute('aria-current', 'page');

    // Other buttons should not have aria-current
    for (const { label } of NAV_ITEMS) {
      if (label === 'Biblioteka') continue;
      const button = screen.getByRole('button', { name: label });
      expect(button).not.toHaveAttribute('aria-current');
    }
  });

  it('calls navigateTo with the correct view id when clicking a nav item', async () => {
    const navigateTo = vi.fn();
    useAppStore.setState({ activeView: 'browser', navigateTo });

    const { user } = render(<NavigationDock hasBg={false} />);

    await user.click(screen.getByRole('button', { name: 'Dziennik' }));
    expect(navigateTo).toHaveBeenCalledWith('diary');

    await user.click(screen.getByRole('button', { name: 'Harmonogram' }));
    expect(navigateTo).toHaveBeenCalledWith('schedule');

    await user.click(screen.getByRole('button', { name: 'Ustawienia' }));
    expect(navigateTo).toHaveBeenCalledWith('settings');
  });

  it('has a nav landmark with the correct accessible name', () => {
    render(<NavigationDock hasBg={false} />);

    const nav = screen.getByRole('navigation', { name: 'Nawigacja główna' });
    expect(nav).toBeInTheDocument();
  });

  it('reflects activeView changes across different views', () => {
    render(<NavigationDock hasBg={false} />);

    // Default: browser is active
    expect(screen.getByRole('button', { name: 'Internet' })).toHaveAttribute(
      'aria-current',
      'page'
    );

    // Change to settings
    act(() => {
      useAppStore.setState({ activeView: 'settings' });
    });

    expect(screen.getByRole('button', { name: 'Ustawienia' })).toHaveAttribute(
      'aria-current',
      'page'
    );
    expect(screen.getByRole('button', { name: 'Internet' })).not.toHaveAttribute('aria-current');
  });

  it('shows collapsed logo when autoHide is enabled', () => {
    useDockStore.setState({ autoHide: true, isExpanded: false });
    render(<NavigationDock hasBg={false} />);

    // Should show the logo image but not nav buttons
    expect(screen.getByAltText('ShiroAni')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Internet' })).not.toBeInTheDocument();
  });

  it('renders vertically when edge is left or right', () => {
    useDockStore.setState({ edge: 'left' });
    render(<NavigationDock hasBg={false} />);

    // All items should still render
    for (const { label } of NAV_ITEMS) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    }
  });

  it('hides labels in icon-only mode', () => {
    useDockStore.setState({ showLabels: false });
    render(<NavigationDock hasBg={false} />);

    // Buttons should exist (via aria-label) but label text should not be visible
    for (const { label } of NAV_ITEMS) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
      expect(screen.queryByText(label)).not.toBeInTheDocument();
    }
  });
});
