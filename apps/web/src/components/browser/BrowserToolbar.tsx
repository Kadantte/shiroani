import { useRef, useCallback, type KeyboardEvent } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Shield,
  ShieldOff,
  Home,
  Loader2,
  BookmarkPlus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { TooltipButton } from '@/components/ui/tooltip-button';
import { useBrowserStore } from '@/stores/useBrowserStore';

interface BrowserToolbarProps {
  urlInput: string;
  onUrlInputChange: (value: string) => void;
  canGoBack: boolean;
  canGoForward: boolean;
  isLoading: boolean;
  adblockEnabled: boolean;
  hasActiveTab: boolean;
  onGoBack: () => void;
  onGoForward: () => void;
  onReload: () => void;
  onNavigate: (url: string) => void;
  onToggleAdblock: () => void;
  onGoHome: () => void;
  onAddToLibrary: () => void;
}

export function BrowserToolbar({
  urlInput,
  onUrlInputChange,
  canGoBack,
  canGoForward,
  isLoading,
  adblockEnabled,
  hasActiveTab,
  onGoBack,
  onGoForward,
  onReload,
  onNavigate,
  onToggleAdblock,
  onGoHome,
  onAddToLibrary,
}: BrowserToolbarProps) {
  const urlInputRef = useRef<HTMLInputElement>(null);

  const handleUrlSubmit = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && urlInput.trim()) {
        onNavigate(urlInput.trim());
        urlInputRef.current?.blur();
      }
    },
    [urlInput, onNavigate]
  );

  const handleUrlFocus = useCallback(() => {
    useBrowserStore.getState().setAddressBarFocused(true);
    urlInputRef.current?.select();
  }, []);

  const handleUrlBlur = useCallback(() => {
    useBrowserStore.getState().setAddressBarFocused(false);
  }, []);

  return (
    <div className="flex items-center h-10 px-2 gap-1 bg-card/40 border-b border-border shrink-0">
      <TooltipButton
        variant="ghost"
        size="icon"
        className="w-8 h-8"
        onClick={onGoBack}
        disabled={!canGoBack}
        tooltip="Wstecz"
        tooltipSide="bottom"
      >
        <ArrowLeft className="w-4 h-4" />
      </TooltipButton>

      <TooltipButton
        variant="ghost"
        size="icon"
        className="w-8 h-8"
        onClick={onGoForward}
        disabled={!canGoForward}
        tooltip="Do przodu"
        tooltipSide="bottom"
      >
        <ArrowRight className="w-4 h-4" />
      </TooltipButton>

      <TooltipButton
        variant="ghost"
        size="icon"
        className="w-8 h-8"
        onClick={onReload}
        tooltip={isLoading ? 'Ladowanie...' : 'Odswiez'}
        tooltipSide="bottom"
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <RotateCw className="w-4 h-4" />
        )}
      </TooltipButton>

      <div className="flex-1 mx-1">
        <Input
          ref={urlInputRef}
          value={urlInput}
          onChange={e => onUrlInputChange(e.target.value)}
          onKeyDown={handleUrlSubmit}
          onFocus={handleUrlFocus}
          onBlur={handleUrlBlur}
          placeholder="Wpisz adres URL lub wyszukaj..."
          className="h-7 text-xs bg-background/50 border-border/50"
        />
      </div>

      <TooltipButton
        variant="ghost"
        size="icon"
        className="w-8 h-8"
        onClick={onAddToLibrary}
        disabled={!hasActiveTab}
        tooltip="Dodaj do biblioteki"
        tooltipSide="top"
      >
        <BookmarkPlus className="w-4 h-4" />
      </TooltipButton>

      <TooltipButton
        variant="ghost"
        size="icon"
        className={cn('w-8 h-8', adblockEnabled && 'text-status-success')}
        onClick={onToggleAdblock}
        tooltip={adblockEnabled ? 'Adblock wlaczony' : 'Adblock wylaczony'}
        tooltipSide="top"
      >
        {adblockEnabled ? <Shield className="w-4 h-4" /> : <ShieldOff className="w-4 h-4" />}
      </TooltipButton>

      <TooltipButton
        variant="ghost"
        size="icon"
        className="w-8 h-8"
        onClick={onGoHome}
        tooltip="Strona glowna"
        tooltipSide="top"
      >
        <Home className="w-4 h-4" />
      </TooltipButton>
    </div>
  );
}
