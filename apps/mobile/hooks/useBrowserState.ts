import { useCallback, useRef, useState } from 'react';
import type WebView from 'react-native-webview';
import type { WebViewNavigation } from 'react-native-webview';

export const NEW_TAB_URL = 'about:blank';

interface BrowserState {
  url: string;
  title: string;
  canGoBack: boolean;
  canGoForward: boolean;
  loading: boolean;
  progress: number;
  isNewTab: boolean;
}

export function useBrowserState() {
  const webViewRef = useRef<WebView>(null);

  const [state, setState] = useState<BrowserState>({
    url: NEW_TAB_URL,
    title: '',
    canGoBack: false,
    canGoForward: false,
    loading: false,
    progress: 0,
    isNewTab: true,
  });

  const handleNavigationStateChange = useCallback((navState: WebViewNavigation) => {
    setState(prev => ({
      ...prev,
      url: navState.url,
      title: navState.title ?? prev.title,
      canGoBack: navState.canGoBack,
      canGoForward: navState.canGoForward,
      loading: navState.loading ?? prev.loading,
      isNewTab: false,
    }));
  }, []);

  const handleLoadProgress = useCallback(
    ({ nativeEvent }: { nativeEvent: { progress: number } }) => {
      setState(prev => ({
        ...prev,
        progress: nativeEvent.progress,
        loading: nativeEvent.progress < 1,
      }));
    },
    []
  );

  const navigateTo = useCallback((rawUrl: string) => {
    const trimmed = rawUrl.trim();
    if (!trimmed) return;

    const url = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    setState(prev => ({ ...prev, url, isNewTab: false }));
  }, []);

  const goBack = useCallback(() => {
    webViewRef.current?.goBack();
  }, []);

  const goForward = useCallback(() => {
    webViewRef.current?.goForward();
  }, []);

  const reload = useCallback(() => {
    webViewRef.current?.reload();
  }, []);

  const stopLoading = useCallback(() => {
    webViewRef.current?.stopLoading();
    setState(prev => ({ ...prev, loading: false, progress: 1 }));
  }, []);

  const goHome = useCallback(() => {
    setState({
      url: NEW_TAB_URL,
      title: '',
      canGoBack: false,
      canGoForward: false,
      loading: false,
      progress: 0,
      isNewTab: true,
    });
  }, []);

  return {
    webViewRef,
    state,
    handleNavigationStateChange,
    handleLoadProgress,
    navigateTo,
    goBack,
    goForward,
    reload,
    stopLoading,
    goHome,
  };
}
