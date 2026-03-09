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
import type { BrowserTab } from '@shiroani/shared';

interface BrowserTabBarProps {
  tabs: BrowserTab[];
  activeTabId: string | null;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  onNewTab: () => void;
  onReorderTabs: (activeId: string, overId: string) => void;
}

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
  return (
    <div
      className={cn(
        'group flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs',
        'min-w-[100px] max-w-[200px] shrink-0',
        isActive
          ? 'bg-background text-foreground shadow-sm'
          : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground',
        isDragOverlay && 'shadow-lg ring-1 ring-primary/30 opacity-90'
      )}
    >
      {tab.isLoading ? (
        <Loader2 className="w-3 h-3 shrink-0 animate-spin text-primary" />
      ) : tab.favicon ? (
        <img
          src={tab.favicon}
          alt=""
          className="w-3 h-3 shrink-0 rounded-sm"
          onError={e => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      ) : (
        <Globe className="w-3 h-3 shrink-0" />
      )}
      <span className="truncate flex-1">{tab.title || 'Nowa karta'}</span>
      {onClose && (
        <button
          onClick={onClose}
          className={cn(
            'w-4 h-4 flex items-center justify-center rounded-sm shrink-0',
            'opacity-0 group-hover:opacity-100 hover:bg-destructive/20 hover:text-destructive',
            'transition-opacity duration-150'
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn('cursor-pointer transition-all duration-150', isDragging && 'z-10')}
      onClick={handleClick}
      {...attributes}
      {...listeners}
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

  const activeDragTab = activeDragId ? (tabs.find(t => t.id === activeDragId) ?? null) : null;

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
    <div className="flex items-center h-9 bg-card/60 border-b border-border px-1 gap-0.5 shrink-0">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToHorizontalAxis]}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="flex-1 flex items-center gap-0.5 overflow-x-auto scrollbar-hide">
          <SortableContext items={tabIds} strategy={horizontalListSortingStrategy}>
            {tabs.map(tab => (
              <SortableTab
                key={tab.id}
                tab={tab}
                isActive={tab.id === activeTabId}
                onSelect={() => onSelectTab(tab.id)}
                onClose={e => {
                  e.stopPropagation();
                  onCloseTab(tab.id);
                }}
                wasDragging={wasDragging}
              />
            ))}
          </SortableContext>

          {/* New tab button -- inline next to last tab */}
          <TooltipButton
            variant="ghost"
            size="icon"
            className="w-7 h-7 shrink-0"
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
