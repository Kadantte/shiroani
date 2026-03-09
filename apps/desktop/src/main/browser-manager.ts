import { BrowserWindow, WebContentsView, session } from 'electron';
import Store from 'electron-store';
import { createLogger } from '@shiroani/shared';
import type { BrowserTab } from '@shiroani/shared';
import { enableBlockingInSession, disableBlockingInSession } from './adblock';

interface PersistedTabState {
  urls: string[];
  activeIndex: number;
}

const logger = createLogger('BrowserManager');

interface ManagedTab {
  id: string;
  view: WebContentsView;
  url: string;
  title: string;
  favicon?: string;
  isLoading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
}

/**
 * Manages multiple WebContentsView tabs in the Electron main process.
 *
 * Each tab is a WebContentsView sharing an isolated `persist:browser` session.
 * Only the active tab's view is added to the window's contentView and visible.
 */
export class BrowserManager {
  private tabs: Map<string, ManagedTab> = new Map();
  private activeTabId: string | null = null;
  private mainWindow: BrowserWindow | null = null;
  private browserSession: Electron.Session | null = null;
  private adblockEnabled = false;
  private store = new Store();
  private isFullScreen = false;

  /**
   * Check if adblocking is currently enabled.
   */
  isAdblockEnabled(): boolean {
    return this.adblockEnabled;
  }

  /**
   * Initialize the browser session. Must be called after app.whenReady().
   */
  init(): void {
    // Create isolated session for browser tabs (separate from app session)
    this.browserSession = session.fromPartition('persist:browser');

    // Set Chrome-like user agent to avoid Electron detection
    this.browserSession.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    logger.info('Browser session initialized');
  }

  private getSession(): Electron.Session {
    if (!this.browserSession) {
      throw new Error('BrowserManager not initialized. Call init() after app.whenReady().');
    }
    return this.browserSession;
  }

