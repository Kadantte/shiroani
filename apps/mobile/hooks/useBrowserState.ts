import { useCallback, useRef, useState } from 'react';
import type WebView from 'react-native-webview';
import type { WebViewNavigation } from 'react-native-webview';

const DEFAULT_URL = 'https://ogladajanime.pl';

interface BrowserState {
  url: string;
  title: string;
  canGoBack: boolean;
  canGoForward: boolean;
  loading: boolean;
  progress: number;
}

export function useBrowserState() {
  const webViewRef = useRef<WebView>(null);

  const [state, setState] = useState<BrowserState>({
    url: DEFAULT_URL,
    title: '',
    canGoBack: false,
    canGoForward: false,
    loading: false,
    progress: 0,
  });

  const handleNavigationStateChange = useCallback((navState: WebViewNavigation) => {
    setState(prev => ({
      ...prev,
      url: navState.url,
      title: navState.title ?? prev.title,
      canGoBack: navState.canGoBack,
      canGoForward: navState.canGoForward,
      loading: navState.loading ?? prev.loading,
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

    // Add protocol if missing
    const url = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    setState(prev => ({ ...prev, url }));
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
  };
}
