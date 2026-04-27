import { useState, useEffect, useCallback, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Globe } from 'lucide-react';
import {
  isNewTabUrl,
  NEW_TAB_URL,
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
import { cn } from '@/lib/utils';

// Actions are stable references — extract once outside render cycle
const { openTab, closeTab, switchTab, reorderTabs, navigate, goBack, goForward, reload } =
  useBrowserStore.getState();

interface PaneRendererProps {
  node: BrowserNode;
  activePaneId: string | null;
  /**
   * When true, the splitter is being dragged. Webview pointer events are
   * neutralised so the drag doesn't get swallowed by the guest content.
   */
  resizing: boolean;
  onSplitterStart: () => void;
  onSplitterEnd: () => void;
  onPaneClick: (paneId: string) => void;
}

function renderNode(props: PaneRendererProps): JSX.Element {
  const { node, activePaneId, resizing, onPaneClick } = props;

  if (node.kind === 'leaf') {
    if (isNewTabUrl(node.url)) {
      return <div key={node.id} className="absolute inset-0" />;
    }
    const isFocused = node.id === activePaneId;
    return (
      <div
        key={node.id}
        role="region"
        aria-label="Panel przeglądarki"
        onMouseDownCapture={() => onPaneClick(node.id)}
        className={cn(
          'relative h-full w-full overflow-hidden',
          isFocused && 'ring-1 ring-inset ring-primary/40'
        )}
      >
        <BrowserWebview tabId={node.id} initialUrl={node.url} isActive />
        {resizing && (
          <div className="pointer-events-auto absolute inset-0 z-20" aria-hidden="true" />
        )}
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
        const { activeTabId: id } = useBrowserStore.getState();
        if (id) closeTab(id);
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
