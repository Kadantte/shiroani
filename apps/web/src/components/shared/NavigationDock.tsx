import { useCallback, useEffect, useRef, useState } from 'react';
import { BookOpen, Calendar, NotebookPen, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore, type ActiveView } from '@/stores/useAppStore';
import { useDockStore, type DockEdge } from '@/stores/useDockStore';
import { useDockDrag } from '@/hooks/useDockDrag';
import { APP_LOGO_URL } from '@/lib/constants';

interface NavItem {
  id: ActiveView;
  label: string;
}

const ALL_ITEMS: NavItem[] = [
  { id: 'browser', label: 'Internet' },
  { id: 'library', label: 'Biblioteka' },
  { id: 'diary', label: 'Dziennik' },
  { id: 'schedule', label: 'Plan' },
  { id: 'settings', label: 'Ustawienia' },
];

// Layout constants (px) — keep in sync with classNames below
const ITEM_W = 56; // w-14
const ITEM_W_COMPACT = 40; // w-10 (icon-only)
const ITEM_H = 48; // h-12
const ITEM_H_COMPACT = 40; // h-10 (icon-only)
const GAP = 4; // gap-1
const PAD_X = 8; // px-2
const PAD_Y = 6; // py-1.5

const COLLAPSE_DELAY = 400; // ms before starting collapse after mouse leave
const EDGE_MARGIN = 12; // px from viewport edge

// ── Edge-aware animation origins ──────────────────────────────────

