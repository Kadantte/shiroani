import { useState, useEffect, useCallback, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Globe, Columns2 } from 'lucide-react';
import {
  isNewTabUrl,
  NEW_TAB_URL,
  type BrowserLeafNode,
  type BrowserNode,
  type BrowserSplitNode,
} from '@shiroani/shared';
import { findLeafById, useBrowserStore } from '@/stores/useBrowserStore';
import { AddToLibraryDialog } from '@/components/browser/AddToLibraryDialog';
import { BrowserTabBar } from '@/components/browser/BrowserTabBar';
import { BrowserToolbar } from '@/components/browser/BrowserToolbar';
import { BrowserWebview } from '@/components/browser/BrowserWebview';
import { NewTabPage } from '@/components/browser/NewTabPage';
import { useBrowserInit } from '@/components/browser/useBrowserInit';
import { unregisterWebview } from '@/components/browser/webviewRefs';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { TooltipButton } from '@/components/ui/tooltip-button';
import { cn } from '@/lib/utils';

// Actions are stable references — extract once outside render cycle
const {
  openTab,
  closeTab,
  switchTab,
  reorderTabs,
  navigate,
  goBack,
  goForward,
  reload,
  splitTabs,
  unsplitTab,
  closeFocusedPane,
} = useBrowserStore.getState();

interface PaneRendererProps {
  node: BrowserNode;
  activePaneId: string | null;
  /**
   * Id of the enclosing SplitNode, or null when this leaf sits at the top
   * level. Drives whether the per-pane chrome bar with the unsplit button
   * is rendered.
   */
  parentSplitId: string | null;
  /**
   * When true, the splitter is being dragged. Webview pointer events are
   * neutralised so the drag doesn't get swallowed by the guest content.
   */
  resizing: boolean;
  onSplitterStart: () => void;
  onSplitterEnd: () => void;
  onPaneClick: (paneId: string) => void;
}

function PaneChrome({ leaf, parentSplitId }: { leaf: BrowserLeafNode; parentSplitId: string }) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 h-[22px] px-2 shrink-0',
        'bg-[oklch(from_var(--card)_l_c_h/0.55)] border-b border-border-glass',
        'text-[11px] text-muted-foreground'
      )}
    >
      {leaf.favicon ? (
        <img src={leaf.favicon} alt="" className="w-3 h-3 shrink-0 rounded-[2px]" />
      ) : (
        <Globe className="w-3 h-3 shrink-0 opacity-60" />
      )}
      <span className="truncate flex-1">{leaf.title || 'Nowa karta'}</span>
      <TooltipButton
        variant="ghost"
        size="icon"
        className="size-5 rounded-sm text-muted-foreground hover:text-foreground"
        onClick={e => {
          e.stopPropagation();
          unsplitTab(parentSplitId);
        }}
        tooltip="Rozdziel"
        tooltipSide="bottom"
      >
        <Columns2 className="w-3 h-3" />
      </TooltipButton>
    </div>
  );
}

function renderNode(props: PaneRendererProps): JSX.Element {
  const { node, activePaneId, parentSplitId, resizing, onPaneClick } = props;

  if (node.kind === 'leaf') {
    if (isNewTabUrl(node.url)) {
      return <div key={node.id} className="absolute inset-0" />;
    }
    const isFocused = node.id === activePaneId;
    const showChrome = parentSplitId !== null;
    return (
      <div
        key={node.id}
        role="region"
        aria-label={showChrome ? 'Panel przeglądarki' : 'Karta przeglądarki'}
        onMouseDownCapture={() => onPaneClick(node.id)}
        className={cn(
          'relative h-full w-full overflow-hidden flex flex-col',
          isFocused && showChrome && 'ring-1 ring-inset ring-primary/40'
        )}
      >
        {showChrome && <PaneChrome leaf={node} parentSplitId={parentSplitId} />}
        <div className="relative flex-1 overflow-hidden">
          <BrowserWebview paneId={node.id} initialUrl={node.url} isActive />
          {resizing && (
            <div className="pointer-events-auto absolute inset-0 z-20" aria-hidden="true" />
          )}
        </div>
      </div>
    );
  }

  return renderSplit(node, props);
}