  /**
   * Set the main window that tab views will be attached to.
   */
  setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window;
  }

  /**
   * Enable adblocking on the browser session.
   */
  async enableAdblock(): Promise<void> {
    this.adblockEnabled = true;
    enableBlockingInSession(this.getSession());
    logger.info('Adblock enabled for browser session');
  }

  /**
   * Disable adblocking on the browser session.
   */
  async disableAdblock(): Promise<void> {
    this.adblockEnabled = false;
    disableBlockingInSession(this.getSession());
    logger.info('Adblock disabled for browser session');
  }

  /**
   * Create a new browser tab. Returns the tab ID.
   * If no URL is provided, navigates to a blank page.
   */
  createTab(url?: string): string {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) {
      throw new Error('Main window is not available');
    }

    const tabId = crypto.randomUUID();

    const view = new WebContentsView({
      webPreferences: {
        session: this.getSession(),
        sandbox: true,
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    const tab: ManagedTab = {
      id: tabId,
      view,
      url: url || 'about:blank',
      title: 'New Tab',
      isLoading: false,
      canGoBack: false,
      canGoForward: false,
    };

    this.tabs.set(tabId, tab);
    this.attachWebContentsListeners(tabId, view);

    // Always switch to the newly created tab
    this.switchTab(tabId);

    // Navigate to the URL
    if (url) {
      this.navigate(tabId, url);
    }

    logger.debug(`Tab created: ${tabId}`);
    return tabId;
  }

  /**
   * Close and destroy a tab.
   */
  closeTab(tabId: string): void {
    const tab = this.tabs.get(tabId);
    if (!tab) {
      logger.warn(`closeTab: tab ${tabId} not found`);
      return;
    }

    // Remove view from window if it's the active tab
    if (this.activeTabId === tabId && this.mainWindow && !this.mainWindow.isDestroyed()) {
      try {
        this.mainWindow.contentView.removeChildView(tab.view);
      } catch {
        // View may already be removed
      }
    }

    // Destroy the web contents
    if (!tab.view.webContents.isDestroyed()) {
      tab.view.webContents.close();
    }

    this.tabs.delete(tabId);

    // Notify renderer that the tab was closed
    this.sendToRenderer('browser:tab-closed', tabId);

    // If closing the active tab, switch to another tab
    if (this.activeTabId === tabId) {
      this.activeTabId = null;
      const remainingIds = Array.from(this.tabs.keys());
      if (remainingIds.length > 0) {
        this.switchTab(remainingIds[remainingIds.length - 1]);
      }
    }

    logger.debug(`Tab closed: ${tabId}`);
  }

  /**
   * Switch to a different tab. Hides the current active view and shows the new one.
   */
  switchTab(tabId: string): void {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) return;

    const newTab = this.tabs.get(tabId);
    if (!newTab) {
      logger.warn(`switchTab: tab ${tabId} not found`);
      return;
    }

    // Remove current active view from window
    if (this.activeTabId && this.activeTabId !== tabId) {
      const currentTab = this.tabs.get(this.activeTabId);
      if (currentTab) {
        try {
          this.mainWindow.contentView.removeChildView(currentTab.view);
        } catch {
          // View may already be removed
        }
      }
    }

    // Add the new view to the window
    this.mainWindow.contentView.addChildView(newTab.view);
    this.activeTabId = tabId;

    // Send tab update so renderer knows the current state
    this.sendTabUpdate(tabId);

    logger.debug(`Switched to tab: ${tabId}`);
  }

  /**
   * Navigate a tab to a URL. Auto-prepends https:// if no protocol is present.
   * If input looks like a search query, redirects to Google search.
   */
  navigate(tabId: string, url: string): void {
    const tab = this.tabs.get(tabId);
    if (!tab) {
      logger.warn(`navigate: tab ${tabId} not found`);
      return;
    }

    if (tab.view.webContents.isDestroyed()) return;

    const normalizedUrl = this.normalizeUrl(url);
    tab.view.webContents.loadURL(normalizedUrl).catch(err => {
      logger.warn(`Failed to load URL "${normalizedUrl}" in tab ${tabId}:`, err.message);
    });
  }

  /**
   * Navigate back in the tab's history.
   */
  goBack(tabId: string): void {
    const tab = this.tabs.get(tabId);
    if (!tab || tab.view.webContents.isDestroyed()) return;

    if (tab.view.webContents.canGoBack()) {
      tab.view.webContents.navigationHistory.goBack();
    }
  }

  /**
   * Navigate forward in the tab's history.
   */
  goForward(tabId: string): void {
    const tab = this.tabs.get(tabId);
    if (!tab || tab.view.webContents.isDestroyed()) return;

    if (tab.view.webContents.canGoForward()) {
      tab.view.webContents.navigationHistory.goForward();
    }
  }

  /**
   * Reload the tab.
   */
  refresh(tabId: string): void {
    const tab = this.tabs.get(tabId);
    if (!tab || tab.view.webContents.isDestroyed()) return;

    tab.view.webContents.reload();
  }

  /**
   * Get public tab info for a single tab.
   */
  getTabInfo(tabId: string): BrowserTab | null {
    const tab = this.tabs.get(tabId);
    if (!tab) return null;
    return this.toPublicTab(tab);
  }

  /**
   * Get public tab info for all tabs.
   */
  getAllTabs(): BrowserTab[] {
    return Array.from(this.tabs.values()).map(tab => this.toPublicTab(tab));
  }

  /**
   * Get the active tab ID.
   */
  getActiveTabId(): string | null {
    return this.activeTabId;
  }

  /**
   * Execute JavaScript in a tab's web contents and return the result.
   * Used for scraping page metadata (e.g. og:image for cover images).
   */
  async executeScript(tabId: string, script: string): Promise<unknown> {
    const tab = this.tabs.get(tabId);
    if (!tab || tab.view.webContents.isDestroyed()) return null;

    try {
      return await tab.view.webContents.executeJavaScript(script);
    } catch (err) {
      logger.warn(`executeScript failed in tab ${tabId}:`, (err as Error).message);
      return null;
    }
  }

  /**
   * Hide all browser views (remove from window). Called when user switches
   * away from the browser view to another app section (library, schedule, etc.).
   * WebContentsView is a native overlay — CSS/React cannot hide it.
   */
  hideAllViews(): void {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) return;

    for (const tab of this.tabs.values()) {
      try {
        this.mainWindow.contentView.removeChildView(tab.view);
      } catch {
        // View may already be removed
      }
    }
    logger.debug('All browser views hidden');
  }

  /**
   * Show the active tab's view again. Called when user switches back
   * to the browser view.
   */
  showActiveView(): void {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) return;
    if (!this.activeTabId) return;

    const tab = this.tabs.get(this.activeTabId);
    if (!tab) return;

    this.mainWindow.contentView.addChildView(tab.view);
    logger.debug(`Browser view shown: ${this.activeTabId}`);
  }

  /**
   * Resize the active tab's WebContentsView to the given bounds.
   * The renderer sends the exact bounds of the browser content area.
   */
  resizeActiveTab(bounds: { x: number; y: number; width: number; height: number }): void {
    if (!this.activeTabId || this.isFullScreen) return;

    const tab = this.tabs.get(this.activeTabId);
    if (!tab) return;

    // Ensure bounds are valid integers
    const safeBounds = {
      x: Math.round(Math.max(0, bounds.x)),
      y: Math.round(Math.max(0, bounds.y)),
      width: Math.round(Math.max(0, bounds.width)),
      height: Math.round(Math.max(0, bounds.height)),
    };

    tab.view.setBounds(safeBounds);
  }

  /**
   * Save the current tab URLs and active tab index to persistent storage.
   * Called before app quit so tabs can be restored on next launch.
   */
  saveTabState(): void {
    const tabEntries = Array.from(this.tabs.values());
    const urls = tabEntries.map(t => t.url).filter(url => url && url !== 'about:blank');

    if (urls.length === 0) {
      this.store.delete('browser-tabs');
      return;
    }

    const activeIndex = this.activeTabId ? tabEntries.findIndex(t => t.id === this.activeTabId) : 0;

    const state: PersistedTabState = {
      urls,
      activeIndex: Math.max(0, activeIndex),
    };

    this.store.set('browser-tabs', state);
    logger.debug(`Saved ${urls.length} tab(s) to persistent storage`);
  }

  /**
   * Restore tabs from persistent storage. Call after the main window is ready.
   * Returns true if tabs were restored.
   */
  restoreTabs(): boolean {
    const saved = this.store.get('browser-tabs') as PersistedTabState | undefined;
    if (!saved?.urls?.length) return false;

    logger.info(`Restoring ${saved.urls.length} tab(s) from previous session`);

    const createdIds: string[] = [];
    for (const url of saved.urls) {
      createdIds.push(this.createTab(url));
    }

    // Switch to the previously active tab
    const targetIndex = Math.min(saved.activeIndex, createdIds.length - 1);
    if (targetIndex >= 0 && createdIds[targetIndex]) {
      this.switchTab(createdIds[targetIndex]);
    }

    return true;
  }

  /**
   * Destroy all tabs. Call on app quit.
   */
  destroy(): void {
    for (const [tabId, tab] of this.tabs) {
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        try {
          this.mainWindow.contentView.removeChildView(tab.view);
        } catch {
          // Ignore removal errors during shutdown
        }
      }

      if (!tab.view.webContents.isDestroyed()) {
        tab.view.webContents.close();
      }

      logger.debug(`Destroyed tab: ${tabId}`);
    }

    this.tabs.clear();
    this.activeTabId = null;
    this.mainWindow = null;
    logger.info('All browser tabs destroyed');
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Attach webContents event listeners for navigation state tracking.
   */
  private attachWebContentsListeners(tabId: string, view: WebContentsView): void {
    const wc = view.webContents;

    // Navigation completed
    wc.on('did-navigate', (_event, url) => {
      this.updateTabState(tabId, {
        url,
        canGoBack: wc.navigationHistory.canGoBack(),
        canGoForward: wc.navigationHistory.canGoForward(),
      });
    });

    // In-page navigation (hash changes, pushState)
    wc.on('did-navigate-in-page', (_event, url) => {
      this.updateTabState(tabId, {
        url,
        canGoBack: wc.navigationHistory.canGoBack(),
        canGoForward: wc.navigationHistory.canGoForward(),
      });
    });

    // Page title changed
    wc.on('page-title-updated', (_event, title) => {
      this.updateTabState(tabId, { title });
    });

    // Favicon updated
    wc.on('page-favicon-updated', (_event, favicons) => {
      if (favicons.length > 0) {
        this.updateTabState(tabId, { favicon: favicons[0] });
      }
    });

    // Loading started
    wc.on('did-start-loading', () => {
      this.updateTabState(tabId, { isLoading: true });
    });

    // Loading stopped
    wc.on('did-stop-loading', () => {
      this.updateTabState(tabId, {
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
      this.updateTabState(tabId, { isLoading: false });
    });

    // HTML5 fullscreen (e.g. video players)
    wc.on('enter-html-full-screen', () => {
      if (!this.mainWindow || this.mainWindow.isDestroyed()) return;
      this.isFullScreen = true;
      this.mainWindow.setFullScreen(true);
      // Notify renderer to hide chrome (sidebar, tabs, toolbar)
      this.sendToRenderer('browser:fullscreen-change', true);
      // Resize view to cover entire window
      const { width, height } = this.mainWindow.getBounds();
      const tab = this.tabs.get(tabId);
      if (tab) {
        tab.view.setBounds({ x: 0, y: 0, width, height });
      }
      logger.debug(`Tab ${tabId} entered fullscreen`);
    });

    wc.on('leave-html-full-screen', () => {
      if (!this.mainWindow || this.mainWindow.isDestroyed()) return;
      this.isFullScreen = false;
      this.mainWindow.setFullScreen(false);
      // Notify renderer to restore chrome
      this.sendToRenderer('browser:fullscreen-change', false);

      // Temporarily shrink the view so it doesn't cover the UI chrome
      // while waiting for the renderer's ResizeObserver to report correct bounds.
      // Approximate offsets: sidebar ~68px, title bar ~32px, tab bar ~36px, toolbar ~40px
      const tab = this.tabs.get(tabId);
      if (tab) {
        const { width, height } = this.mainWindow.getBounds();
        const sidebarWidth = 68;
        const chromeHeight = 108; // title + tabs + toolbar
        tab.view.setBounds({
          x: sidebarWidth,
          y: chromeHeight,
          width: Math.max(0, width - sidebarWidth),
          height: Math.max(0, height - chromeHeight),
        });
      }

      logger.debug(`Tab ${tabId} left fullscreen`);
    });

    // Intercept new window requests and open as new tabs
    wc.setWindowOpenHandler(({ url }) => {
      if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
        // Create a new tab with this URL
        this.createTab(url);
      }
      return { action: 'deny' };
    });
  }

  /**
   * Update internal tab state and send update to renderer.
   */
  private updateTabState(
    tabId: string,
    update: Partial<
      Pick<ManagedTab, 'url' | 'title' | 'favicon' | 'isLoading' | 'canGoBack' | 'canGoForward'>
    >
  ): void {
    const tab = this.tabs.get(tabId);
    if (!tab) return;

    if (update.url !== undefined) tab.url = update.url;
    if (update.title !== undefined) tab.title = update.title;
    if (update.favicon !== undefined) tab.favicon = update.favicon;
    if (update.isLoading !== undefined) tab.isLoading = update.isLoading;
    if (update.canGoBack !== undefined) tab.canGoBack = update.canGoBack;
    if (update.canGoForward !== undefined) tab.canGoForward = update.canGoForward;

    this.sendTabUpdate(tabId);
  }

  /**
   * Send a tab update to the renderer process.
   */
  private sendTabUpdate(tabId: string): void {
    const tab = this.tabs.get(tabId);
    if (!tab) return;

    this.sendToRenderer('browser:tab-updated', this.toPublicTab(tab));
  }

  /**
   * Send an IPC message to the renderer process.
   */
  private sendToRenderer(channel: string, ...args: unknown[]): void {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) return;

    try {
      this.mainWindow.webContents.send(channel, ...args);
    } catch {
      // Window may be closing
    }
  }

  /**
   * Convert internal tab to the public BrowserTab type.
   */
  private toPublicTab(tab: ManagedTab): BrowserTab {
    return {
      id: tab.id,
      url: tab.url,
      title: tab.title,
      favicon: tab.favicon,
      isLoading: tab.isLoading,
      canGoBack: tab.canGoBack,
      canGoForward: tab.canGoForward,
    };
  }

  /**
   * Normalize a URL input:
   * - If it already has a protocol, use it as-is
   * - If it looks like a domain (contains a dot), prepend https://
   * - Otherwise treat as a search query
   */
  private normalizeUrl(input: string): string {
    const trimmed = input.trim();

    // Already has a protocol
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed)) {
      return trimmed;
    }

    // Looks like a domain (contains a dot and no spaces)
    if (trimmed.includes('.') && !trimmed.includes(' ')) {
      return `https://${trimmed}`;
    }

    // Treat as a search query
    return `https://www.google.com/search?q=${encodeURIComponent(trimmed)}`;
  }
}
