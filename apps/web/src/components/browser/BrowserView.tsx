import { useState, useEffect, useCallback, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Globe } from 'lucide-react';
import { isNewTabUrl, NEW_TAB_URL } from '@shiroani/shared';
import { useBrowserStore } from '@/stores/useBrowserStore';
import { AddToLibraryDialog } from '@/components/browser/AddToLibraryDialog';
import { BrowserTabBar } from '@/components/browser/BrowserTabBar';
import { BrowserToolbar } from '@/components/browser/BrowserToolbar';
import { BrowserWebview } from '@/components/browser/BrowserWebview';
import { NewTabPage } from '@/components/browser/NewTabPage';
import { useBrowserInit } from '@/components/browser/useBrowserInit';
import { unregisterWebview } from '@/components/browser/webviewRefs';

// Actions are stable references — extract once outside render cycle
const { openTab, closeTab, switchTab, reorderTabs, navigate, goBack, goForward, reload } =
  useBrowserStore.getState();

/**
 * BrowserView: The main embedded browser interface.
 * Renders <webview> elements for each tab, controlled via CSS visibility.
 */
export function BrowserView() {
  // Granular selectors: only re-render when these specific slices change
  const tabs = useBrowserStore(useShallow(s => s.tabs));
  const activeTabId = useBrowserStore(s => s.activeTabId);
  const isFullScreen = useBrowserStore(s => s.isFullScreen);

  const [urlInput, setUrlInput] = useState('');
  const [isAddToLibraryOpen, setIsAddToLibraryOpen] = useState(false);

  const activeTab = tabs.find(t => t.id === activeTabId);

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

  // Sync URL input with active tab URL (show empty for new tab page)
  useEffect(() => {
    if (activeTab && !useBrowserStore.getState().isAddressBarFocused) {
      setUrlInput(isNewTabUrl(activeTab.url) ? '' : activeTab.url);
    }
  }, [activeTab?.url, activeTab?.id]);

  const isActiveTabNewTab = activeTab ? isNewTabUrl(activeTab.url) : false;

  // When navigating from the new tab page, update tab state to swap in a webview
  const handleNewTabNavigate = useCallback(
    (url: string) => {
      if (!activeTab) return;
      const { updateTabState } = useBrowserStore.getState();
      updateTabState(activeTab.id, { url, isLoading: true });
    },
    [activeTab]
  );

  // Home button: go back to new tab page
  const handleGoHome = useCallback(() => {
    if (!activeTab) return;
    const { updateTabState } = useBrowserStore.getState();
    unregisterWebview(activeTab.id);
    updateTabState(activeTab.id, {
      url: NEW_TAB_URL,
      title: 'Nowa karta',
      isLoading: false,
      canGoBack: false,
      canGoForward: false,
    });
  }, [activeTab]);

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
          hasActiveTab={!!activeTab}
          onGoBack={goBack}
          onGoForward={goForward}
          onReload={reload}
          onNavigate={navigate}
          onGoHome={handleGoHome}
          onAddToLibrary={() => setIsAddToLibraryOpen(true)}
          urlInputRef={urlInputRef}
        />
      )}

      {/* Webview container — renders all tabs, CSS controls visibility */}
      <div
        className={`flex-1 relative overflow-hidden ${isActiveTabNewTab ? '' : 'bg-background'}`}
      >
        {tabs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4">
            <Globe className="w-16 h-16 opacity-20" />
            <p className="text-sm">Kliknij +, żeby otworzyć nową kartę</p>
          </div>
        ) : (
          <>
            {/* New tab page overlay — shown when active tab is a new tab */}
            {isActiveTabNewTab && (
              <div className="absolute inset-0 z-10">
                <NewTabPage onNavigate={handleNewTabNavigate} />
              </div>
            )}
            {/* Webviews — skip rendering for tabs with new tab URL */}
            {tabs.map(tab =>
              isNewTabUrl(tab.url) ? null : (
                <BrowserWebview
                  key={tab.id}
                  tabId={tab.id}
                  initialUrl={tab.url}
                  isActive={tab.id === activeTabId}
                />
              )
            )}
          </>
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
