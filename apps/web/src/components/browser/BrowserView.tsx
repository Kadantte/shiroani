import { useState, useRef, useEffect, useCallback, type KeyboardEvent } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Shield,
  ShieldOff,
  Home,
  Plus,
  X,
  Loader2,
  Globe,
  BookmarkPlus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { useBrowserStore } from '@/stores/useBrowserStore';
import { AddToLibraryDialog } from '@/components/browser/AddToLibraryDialog';

/**
 * BrowserView: The main embedded browser interface.
 * Provides tab bar, navigation toolbar, and a content area
 * where the Electron WebContentsView overlays.
 */
export function BrowserView() {
  const {
    tabs,
    activeTabId,
    adblockEnabled,
    isFullScreen,
    openTab,
    getDefaultUrl,
    closeTab,
    switchTab,
    navigate,
    goBack,
    goForward,
    reload,
    toggleAdblock,
    initListeners,
  } = useBrowserStore();

  const [urlInput, setUrlInput] = useState('');
  const [isAddToLibraryOpen, setIsAddToLibraryOpen] = useState(false);
  const urlInputRef = useRef<HTMLInputElement>(null);

  // Hide/show the native WebContentsView overlay when the dialog opens/closes
  // (native views sit above the renderer — CSS z-index can't fix this)
  const handleAddToLibraryOpenChange = useCallback((open: boolean) => {
    setIsAddToLibraryOpen(open);
    if (open) {
      window.electronAPI?.browser?.hide();
    } else {
      window.electronAPI?.browser?.show();
    }
  }, []);
  const contentRef = useRef<HTMLDivElement>(null);

  const activeTab = tabs.find(t => t.id === activeTabId);

  // Sync URL input with active tab URL
  useEffect(() => {
    if (activeTab && !useBrowserStore.getState().isAddressBarFocused) {
      setUrlInput(activeTab.url);
    }
  }, [activeTab?.url, activeTab]);

  // On mount, fetch any tabs restored by the main process from the previous session,
  // then initialize listeners. This order prevents the onTabUpdated listener from
  // creating duplicates of tabs that getTabs() is about to populate.
  const [initialCheckDone, setInitialCheckDone] = useState(false);
  useEffect(() => {
    let cleanup: (() => void) | undefined;

    window.electronAPI?.browser
      ?.getTabs()
      .then(existingTabs => {
        if (existingTabs.length > 0) {
          // Populate store with restored tabs
          const store = useBrowserStore.getState();
          for (const tab of existingTabs) {
            store.updateTabState(tab.id, tab);
          }
          // Set the tabs and active tab in one go
          useBrowserStore.setState({
            tabs: existingTabs,
            activeTabId: existingTabs[existingTabs.length - 1]?.id ?? null,
          });
          // Ask main process which tab is actually active
          return window.electronAPI?.browser?.getActiveTab();
        }
        return null;
      })
      .then(activeId => {
        if (activeId) {
          useBrowserStore.setState({ activeTabId: activeId });
        }
        // Initialize listeners after tab population to avoid duplicates
        cleanup = initListeners();
        setInitialCheckDone(true);
      })
      .catch(() => {
        // Still initialize listeners on error so the browser remains functional
        cleanup = initListeners();
        setInitialCheckDone(true);
      });

    return () => cleanup?.();
  }, [initListeners]);

  // Open a default tab if none exist (after initial check completes)
  useEffect(() => {
    if (initialCheckDone && tabs.length === 0) {
      openTab();
    }
  }, [initialCheckDone, tabs.length, openTab]);

  // ResizeObserver: report browser content bounds to main process
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    const reportBounds = () => {
      const rect = el.getBoundingClientRect();
      window.electronAPI?.browser?.resize({
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      });
    };

    const observer = new ResizeObserver(reportBounds);
    observer.observe(el);
    // Report initial bounds
    reportBounds();

    return () => observer.disconnect();
  }, [activeTabId]);

  const handleUrlSubmit = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && urlInput.trim()) {
        navigate(urlInput.trim());
        urlInputRef.current?.blur();
      }
    },
    [urlInput, navigate]
  );

  const handleUrlFocus = useCallback(() => {
    useBrowserStore.getState().setAddressBarFocused(true);
    urlInputRef.current?.select();
  }, []);

  const handleUrlBlur = useCallback(() => {
    useBrowserStore.getState().setAddressBarFocused(false);
  }, []);

  return (
    <div className="flex-1 flex flex-col overflow-hidden animate-fade-in">
      {/* Tab bar — hidden during HTML5 fullscreen */}
      {!isFullScreen && (
        <div className="flex items-center h-9 bg-card/60 border-b border-border px-1 gap-0.5 shrink-0">
          <div className="flex-1 flex items-center gap-0.5 overflow-x-auto scrollbar-hide">
            {tabs.map(tab => (
              <div
                key={tab.id}
                onClick={() => switchTab(tab.id)}
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
                    closeTab(tab.id);
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
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-7 h-7 shrink-0"
                  onClick={() => openTab()}
                >
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Nowa karta</TooltipContent>
            </Tooltip>
          </div>
        </div>
      )}

      {/* Navigation toolbar — hidden during HTML5 fullscreen */}
      {!isFullScreen && (
        <div className="flex items-center h-10 px-2 gap-1 bg-card/40 border-b border-border shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="w-8 h-8"
                onClick={goBack}
                disabled={!activeTab?.canGoBack}
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Wstecz</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="w-8 h-8"
                onClick={goForward}
                disabled={!activeTab?.canGoForward}
              >
                <ArrowRight className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Do przodu</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="w-8 h-8" onClick={reload}>
                {activeTab?.isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RotateCw className="w-4 h-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {activeTab?.isLoading ? 'Ladowanie...' : 'Odswiez'}
            </TooltipContent>
          </Tooltip>

          <div className="flex-1 mx-1">
            <Input
              ref={urlInputRef}
              value={urlInput}
              onChange={e => setUrlInput(e.target.value)}
              onKeyDown={handleUrlSubmit}
              onFocus={handleUrlFocus}
              onBlur={handleUrlBlur}
              placeholder="Wpisz adres URL lub wyszukaj..."
              className="h-7 text-xs bg-background/50 border-border/50"
            />
          </div>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="w-8 h-8"
                onClick={() => handleAddToLibraryOpenChange(true)}
                disabled={!activeTab}
              >
                <BookmarkPlus className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Dodaj do biblioteki</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn('w-8 h-8', adblockEnabled && 'text-status-success')}
                onClick={toggleAdblock}
              >
                {adblockEnabled ? (
                  <Shield className="w-4 h-4" />
                ) : (
                  <ShieldOff className="w-4 h-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              {adblockEnabled ? 'Adblock wlaczony' : 'Adblock wylaczony'}
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="w-8 h-8"
                onClick={() => navigate(getDefaultUrl())}
              >
                <Home className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Strona glowna</TooltipContent>
          </Tooltip>
        </div>
      )}

      {/* Browser content area - Electron overlays WebContentsView here */}
      <div ref={contentRef} className="flex-1 bg-background">
        {tabs.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4">
            <Globe className="w-16 h-16 opacity-20" />
            <p className="text-sm">Kliknij + aby otworzyc nowa karte</p>
          </div>
        )}
      </div>

      {/* Add to Library dialog */}
      <AddToLibraryDialog
        open={isAddToLibraryOpen}
        onOpenChange={handleAddToLibraryOpenChange}
        url={activeTab?.url ?? ''}
        title={activeTab?.title ?? ''}
      />
    </div>
  );
}
