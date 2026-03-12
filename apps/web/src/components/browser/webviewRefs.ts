/**
 * Shared registry of webview element references by tab ID.
 *
 * Consumers:
 * - BrowserWebview: registers/unregisters on mount/unmount
 * - useBrowserStore actions: calls loadURL(), goBack(), goForward(), reload()
 * - AddToLibraryDialog: calls executeJavaScript() for metadata scraping
 */

// Electron's webview element type — extends HTMLElement with navigation methods
export type WebviewElement = HTMLElement & {
  loadURL: (url: string) => Promise<void>;
  getURL: () => string;
  getTitle: () => string;
  goBack: () => void;
  goForward: () => void;
  reload: () => void;
  stop: () => void;
  canGoBack: () => boolean;
  canGoForward: () => boolean;
  executeJavaScript: (code: string) => Promise<unknown>;
  setAudioMuted: (muted: boolean) => void;
  isAudioMuted: () => boolean;
  openDevTools: () => void;
};

const webviewRefs = new Map<string, WebviewElement>();

export function registerWebview(tabId: string, el: WebviewElement): void {
  webviewRefs.set(tabId, el);
}

export function unregisterWebview(tabId: string): void {
  webviewRefs.delete(tabId);
}

export function getWebview(tabId: string): WebviewElement | undefined {
  return webviewRefs.get(tabId);
}
