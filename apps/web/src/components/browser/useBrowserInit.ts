import { useState, useEffect } from 'react';
import { useBrowserStore } from '@/stores/useBrowserStore';

/**
 * Handles browser tab restoration on mount.
 *
 * Fetches any tabs persisted by the main process from the previous session,
 * populates the store, then wires up IPC listeners. The ordering prevents
 * the onTabUpdated listener from creating duplicates of tabs that getTabs()
 * is about to populate.
 */
export function useBrowserInit() {
  const { openTab, initListeners } = useBrowserStore();
  const tabs = useBrowserStore(s => s.tabs);

  const [initialCheckDone, setInitialCheckDone] = useState(false);

  // Restore tabs from main process, then attach listeners
  useEffect(() => {
    let cleanup: (() => void) | undefined;

    window.electronAPI?.browser
      ?.getTabs()
      .then(existingTabs => {
        if (existingTabs.length > 0) {
          const store = useBrowserStore.getState();
          for (const tab of existingTabs) {
            store.updateTabState(tab.id, tab);
          }
          useBrowserStore.setState({
            tabs: existingTabs,
            activeTabId: existingTabs[existingTabs.length - 1]?.id ?? null,
          });
          return window.electronAPI?.browser?.getActiveTab();
        }
        return null;
      })
      .then(activeId => {
        if (activeId) {
          useBrowserStore.setState({ activeTabId: activeId });
        }
        cleanup = initListeners();
        setInitialCheckDone(true);
      })
      .catch(() => {
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

  return { initialCheckDone };
}
