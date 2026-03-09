import { Loader2, Globe, X, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TooltipButton } from '@/components/ui/tooltip-button';
import type { BrowserTab } from '@shiroani/shared';

interface BrowserTabBarProps {
  tabs: BrowserTab[];
  activeTabId: string | null;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  onNewTab: () => void;
}

export function BrowserTabBar({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onNewTab,
}: BrowserTabBarProps) {
  return (
    <div className="flex items-center h-9 bg-card/60 border-b border-border px-1 gap-0.5 shrink-0">
      <div className="flex-1 flex items-center gap-0.5 overflow-x-auto scrollbar-hide">
        {tabs.map(tab => (
          <div
            key={tab.id}
            onClick={() => onSelectTab(tab.id)}
            className={cn(
              'group flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs cursor-pointer',
              'transition-all duration-150 min-w-[100px] max-w-[200px] shrink-0',
              tab.id === activeTabId
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground'
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
            <button
              onClick={e => {
                e.stopPropagation();
                onCloseTab(tab.id);
              }}
              className={cn(
                'w-4 h-4 flex items-center justify-center rounded-sm shrink-0',
                'opacity-0 group-hover:opacity-100 hover:bg-destructive/20 hover:text-destructive',
                'transition-opacity duration-150'
              )}
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </div>
        ))}

        {/* New tab button — inline next to last tab */}
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
    </div>
  );
}
