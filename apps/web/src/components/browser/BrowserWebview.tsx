import { memo, useRef } from 'react';
import type { WebviewElement } from '@/components/browser/webviewRefs';
import { useWebviewEvents } from '@/hooks/useWebviewEvents';

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

  useWebviewEvents(webviewRef, tabId);

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
