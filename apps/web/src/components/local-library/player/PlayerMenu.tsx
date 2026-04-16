import {
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentType,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MenuItem<T> {
  id: string;
  label: string;
  hint?: string | null;
  value: T;
}

interface PlayerMenuProps<T> {
  /** Button icon rendered in the trigger. */
  icon: ComponentType<{ className?: string }>;
  /** aria-label + tooltip text on the trigger. */
  label: string;
  /** Currently selected id. `null` = no selection (e.g. subtitles "Off"). */
  selectedId: string | null;
  items: ReadonlyArray<MenuItem<T>>;
  onSelect: (item: MenuItem<T>) => void;
  /** Optional free-form header rendered above the item list. */
  headerSlot?: ReactNode;
  /** Optional "Off" entry rendered at the top — selected when `selectedId === null`. */
  offLabel?: string | null;
  /** Fires when the user picks the "Off" entry (if `offLabel` is set). */
  onSelectOff?: () => void;
  /**
   * Called when the menu's open/close state changes. Used by the chrome
   * auto-hide logic so the controls stay visible while a menu is open.
   */
  onOpenChange?: (open: boolean) => void;
  /** Position the popover anchors to the trigger. */
  align?: 'left' | 'right';
}

/**
 * Headless-ish dropdown used by speed/audio/subtitle pickers in the control
 * bar. We deliberately avoid bringing in `@radix-ui/react-popover` here —
 * the menus are simple lists, the trigger + list are co-located, and we need
 * tight control over the close animation to cooperate with the chrome auto
 * hide. `onOpenChange` surfaces the state up so the parent can keep the bar
 * visible while the menu is open.
 */
export function PlayerMenu<T>({
  icon: Icon,
  label,
  selectedId,
  items,
  onSelect,
  headerSlot,
  offLabel,
  onSelectOff,
  onOpenChange,
  align = 'right',
}: PlayerMenuProps<T>) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    onOpenChange?.(open);
  }, [open, onOpenChange]);

  // Close on outside click / escape. We don't use a portal so the popover
  // stays part of the bar's DOM tree and inherits the bar's stacking context.
  useEffect(() => {
    if (!open) return;

    const onDown = (e: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        // Swallow — don't let the player close on top of us.
        e.stopPropagation();
      }
    };

    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [open]);

  const handleTriggerKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      // Don't let Space / Enter bubble up to the global keyboard shortcuts
      // (which would toggle playback). Let the button's default onClick do
      // its thing.
      e.stopPropagation();
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        title={label}
        onClick={() => setOpen(v => !v)}
        onKeyDown={handleTriggerKey}
        className={cn(
          'flex h-9 w-9 items-center justify-center rounded-md text-white/80 transition-colors',
          'hover:bg-white/10 hover:text-white focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-white/40',
          open && 'bg-white/10 text-white'
        )}
      >
        <Icon className="h-4 w-4" />
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          className={cn(
            'absolute bottom-full mb-2 w-52 overflow-hidden rounded-xl border border-white/10 bg-[rgb(18_18_22/0.95)] shadow-xl backdrop-blur-xl',
            align === 'right' ? 'right-0' : 'left-0'
          )}
        >
          {headerSlot && (
            <div className="border-b border-white/5 px-3 py-2 text-[11px] uppercase tracking-wider text-white/50">
              {headerSlot}
            </div>
          )}
          <div className="max-h-72 overflow-y-auto py-1">
            {offLabel && onSelectOff && (
              <MenuRow
                active={selectedId === null}
                onClick={() => {
                  onSelectOff();
                  setOpen(false);
                }}
              >
                <span className="truncate">{offLabel}</span>
              </MenuRow>
            )}
            {items.map(item => (
              <MenuRow
                key={item.id}
                active={selectedId === item.id}
                onClick={() => {
                  onSelect(item);
                  setOpen(false);
                }}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm leading-tight">{item.label}</p>
                  {item.hint && (
                    <p className="mt-0.5 truncate text-[11px] text-white/50">{item.hint}</p>
                  )}
                </div>
              </MenuRow>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MenuRow({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={active}
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-white/80 transition-colors',
        'hover:bg-white/10 hover:text-white focus-visible:bg-white/10 focus-visible:outline-hidden',
        active && 'text-white'
      )}
    >
      <span className="flex h-4 w-4 shrink-0 items-center justify-center text-primary">
        {active ? <Check className="h-4 w-4" /> : null}
      </span>
      {children}
    </button>
  );
}
