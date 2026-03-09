import { useState, useRef, useEffect, useCallback } from 'react';
import { Globe } from 'lucide-react';
import { useBrowserStore } from '@/stores/useBrowserStore';
import { AddToLibraryDialog } from '@/components/browser/AddToLibraryDialog';
import { BrowserTabBar } from '@/components/browser/BrowserTabBar';
import { BrowserToolbar } from '@/components/browser/BrowserToolbar';
import { useBrowserInit } from '@/components/browser/useBrowserInit';

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
    reorderTabs,
    navigate,
    goBack,
    goForward,
    reload,
    toggleAdblock,
  } = useBrowserStore();

  const [urlInput, setUrlInput] = useState('');
  const [isAddToLibraryOpen, setIsAddToLibraryOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const activeTab = tabs.find(t => t.id === activeTabId);

  // Tab restoration on mount
  useBrowserInit();

  // Sync URL input with active tab URL
  useEffect(() => {
    if (activeTab && !useBrowserStore.getState().isAddressBarFocused) {
      setUrlInput(activeTab.url);
    }
  }, [activeTab?.url, activeTab]);

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
    reportBounds();

    return () => observer.disconnect();
  }, [activeTabId]);

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
          canGoBack={activeTab?.canGoBack ?? false}
          canGoForward={activeTab?.canGoForward ?? false}
          isLoading={activeTab?.isLoading ?? false}
          adblockEnabled={adblockEnabled}
          hasActiveTab={!!activeTab}
          onGoBack={goBack}
          onGoForward={goForward}
          onReload={reload}
          onNavigate={navigate}
          onToggleAdblock={toggleAdblock}
          onGoHome={() => navigate(getDefaultUrl())}
          onAddToLibrary={() => handleAddToLibraryOpenChange(true)}
        />
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
