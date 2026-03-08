import { Injectable } from '@nestjs/common';
import { createLogger } from '@shiroani/shared';

const logger = createLogger('BrowserService');

/**
 * BrowserService manages WebContentsView tabs for in-app browsing.
 *
 * TODO: Implement the following:
 *
 * Tab management:
 * - createTab(url: string): Create a new WebContentsView, load URL, return tab info
 * - closeTab(tabId: string): Destroy WebContentsView and clean up
 * - getTab(tabId: string): Get tab info (url, title, loading state, can go back/forward)
 * - getAllTabs(): List all active tabs
 *
 * Navigation:
 * - navigate(tabId: string, url: string): Navigate tab to URL
 * - goBack(tabId: string): Navigate back
 * - goForward(tabId: string): Navigate forward
 * - refresh(tabId: string): Reload current page
 *
 * Adblock integration:
 * - setAdblockEnabled(enabled: boolean): Toggle adblock for all tab sessions
 * - isAdblockEnabled(): Check current adblock state
 *
 * Tab bounds management:
 * - setTabBounds(tabId: string, bounds: Rectangle): Position/size a tab view
 * - showTab(tabId: string): Make a tab visible (bring to front)
 * - hideTab(tabId: string): Hide a tab (send to back)
 *
 * NOTE: The actual WebContentsView creation/management happens in the main process.
 * This service coordinates state and emits events that the gateway broadcasts
 * to connected clients. The IPC handlers in ipc/browser.ts do the actual
 * Electron API calls.
 */
@Injectable()
export class BrowserService {
  constructor() {
    logger.info('BrowserService initialized');
  }

  // TODO: Implement tab state tracking (synced with IPC handler state)

  // TODO: Implement event emission for tab state changes
}