function renderSplit(split: BrowserSplitNode, props: PaneRendererProps): JSX.Element {
  const { activePaneId, onSplitterStart, onSplitterEnd, resizing, onPaneClick } = props;
  const direction = split.orientation;
  const leftPercent = Math.max(20, Math.min(80, split.ratio * 100));
  const rightPercent = 100 - leftPercent;
  const leftPanelId = `${split.id}-l`;
  const rightPanelId = `${split.id}-r`;

  const handleLayoutChanged = (layout: Record<string, number>) => {
    const leftSize = layout[leftPanelId];
    if (typeof leftSize !== 'number') return;
    useBrowserStore.getState().setSplitRatio(split.id, leftSize / 100);
  };

  return (
    <ResizablePanelGroup
      key={split.id}
      id={split.id}
      orientation={direction}
      onLayoutChanged={handleLayoutChanged}
      className="h-full w-full"
    >
      <ResizablePanel id={leftPanelId} defaultSize={leftPercent} minSize={20}>
        {renderNode({
          node: split.left,
          activePaneId,
          parentSplitId: split.id,
          resizing,
          onSplitterStart,
          onSplitterEnd,
          onPaneClick,
        })}
      </ResizablePanel>
      <ResizableHandle
        withHandle
        onPointerDownCapture={onSplitterStart}
        onPointerUp={onSplitterEnd}
        onPointerCancel={onSplitterEnd}
      />
      <ResizablePanel id={rightPanelId} defaultSize={rightPercent} minSize={20}>
        {renderNode({
          node: split.right,
          activePaneId,
          parentSplitId: split.id,
          resizing,
          onSplitterStart,
          onSplitterEnd,
          onPaneClick,
        })}
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}

/**
 * BrowserView: The main embedded browser interface.
 * Renders each top-level tab as a stacked layer (kept mounted across switches
 * to preserve webview state). Within a tab, the tree is rendered recursively —
 * leaves render <BrowserWebview>, splits render a ResizablePanelGroup.
 */
export function BrowserView() {
  // Granular selectors: only re-render when these specific slices change
  const tabs = useBrowserStore(useShallow(s => s.tabs));
  const activeTabId = useBrowserStore(s => s.activeTabId);
  const activePaneId = useBrowserStore(s => s.activePaneId);
  const splitTabsEnabled = useBrowserStore(s => s.splitTabsEnabled);
  const isFullScreen = useBrowserStore(s => s.isFullScreen);

  const [urlInput, setUrlInput] = useState('');
  const [isAddToLibraryOpen, setIsAddToLibraryOpen] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  const activePane = activePaneId ? findLeafById(tabs, activePaneId) : null;

  // Tab restoration on mount
  useBrowserInit();

  // Ref to focus address bar via Ctrl+L shortcut
  const urlInputRef = useRef<HTMLInputElement>(null);

  // Shared shortcut handler used by both local keydown and IPC-forwarded events.
  // When the webview has focus, key events don't reach the renderer's window,
  // so the main process intercepts them via before-input-event and forwards via IPC.
  const handleShortcut = useCallback(
    (input: { key: string; ctrl?: boolean; shift?: boolean; alt?: boolean }) => {
      if (input.ctrl && input.key === 'w') {
        closeFocusedPane();
      } else if (input.ctrl && input.key === 't') {
        openTab();
      } else if (input.ctrl && input.key === 'Tab') {
        const { tabs: t, activeTabId: aId } = useBrowserStore.getState();
        if (t.length < 2) return;
        const idx = t.findIndex(tab => tab.id === aId);
        const next = input.shift ? (idx - 1 + t.length) % t.length : (idx + 1) % t.length;
        switchTab(t[next].id);
      } else if (input.ctrl && input.key === 'l') {
        urlInputRef.current?.focus();
      } else if (input.ctrl && input.key === 'r') {
        reload();
      } else if (input.alt && input.key === 'ArrowLeft') {
        goBack();
      } else if (input.alt && input.key === 'ArrowRight') {
        goForward();
      }
    },
    []
  );

  // Keyboard shortcuts — local keydown for when renderer has focus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      const ctrl = e.ctrlKey || e.metaKey;
      const alt = e.altKey;
      const key = e.key;

      const isHandled =
        (ctrl && (key === 'w' || key === 't' || key === 'Tab' || key === 'l' || key === 'r')) ||
        (alt && (key === 'ArrowLeft' || key === 'ArrowRight'));

      if (isHandled) {
        e.preventDefault();
        handleShortcut({ key, ctrl, shift: e.shiftKey, alt });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleShortcut]);

  // Keyboard shortcuts — IPC-forwarded from webview's before-input-event
  useEffect(() => {
    const cleanup = window.electronAPI?.browser?.onShortcut?.(handleShortcut);
    return () => cleanup?.();
  }, [handleShortcut]);

  // Sync URL input with active pane URL (show empty for new tab page)
  useEffect(() => {
    if (activePane && !useBrowserStore.getState().isAddressBarFocused) {
      setUrlInput(isNewTabUrl(activePane.url) ? '' : activePane.url);
    }
  }, [activePane?.url, activePane?.id]);

  const isActivePaneNewTab = activePane ? isNewTabUrl(activePane.url) : false;

  // When navigating from the new tab page, update the focused leaf to swap in a webview
  const handleNewTabNavigate = useCallback(
    (url: string) => {
      if (!activePane) return;
      const { updateTabState } = useBrowserStore.getState();
      updateTabState(activePane.id, { url, isLoading: true });
    },
    [activePane]
  );

  // Home button: go back to new tab page
  const handleGoHome = useCallback(() => {
    if (!activePane) return;
    const { updateTabState } = useBrowserStore.getState();
    unregisterWebview(activePane.id);
    updateTabState(activePane.id, {
      url: NEW_TAB_URL,
      title: 'Nowa karta',
      isLoading: false,
      canGoBack: false,
      canGoForward: false,
    });
  }, [activePane]);

  const handlePaneClick = useCallback((paneId: string) => {
    useBrowserStore.getState().focusPane(paneId);
  }, []);

  const handleSplitterStart = useCallback(() => setIsResizing(true), []);
  const handleSplitterEnd = useCallback(() => setIsResizing(false), []);

  return (
    <div className="flex-1 flex flex-col overflow-hidden animate-fade-in">
      {/* Tab bar — hidden during HTML5 fullscreen */}
      {!isFullScreen && (
        <BrowserTabBar
          tabs={tabs}
          activeTabId={activeTabId}
          onSelectTab={switchTab}
          onCloseTab={closeTab}
          onNewTab={() => openTab()}
          onReorderTabs={reorderTabs}
          onSplitTabs={splitTabsEnabled ? splitTabs : undefined}
        />
      )}

      {/* Navigation toolbar — hidden during HTML5 fullscreen */}
      {!isFullScreen && (
        <BrowserToolbar
          urlInput={urlInput}
          onUrlInputChange={setUrlInput}
          canGoBack={activePane?.canGoBack ?? false}
          canGoForward={activePane?.canGoForward ?? false}
          isLoading={activePane?.isLoading ?? false}
          hasActiveTab={!!activePane}
          onGoBack={goBack}
          onGoForward={goForward}
          onReload={reload}
          onNavigate={navigate}
          onGoHome={handleGoHome}
          onAddToLibrary={() => setIsAddToLibraryOpen(true)}
          urlInputRef={urlInputRef}
        />
      )}

      {/* Tab content — every tab stays mounted to preserve webview state */}
      <div
        className={`flex-1 relative overflow-hidden ${isActivePaneNewTab ? '' : 'bg-background'}`}
      >
        {tabs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4">
            <Globe className="w-16 h-16 opacity-20" />
            <p className="text-sm">Kliknij +, żeby otworzyć nową kartę</p>
          </div>
        ) : (
          <>
            {isActivePaneNewTab && (
              <div className="absolute inset-0 z-10">
                <NewTabPage onNavigate={handleNewTabNavigate} />
              </div>
            )}
            {tabs.map(tab => (
              <div
                key={tab.id}
                className={cn('absolute inset-0', tab.id === activeTabId ? 'block' : 'hidden')}
              >
                {renderNode({
                  node: tab,
                  activePaneId,
                  parentSplitId: null,
                  resizing: isResizing,
                  onSplitterStart: handleSplitterStart,
                  onSplitterEnd: handleSplitterEnd,
                  onPaneClick: handlePaneClick,
                })}
              </div>
            ))}
          </>
        )}
      </div>

      {/* Add to Library dialog */}
      <AddToLibraryDialog
        open={isAddToLibraryOpen}
        onOpenChange={setIsAddToLibraryOpen}
        url={activePane?.url ?? ''}
        title={activePane?.title ?? ''}
      />
    </div>
  );
}
