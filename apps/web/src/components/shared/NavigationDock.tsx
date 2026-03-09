import { BookOpen, Calendar, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore, type ActiveView } from '@/stores/useAppStore';
import { APP_LOGO_URL } from '@/lib/constants';

interface NavItem {
  id: ActiveView;
  label: string;
}

const ALL_ITEMS: NavItem[] = [
  { id: 'browser', label: 'Internet' },
  { id: 'library', label: 'Biblioteka' },
  { id: 'schedule', label: 'Plan' },
  { id: 'settings', label: 'Ustawienia' },
];

// Layout constants (px) — keep in sync with classNames below
const ITEM_W = 56; // w-14
const GAP = 4; // gap-1
const PAD_X = 8; // px-2

/** Renders the icon for each nav item with per-item hover/active animations */
function DockIcon({ id, isActive }: { id: ActiveView; isActive: boolean }) {
  const base = 'w-6 h-6 transition-transform duration-300 ease-out motion-reduce:transition-none';

  switch (id) {
    case 'browser':
      return (
        <img
          src={APP_LOGO_URL}
          alt=""
          draggable={false}
          className={cn(
            'w-6 h-6 object-contain transition-transform duration-300 ease-out motion-reduce:transition-none',
            isActive && 'animate-[dock-bob_2s_ease-in-out_infinite] motion-reduce:animate-none'
          )}
        />
      );
    case 'library':
      return (
        <BookOpen
          className={cn(
            base,
            'group-hover:rotate-[-8deg] group-hover:scale-110',
            isActive && 'animate-[dock-wiggle_2.5s_ease-in-out_infinite] motion-reduce:animate-none'
          )}
        />
      );
    case 'schedule':
      return (
        <Calendar
          className={cn(
            base,
            'group-hover:scale-110 group-hover:-translate-y-0.5',
            isActive && 'animate-[dock-pulse_2s_ease-in-out_infinite] motion-reduce:animate-none'
          )}
        />
      );
    case 'settings':
      return (
        <Settings
          className={cn(
            base,
            'group-hover:rotate-90',
            isActive && 'animate-[dock-spin_4s_linear_infinite] motion-reduce:animate-none'
          )}
        />
      );
  }
}

function DockItem({
  item,
  isActive,
  onClick,
}: {
  item: NavItem;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-current={isActive ? 'page' : undefined}
      aria-label={item.label}
      className={cn(
        'group relative z-[1] flex flex-col items-center justify-center gap-1',
        'w-14 h-12 rounded-xl',
        'transition-colors duration-200 ease-out',
        'motion-reduce:transition-none',
        isActive
          ? 'text-primary-foreground'
          : 'text-sidebar-foreground/50 hover:text-sidebar-foreground/80'
      )}
    >
      <DockIcon id={item.id} isActive={isActive} />
      <span
        className={cn(
          'text-[10px] leading-none font-medium',
          isActive ? 'text-primary-foreground/90' : 'text-sidebar-foreground/40'
        )}
      >
        {item.label}
      </span>
    </button>
  );
}

interface NavigationDockProps {
  hasBg: boolean;
}

export function NavigationDock({ hasBg }: NavigationDockProps) {
  const activeView = useAppStore(s => s.activeView);
  const navigateTo = useAppStore(s => s.navigateTo);

  const activeIndex = ALL_ITEMS.findIndex(item => item.id === activeView);

  return (
    <nav
      aria-label="Nawigacja glowna"
      className={cn(
        'fixed bottom-3 left-1/2 -translate-x-1/2 z-40',
        'animate-slide-up motion-reduce:animate-none'
      )}
    >
      <div
        className={cn(
          'relative flex items-center gap-1 px-2 py-1.5 rounded-2xl',
          'border border-white/[0.06]',
          'shadow-[0_4px_20px_rgba(0,0,0,0.3)]',
          hasBg ? 'bg-black/35 backdrop-blur-xl' : 'bg-sidebar/85 backdrop-blur-md'
        )}
      >
        {/* Subtle top highlight */}
        <div className="pointer-events-none absolute inset-x-3 top-0 h-px rounded-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        {/* Sliding active pill */}
        <div
          className={cn(
            'absolute top-1.5 h-[calc(100%-12px)] rounded-xl',
            'bg-primary/90',
            'shadow-[0_2px_8px_var(--primary)/0.3,0_0_20px_var(--primary)/0.15]',
            'transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)]',
            'motion-reduce:transition-none'
          )}
          style={{
            width: `${ITEM_W}px`,
            left: `${PAD_X + activeIndex * (ITEM_W + GAP)}px`,
          }}
        />

        {ALL_ITEMS.map(item => (
          <DockItem
            key={item.id}
            item={item}
            isActive={activeView === item.id}
            onClick={() => navigateTo(item.id)}
          />
        ))}
      </div>
    </nav>
  );
}
