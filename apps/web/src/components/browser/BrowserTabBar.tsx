import { useState, useCallback } from 'react';
import { Loader2, Globe, X, Plus } from 'lucide-react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, useSortable, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToHorizontalAxis } from '@dnd-kit/modifiers';
import { cn } from '@/lib/utils';
import { TooltipButton } from '@/components/ui/tooltip-button';
import type { BrowserNode, BrowserTab } from '@shiroani/shared';

interface BrowserTabBarProps {
  tabs: BrowserNode[];
  activeTabId: string | null;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  onNewTab: () => void;
  onReorderTabs: (activeId: string, overId: string) => void;
}

/**
 * Derive the chip-friendly leaf representation for a top-level node. Splits
 * surface their first leaf so the strip still has a favicon and title until
 * chunk #6 introduces explicit split visuals.
 */
function nodeToChipLeaf(node: BrowserNode): BrowserTab & { id: string } {
  if (node.kind === 'leaf') {
    return node;
  }
  let cursor: BrowserNode = node;
  while (cursor.kind === 'split') cursor = cursor.left;
  return { ...cursor, id: node.id };
}

/**
 * Chromium-like tab strip matching Browser.html `.tabs`:
 *  - Thin 34px bar with dark chrome background
 *  - Rounded-top tabs (8px 8px 0 0) with favicon + title + close
 *  - Active tab gains a primary-tinted bg and subtle top-border glow
 *  - Close button appears on hover (and always on active)
 */

/** Presentational tab component used for the drag overlay */
function TabContent({
  tab,
  isActive,
  onClose,
  isDragOverlay = false,
}: {
  tab: BrowserTab;
  isActive: boolean;
  onClose?: (e: React.MouseEvent) => void;
  isDragOverlay?: boolean;
}) {
  const [imgError, setImgError] = useState(false);

  return (
    <div
      className={cn(
        'group relative flex items-center gap-2 h-[30px] px-3 text-[11.5px] font-medium',
        'rounded-t-[9px] border-b-0 shrink-0 min-w-[120px] max-w-[220px]',
        'transition-colors duration-150',
        isActive
          ? [
              'bg-card/90 text-foreground',
              'border border-border-glass',
              // Primary-tinted top glow
              'shadow-[inset_0_1px_0_oklch(from_var(--primary)_l_c_h/0.35)]',
            ].join(' ')
          : 'text-muted-foreground/90 border border-transparent hover:bg-foreground/[0.04] hover:text-foreground/90',
        isDragOverlay && 'shadow-lg ring-1 ring-primary/30 opacity-90'
      )}
    >
      {tab.isLoading ? (
        <Loader2 className="w-3 h-3 shrink-0 animate-spin text-primary" />
      ) : tab.favicon && !imgError ? (
        <img
          src={tab.favicon}
          alt=""
          className="w-3.5 h-3.5 shrink-0 rounded-[3px]"
          onError={() => setImgError(true)}
        />
      ) : (
        <Globe className="w-3 h-3 shrink-0 opacity-70" />
      )}
      <span className="truncate flex-1">{tab.title || 'Nowa karta'}</span>
      {onClose && (
        <button
          onClick={onClose}
          aria-label="Zamknij kartę"
          className={cn(
            'grid size-4 place-items-center rounded-sm shrink-0',
            'transition-opacity duration-150',
            'hover:bg-destructive/20 hover:text-destructive',
            isActive ? 'opacity-80 hover:opacity-100' : 'opacity-0 group-hover:opacity-80'
          )}
        >
          <X className="w-2.5 h-2.5" />
        </button>
      )}
    </div>
  );
}

/** Sortable wrapper for each tab */
function SortableTab({
  tab,
  isActive,
  onSelect,
  onClose,
  wasDragging,
}: {
  tab: BrowserTab;
  isActive: boolean;
  onSelect: () => void;
  onClose: (e: React.MouseEvent) => void;
  wasDragging: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: tab.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    // Make the original element semi-transparent while dragging
    opacity: isDragging ? 0.4 : 1,
  };

  const handleClick = useCallback(() => {
    // Suppress click if we just finished a drag to prevent accidental tab switch
    if (wasDragging) return;
    onSelect();
  }, [onSelect, wasDragging]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSelect();
      }
    },
    [onSelect]
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'cursor-pointer transition-all duration-150 flex items-end',
        isDragging && 'z-10'
      )}
      role="tab"
      aria-selected={isActive}
      tabIndex={isActive ? 0 : -1}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      <TabContent tab={tab} isActive={isActive} onClose={onClose} />
    </div>
  );
}

export function BrowserTabBar({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onNewTab,
  onReorderTabs,
}: BrowserTabBarProps) {
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [wasDragging, setWasDragging] = useState(false);

  // Use PointerSensor with a distance activation constraint so that
  // small clicks don't trigger drag, and the close button still works
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const activeDragNode = activeDragId ? (tabs.find(t => t.id === activeDragId) ?? null) : null;
  const activeDragTab = activeDragNode ? nodeToChipLeaf(activeDragNode) : null;

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
    setWasDragging(true);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveDragId(null);

      if (over && active.id !== over.id) {
        onReorderTabs(active.id as string, over.id as string);
      }

      // Reset wasDragging flag after a short delay to allow click suppression
      requestAnimationFrame(() => {
        setWasDragging(false);
      });
    },
    [onReorderTabs]
  );

  const handleDragCancel = useCallback(() => {
    setActiveDragId(null);
    requestAnimationFrame(() => {
      setWasDragging(false);
    });
  }, []);

  const tabIds = tabs.map(t => t.id);

  return (
    <div
      className={cn(
        'flex items-end gap-[2px] h-[38px] px-2 pt-2 shrink-0',
        'bg-[oklch(from_var(--card)_l_c_h/0.6)] border-b border-border-glass'
      )}
    >
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToHorizontalAxis]}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div
          role="tablist"
          className="flex items-end gap-[2px] flex-1 min-w-0 overflow-x-auto scrollbar-hide"
        >
          <SortableContext items={tabIds} strategy={horizontalListSortingStrategy}>
            {tabs.map(node => {
              const chipLeaf = nodeToChipLeaf(node);
              return (
                <SortableTab
                  key={node.id}
                  tab={chipLeaf}
                  isActive={node.id === activeTabId}
                  onSelect={() => onSelectTab(node.id)}
                  onClose={e => {
                    e.stopPropagation();
                    onCloseTab(node.id);
                  }}
                  wasDragging={wasDragging}
                />
              );
            })}
          </SortableContext>

          {/* New tab button — circle, sits inline next to last tab */}
          <TooltipButton
            variant="ghost"
            size="icon"
            className="size-7 rounded-full mb-[2px] shrink-0"
            onClick={onNewTab}
            tooltip="Nowa karta"
            tooltipSide="bottom"
          >
            <Plus className="w-3.5 h-3.5" />
          </TooltipButton>
        </div>

        {/* Drag overlay renders the dragged tab above everything */}
        <DragOverlay dropAnimation={null}>
          {activeDragTab ? (
            <TabContent
              tab={activeDragTab}
              isActive={activeDragTab.id === activeTabId}
              isDragOverlay
            />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
