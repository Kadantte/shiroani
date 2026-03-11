import { memo, useRef, useEffect } from 'react';
import { useBrowserStore } from '@/stores/useBrowserStore';
import { useQuickAccessStore } from '@/stores/useQuickAccessStore';
import {
  registerWebview,
  unregisterWebview,
  type WebviewElement,
} from '@/components/browser/webviewRefs';
import { updateAnimePresence } from '@/lib/anime-detection';

// Script injected on dom-ready to patch iframe allow attributes for video player compatibility.
const IFRAME_PATCH_SCRIPT = `
(function() {
  const ALLOW_ATTR = 'autoplay; fullscreen; encrypted-media; picture-in-picture';
  function patchIframe(iframe) {
    if (!iframe.hasAttribute('allow') || !iframe.getAttribute('allow').includes('autoplay')) {
      iframe.setAttribute('allow', ALLOW_ATTR);
    }
  }
  document.querySelectorAll('iframe').forEach(patchIframe);
  new MutationObserver(function(mutations) {
    for (var m of mutations) {
      for (var node of m.addedNodes) {
        if (node.nodeName === 'IFRAME') patchIframe(node);
        else if (node.querySelectorAll) {
          node.querySelectorAll('iframe').forEach(patchIframe);
        }
      }
    }
  }).observe(document.documentElement, { childList: true, subtree: true });
})();
`;

interface BrowserWebviewProps {
  tabId: string;
  initialUrl: string;
  isActive: boolean;
}

const BrowserWebviewInner = function BrowserWebview({
  tabId,
  initialUrl,
  isActive,
}: BrowserWebviewProps) {
  const webviewRef = useRef<WebviewElement | null>(null);

  useEffect(() => {
    const el = webviewRef.current;
    if (!el) return;

    // ── Event handlers ──────────────────────────────────────────
    const { updateTabState } = useBrowserStore.getState();

    const onDomReady = () => {
      registerWebview(tabId, el);
      el.executeJavaScript(IFRAME_PATCH_SCRIPT).catch(() => {});
    };

    const onDidNavigate = (e: Event) => {
      const detail = e as Event & { url: string };
      updateTabState(tabId, {
        url: detail.url,
        canGoBack: el.canGoBack(),
        canGoForward: el.canGoForward(),
      });
      updateAnimePresence(tabId);
    };

    const onDidNavigateInPage = (e: Event) => {
      const detail = e as Event & { url: string; isMainFrame: boolean };
      if (detail.isMainFrame === false) return;
      updateTabState(tabId, {
        url: detail.url,
        canGoBack: el.canGoBack(),
        canGoForward: el.canGoForward(),
      });
      updateAnimePresence(tabId);
    };

    const onPageTitleUpdated = (e: Event) => {
      const detail = e as Event & { title: string };
      updateTabState(tabId, { title: detail.title });
      updateAnimePresence(tabId);
    };

    const onPageFaviconUpdated = (e: Event) => {
      const detail = e as Event & { favicons: string[] };
      if (detail.favicons?.length > 0) {
        updateTabState(tabId, { favicon: detail.favicons[0] });
      }
    };

    const onDidStartLoading = () => {
      updateTabState(tabId, { isLoading: true });
    };

    const onDidStopLoading = () => {
      updateTabState(tabId, {
        isLoading: false,
        canGoBack: el.canGoBack(),
        canGoForward: el.canGoForward(),
      });

      // Track visit for frequent sites
      try {
        const currentUrl = el.getURL();
        const currentTitle = el.getTitle();
        const tab = useBrowserStore.getState().tabs.find(t => t.id === tabId);
        useQuickAccessStore.getState().recordVisit(currentUrl, currentTitle, tab?.favicon);
      } catch {
        // Non-critical — skip tracking
      }
    };

    const onDidFailLoad = (e: Event) => {
      const detail = e as Event & { errorCode: number };
      if (detail.errorCode === -3) return; // Aborted (harmless redirect)
      updateTabState(tabId, { isLoading: false });
    };

    const onEnterFullscreen = () => {
      useBrowserStore.setState({ isFullScreen: true });
      window.electronAPI?.browser?.setFullscreen?.(true);
    };

    const onLeaveFullscreen = () => {
      useBrowserStore.setState({ isFullScreen: false });
      window.electronAPI?.browser?.setFullscreen?.(false);
    };

    // ── Attach listeners ────────────────────────────────────────
    el.addEventListener('dom-ready', onDomReady);
    el.addEventListener('did-navigate', onDidNavigate);
    el.addEventListener('did-navigate-in-page', onDidNavigateInPage);
    el.addEventListener('page-title-updated', onPageTitleUpdated);
    el.addEventListener('page-favicon-updated', onPageFaviconUpdated);
    el.addEventListener('did-start-loading', onDidStartLoading);
    el.addEventListener('did-stop-loading', onDidStopLoading);
    el.addEventListener('did-fail-load', onDidFailLoad);
    el.addEventListener('enter-html-full-screen', onEnterFullscreen);
    el.addEventListener('leave-html-full-screen', onLeaveFullscreen);

    // ── Cleanup ─────────────────────────────────────────────────
    return () => {
      unregisterWebview(tabId);
      el.removeEventListener('dom-ready', onDomReady);
      el.removeEventListener('did-navigate', onDidNavigate);
      el.removeEventListener('did-navigate-in-page', onDidNavigateInPage);
      el.removeEventListener('page-title-updated', onPageTitleUpdated);
      el.removeEventListener('page-favicon-updated', onPageFaviconUpdated);
      el.removeEventListener('did-start-loading', onDidStartLoading);
      el.removeEventListener('did-stop-loading', onDidStopLoading);
      el.removeEventListener('did-fail-load', onDidFailLoad);
      el.removeEventListener('enter-html-full-screen', onEnterFullscreen);
      el.removeEventListener('leave-html-full-screen', onLeaveFullscreen);
    };
  }, [tabId]);

  return (
    <webview
      ref={webviewRef as any}
      src={initialUrl}
      partition="persist:browser"
      allowpopups=""
      style={{
        display: isActive ? 'inline-flex' : 'none',
        width: '100%',
        height: '100%',
        border: 'none',
      }}
    />
  );
};

export const BrowserWebview = memo(BrowserWebviewInner);
