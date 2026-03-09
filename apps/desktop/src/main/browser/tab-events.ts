import type { WebContentsView, BrowserWindow } from 'electron';
import { createLogger } from '@shiroani/shared';

const logger = createLogger('TabEvents');

/** Width of the app sidebar in pixels */
const SIDEBAR_WIDTH = 68;

/** Combined height of title bar + tab bar + toolbar in pixels */
const CHROME_HEIGHT = 108;

interface TabStateUpdate {
  url?: string;
  title?: string;
  favicon?: string;
  isLoading?: boolean;
  canGoBack?: boolean;
  canGoForward?: boolean;
}

interface TabEventCallbacks {
  /** Called when tab state changes (URL, title, favicon, loading, etc.) */
  onTabStateUpdate: (tabId: string, update: TabStateUpdate) => void;
  /** Called when user requests a new tab via window.open */
  onNewTabRequested: (url: string) => void;
  /** Get the main window reference */
  getMainWindow: () => BrowserWindow | null;
  /** Get the view for a tab by ID */
  getTabView: (tabId: string) => WebContentsView | undefined;
  /** Set the fullscreen flag */
  setFullScreen: (value: boolean) => void;
  /** Send an IPC message to the renderer */
  sendToRenderer: (channel: string, ...args: unknown[]) => void;
}

/**
 * Attach webContents event listeners for navigation state tracking.
 * Extracted from BrowserManager to keep tab event wiring separate.
 */
export function attachWebContentsListeners(
  tabId: string,
  view: WebContentsView,
  callbacks: TabEventCallbacks
): void {
  const wc = view.webContents;

  // Navigation completed
  wc.on('did-navigate', (_event, url) => {
    callbacks.onTabStateUpdate(tabId, {
      url,
      canGoBack: wc.navigationHistory.canGoBack(),
      canGoForward: wc.navigationHistory.canGoForward(),
    });
  });

  // In-page navigation (hash changes, pushState)
  wc.on('did-navigate-in-page', (_event, url) => {
    callbacks.onTabStateUpdate(tabId, {
      url,
      canGoBack: wc.navigationHistory.canGoBack(),
      canGoForward: wc.navigationHistory.canGoForward(),
    });
  });

  // Page title changed
  wc.on('page-title-updated', (_event, title) => {
    callbacks.onTabStateUpdate(tabId, { title });
  });

  // Favicon updated
  wc.on('page-favicon-updated', (_event, favicons) => {
    if (favicons.length > 0) {
      callbacks.onTabStateUpdate(tabId, { favicon: favicons[0] });
    }
  });

  // Loading started
  wc.on('did-start-loading', () => {
    callbacks.onTabStateUpdate(tabId, { isLoading: true });
  });

  // Loading stopped
  wc.on('did-stop-loading', () => {
    callbacks.onTabStateUpdate(tabId, {
      isLoading: false,
      canGoBack: wc.navigationHistory.canGoBack(),
      canGoForward: wc.navigationHistory.canGoForward(),
    });
  });

  // Load failed
  wc.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    // Ignore aborted loads (e.g. navigating away before page finishes)
    if (errorCode === -3) return;
    logger.warn(
      `Tab ${tabId} failed to load "${validatedURL}": ${errorDescription} (code: ${errorCode})`
    );
    callbacks.onTabStateUpdate(tabId, { isLoading: false });
  });

  // HTML5 fullscreen (e.g. video players)
  wc.on('enter-html-full-screen', () => {
    const mainWindow = callbacks.getMainWindow();
    if (!mainWindow || mainWindow.isDestroyed()) return;
    callbacks.setFullScreen(true);
    mainWindow.setFullScreen(true);
    // Notify renderer to hide chrome (sidebar, tabs, toolbar)
    callbacks.sendToRenderer('browser:fullscreen-change', true);
    // Resize view to cover entire window
    const { width, height } = mainWindow.getBounds();
    const tabView = callbacks.getTabView(tabId);
    if (tabView) {
      tabView.setBounds({ x: 0, y: 0, width, height });
    }
    logger.debug(`Tab ${tabId} entered fullscreen`);
  });

  wc.on('leave-html-full-screen', () => {
    const mainWindow = callbacks.getMainWindow();
    if (!mainWindow || mainWindow.isDestroyed()) return;
    callbacks.setFullScreen(false);
    mainWindow.setFullScreen(false);
    // Notify renderer to restore chrome
    callbacks.sendToRenderer('browser:fullscreen-change', false);

    // Temporarily shrink the view to approximate UI chrome dimensions
    // while waiting for the renderer's ResizeObserver to report correct bounds.
    const tabView = callbacks.getTabView(tabId);
    if (tabView) {
      const { width, height } = mainWindow.getBounds();
      tabView.setBounds({
        x: SIDEBAR_WIDTH,
        y: CHROME_HEIGHT,
        width: Math.max(0, width - SIDEBAR_WIDTH),
        height: Math.max(0, height - CHROME_HEIGHT),
      });
    }

    logger.debug(`Tab ${tabId} left fullscreen`);
  });

  // Intercept new window requests and open as new tabs
  wc.setWindowOpenHandler(({ url }) => {
    if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
      callbacks.onNewTabRequested(url);
    }
    return { action: 'deny' };
  });
}