const EXPAND_ORIGINS: Record<DockEdge, string> = {
  bottom: 'origin-bottom',
  top: 'origin-top',
  left: 'origin-left',
  right: 'origin-right',
};

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
    case 'diary':
      return (
        <NotebookPen
          className={cn(
            base,
            'group-hover:rotate-[-6deg] group-hover:scale-110',
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
  isVertical,
  showLabel,
  onClick,
}: {
  item: NavItem;
  isActive: boolean;
  isVertical: boolean;
  showLabel: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-current={isActive ? 'page' : undefined}
      aria-label={item.label}
      className={cn(
        'group relative z-[1] flex items-center justify-center',
        'rounded-xl',
        'transition-colors duration-200 ease-out',
        'motion-reduce:transition-none',
        showLabel && 'gap-1 flex-col',
        showLabel
          ? isVertical
            ? 'w-12 h-14'
            : 'w-14 h-12'
          : isVertical
            ? 'w-10 h-10'
            : 'w-10 h-10',
        isActive
          ? 'text-primary-foreground'
          : 'text-sidebar-foreground/50 hover:text-sidebar-foreground/80'
      )}
    >
      <DockIcon id={item.id} isActive={isActive} />
      {showLabel && (
        <span
          className={cn(
            'text-[10px] leading-none font-medium',
            isActive ? 'text-primary-foreground/90' : 'text-sidebar-foreground/40'
          )}
        >
          {item.label}
        </span>
      )}
    </button>
  );
}

// ── Position helpers ──────────────────────────────────────────────

function isVerticalEdge(edge: DockEdge): boolean {
  return edge === 'left' || edge === 'right';
}

/** Compute CSS position for the dock based on edge + offset */
function getDockStyle(
  edge: DockEdge,
  offset: number,
  isDragging: boolean,
  dragPosition: { x: number; y: number } | null
): React.CSSProperties {
  // During drag, position at cursor
  if (isDragging && dragPosition) {
    return {
      position: 'fixed',
      left: dragPosition.x,
      top: dragPosition.y,
      transform: 'translate(-50%, -50%)',
      zIndex: 50,
      transition: 'none',
    };
  }

  const style: React.CSSProperties = {
    position: 'fixed',
    zIndex: 40,
    transition: 'all 300ms cubic-bezier(0.25, 0.1, 0.25, 1)',
  };

  switch (edge) {
    case 'bottom':
      style.bottom = EDGE_MARGIN;
      style.left = `${offset}%`;
      style.transform = 'translateX(-50%)';
      break;
    case 'top':
      style.top = EDGE_MARGIN;
      style.left = `${offset}%`;
      style.transform = 'translateX(-50%)';
      break;
    case 'left':
      style.left = EDGE_MARGIN;
      style.top = `${offset}%`;
      style.transform = 'translateY(-50%)';
      break;
    case 'right':
      style.right = EDGE_MARGIN;
      style.top = `${offset}%`;
      style.transform = 'translateY(-50%)';
      break;
  }

  return style;
}

/** Get the sliding pill style for horizontal or vertical layout */
function getPillStyle(
  activeIndex: number,
  isVertical: boolean,
  showLabels: boolean
): React.CSSProperties {
  const itemW = showLabels ? ITEM_W : ITEM_W_COMPACT;
  const itemH = showLabels ? ITEM_H : ITEM_H_COMPACT;

  if (isVertical) {
    return {
      height: `${itemH}px`,
      top: `${PAD_Y + activeIndex * (itemH + GAP)}px`,
      width: `calc(100% - ${PAD_X * 2}px)`,
      left: `${PAD_X}px`,
    };
  }
  return {
    width: `${itemW}px`,
    left: `${PAD_X + activeIndex * (itemW + GAP)}px`,
  };
}

// ── Main component ────────────────────────────────────────────────

interface NavigationDockProps {
  hasBg: boolean;
}

export function NavigationDock({ hasBg }: NavigationDockProps) {
  const activeView = useAppStore(s => s.activeView);
  const navigateTo = useAppStore(s => s.navigateTo);

  const edge = useDockStore(s => s.edge);
  const offset = useDockStore(s => s.offset);
  const autoHide = useDockStore(s => s.autoHide);
  const draggable = useDockStore(s => s.draggable);
  const showLabels = useDockStore(s => s.showLabels);
  const isDragging = useDockStore(s => s.isDragging);
  const dragPosition = useDockStore(s => s.dragPosition);
  const isExpanded = useDockStore(s => s.isExpanded);
  const setExpanded = useDockStore(s => s.setExpanded);

  const dragHandlers = useDockDrag();
  const collapseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track collapsing state for exit animation
  const [isCollapsing, setIsCollapsing] = useState(false);

  const activeIndex = ALL_ITEMS.findIndex(item => item.id === activeView);
  const vertical = isVerticalEdge(edge);

  const dockStyle = getDockStyle(edge, offset, isDragging, dragPosition);
  const pillStyle = getPillStyle(activeIndex, vertical, showLabels);

  // Show expanded dock (full nav) when: not auto-hide, or expanded, or collapsing (exit anim)
  const showFullDock = !autoHide || isExpanded || isCollapsing || isDragging;

  // Clamp dock position on window resize so it doesn't go off-screen
  useEffect(() => {
    const handleResize = () => {
      const { offset: currentOffset } = useDockStore.getState();
      const clamped = Math.max(5, Math.min(95, currentOffset));
      if (clamped !== currentOffset) {
        useDockStore.getState().setOffset(clamped);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleMouseEnter = useCallback(() => {
    if (collapseTimer.current) {
      clearTimeout(collapseTimer.current);
      collapseTimer.current = null;
    }
    // Cancel ongoing collapse animation
    if (isCollapsing) {
      setIsCollapsing(false);
    }
    if (autoHide && !isExpanded) {
      setExpanded(true);
    }
  }, [autoHide, isExpanded, isCollapsing, setExpanded]);

  const handleMouseLeave = useCallback(() => {
    if (autoHide && isExpanded && !isDragging) {
      collapseTimer.current = setTimeout(() => {
        // Start collapse animation instead of immediately hiding
        setIsCollapsing(true);
        setExpanded(false);
        collapseTimer.current = null;
      }, COLLAPSE_DELAY);
    }
  }, [autoHide, isExpanded, isDragging, setExpanded]);

  // When collapse animation finishes, clear the collapsing state
  const handleAnimationEnd = useCallback(
    (e: React.AnimationEvent) => {
      if (isCollapsing && e.animationName === 'dock-collapse') {
        setIsCollapsing(false);
      }
    },
    [isCollapsing]
  );

  // Cleanup timer
  useEffect(() => {
    return () => {
      if (collapseTimer.current) clearTimeout(collapseTimer.current);
    };
  }, []);

  // Determine animation class
  const getAnimationClass = () => {
    if (!autoHide) return 'animate-slide-up motion-reduce:animate-none';
    if (isCollapsing) {
      return cn(
        'animate-[dock-collapse_350ms_cubic-bezier(0.4,0,1,1)_both] motion-reduce:animate-none',
        EXPAND_ORIGINS[edge]
      );
    }
    if (isExpanded) {
      return cn(
        'animate-[dock-expand_450ms_cubic-bezier(0.16,1,0.3,1)_both] motion-reduce:animate-none',
        EXPAND_ORIGINS[edge]
      );
    }
    return '';
  };

  if (!showFullDock) {
    // Collapsed: show only the logo
    return (
      <nav aria-label="Nawigacja główna">
        <div
          style={dockStyle}
          onMouseEnter={handleMouseEnter}
          onPointerDown={draggable ? dragHandlers.onPointerDown : undefined}
          onPointerMove={draggable ? dragHandlers.onPointerMove : undefined}
          onPointerUp={draggable ? dragHandlers.onPointerUp : undefined}
          className={cn(
            'flex items-center justify-center',
            'w-10 h-10 rounded-full',
            'border border-white/[0.06]',
            'shadow-[0_4px_20px_rgba(0,0,0,0.3)]',
            'animate-[dock-expand_450ms_cubic-bezier(0.16,1,0.3,1)_both] motion-reduce:animate-none',
            EXPAND_ORIGINS[edge],
            draggable && 'cursor-grab active:cursor-grabbing',
            'transition-shadow duration-300 ease-out',
            'hover:scale-110 hover:shadow-[0_4px_24px_rgba(0,0,0,0.4)]',
            hasBg ? 'bg-black/35 backdrop-blur-xl' : 'bg-sidebar/85 backdrop-blur-md'
          )}
        >
          <img
            src={APP_LOGO_URL}
            alt="ShiroAni"
            draggable={false}
            className="w-6 h-6 object-contain"
          />
        </div>
      </nav>
    );
  }

  return (
    <nav
      aria-label="Nawigacja główna"
      style={dockStyle}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onAnimationEnd={handleAnimationEnd}
    >
      <div
        onPointerDown={draggable ? dragHandlers.onPointerDown : undefined}
        onPointerMove={draggable ? dragHandlers.onPointerMove : undefined}
        onPointerUp={draggable ? dragHandlers.onPointerUp : undefined}
        className={cn(
          'relative flex items-center gap-1 rounded-2xl',
          'border border-white/[0.06]',
          'shadow-[0_4px_20px_rgba(0,0,0,0.3)]',
          draggable && 'cursor-grab active:cursor-grabbing',
          'touch-none select-none',
          isDragging && 'opacity-80 scale-95',
          getAnimationClass(),
          'transition-[opacity,transform,box-shadow] duration-200',
          vertical ? 'flex-col px-1.5 py-2' : 'flex-row px-2 py-1.5',
          hasBg ? 'bg-black/35 backdrop-blur-xl' : 'bg-sidebar/85 backdrop-blur-md'
        )}
      >
        {/* Subtle highlight */}
        <div
          className={cn(
            'pointer-events-none absolute rounded-full bg-gradient-to-r from-transparent via-white/10 to-transparent',
            vertical ? 'inset-y-3 left-0 w-px bg-gradient-to-b' : 'inset-x-3 top-0 h-px'
          )}
        />

        {/* Sliding active pill */}
        <div
          className={cn(
            'absolute rounded-xl',
            'bg-primary/90',
            'shadow-[0_2px_8px_var(--primary)/0.3,0_0_20px_var(--primary)/0.15]',
            'transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)]',
            'motion-reduce:transition-none',
            vertical ? 'left-1.5 w-[calc(100%-12px)]' : 'top-1.5 h-[calc(100%-12px)]'
          )}
          style={pillStyle}
        />

        {ALL_ITEMS.map(item => (
          <DockItem
            key={item.id}
            item={item}
            isActive={activeView === item.id}
            isVertical={vertical}
            showLabel={showLabels}
            onClick={() => {
              // Suppress click if pointer was a drag
              if (dragHandlers.hasDraggedRef.current) return;
              navigateTo(item.id);
            }}
          />
        ))}
      </div>
    </nav>
  );
}
