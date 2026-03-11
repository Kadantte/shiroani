import { useState, useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Globe } from 'lucide-react';
import { useBrowserStore } from '@/stores/useBrowserStore';
import { AddToLibraryDialog } from '@/components/browser/AddToLibraryDialog';
import { BrowserTabBar } from '@/components/browser/BrowserTabBar';
import { BrowserToolbar } from '@/components/browser/BrowserToolbar';
import { BrowserWebview } from '@/components/browser/BrowserWebview';
import { useBrowserInit } from '@/components/browser/useBrowserInit';

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
  toggleAdblock,
  getDefaultUrl,
} = useBrowserStore.getState();

/**
 * BrowserView: The main embedded browser interface.
 * Renders <webview> elements for each tab, controlled via CSS visibility.
 */
export function BrowserView() {
  // Granular selectors: only re-render when these specific slices change
  const tabs = useBrowserStore(useShallow(s => s.tabs));
  const activeTabId = useBrowserStore(s => s.activeTabId);
  const adblockEnabled = useBrowserStore(s => s.adblockEnabled);
  const isFullScreen = useBrowserStore(s => s.isFullScreen);

  const [urlInput, setUrlInput] = useState('');
  const [isAddToLibraryOpen, setIsAddToLibraryOpen] = useState(false);

  const activeTab = tabs.find(t => t.id === activeTabId);

  // Tab restoration on mount
  useBrowserInit();

  // Sync URL input with active tab URL
  useEffect(() => {
    if (activeTab && !useBrowserStore.getState().isAddressBarFocused) {
      setUrlInput(activeTab.url);
    }
  }, [activeTab?.url, activeTab]);

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
          onAddToLibrary={() => setIsAddToLibraryOpen(true)}
        />
      )}

      {/* Webview container — renders all tabs, CSS controls visibility */}
      <div className="flex-1 relative overflow-hidden bg-background">
        {tabs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4">
            <Globe className="w-16 h-16 opacity-20" />
            <p className="text-sm">Kliknij + aby otworzyc nowa karte</p>
          </div>
        ) : (
          tabs.map(tab => (
            <BrowserWebview
              key={tab.id}
              tabId={tab.id}
              initialUrl={tab.url}
              isActive={tab.id === activeTabId}
            />
          ))
        )}
      </div>

      {/* Add to Library dialog */}
      <AddToLibraryDialog
        open={isAddToLibraryOpen}
        onOpenChange={setIsAddToLibraryOpen}
        url={activeTab?.url ?? ''}
        title={activeTab?.title ?? ''}
      />
    </div>
  );
}
