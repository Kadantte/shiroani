import { useCallback, useRef, type KeyboardEvent, type RefObject } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Shield,
  ShieldOff,
  Home,
  Loader2,
  BookmarkPlus,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { TooltipButton } from '@/components/ui/tooltip-button';
import { useBrowserStore, type PopupBlockMode } from '@/stores/useBrowserStore';

interface BrowserToolbarProps {
  urlInput: string;
  onUrlInputChange: (value: string) => void;
  canGoBack: boolean;
  canGoForward: boolean;
  isLoading: boolean;
  adblockEnabled: boolean;
  popupBlockMode: PopupBlockMode;
  hasActiveTab: boolean;
  onGoBack: () => void;
  onGoForward: () => void;
  onReload: () => void;
  onNavigate: (url: string) => void;
  onToggleAdblock: () => void;
  onCyclePopupBlockMode: () => void;
  onGoHome: () => void;
  onAddToLibrary: () => void;
  urlInputRef?: RefObject<HTMLInputElement | null>;
}

const POPUP_MODE_LABELS: Record<PopupBlockMode, string> = {
  smart: 'Blokowanie popup\u00F3w: Inteligentne',
  strict: 'Blokowanie popup\u00F3w: Ścisłe',
  off: 'Blokowanie popup\u00F3w: Wyłączone',
};

export function BrowserToolbar({
  urlInput,
  onUrlInputChange,
  canGoBack,
  canGoForward,
  isLoading,
  adblockEnabled,
  popupBlockMode,
  hasActiveTab,
  onGoBack,
  onGoForward,
  onReload,
  onNavigate,
  onToggleAdblock,
  onCyclePopupBlockMode,
  onGoHome,
  onAddToLibrary,
  urlInputRef: externalUrlInputRef,
}: BrowserToolbarProps) {
  const internalUrlInputRef = useRef<HTMLInputElement>(null);
  const urlInputRef = externalUrlInputRef ?? internalUrlInputRef;

  const handleUrlSubmit = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && urlInput.trim()) {
        onNavigate(urlInput.trim());
        urlInputRef?.current?.blur();
      }
    },
    [urlInput, onNavigate]
  );

  const handleUrlFocus = useCallback(() => {
    useBrowserStore.getState().setAddressBarFocused(true);
    urlInputRef?.current?.select();
  }, [urlInputRef]);

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
        tooltip={isLoading ? 'Ładowanie...' : 'Odśwież'}
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
          ref={urlInputRef as RefObject<HTMLInputElement>}
          value={urlInput}
          onChange={e => onUrlInputChange(e.target.value)}
          onKeyDown={handleUrlSubmit}
          onFocus={handleUrlFocus}
          onBlur={handleUrlBlur}
          placeholder="Wpisz adres URL lub wyszukaj..."
          aria-label="Pasek adresu"
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
        tooltipSide="bottom"
      >
        <BookmarkPlus className="w-4 h-4" />
      </TooltipButton>

      <TooltipButton
        variant="ghost"
        size="icon"
        className={cn('w-8 h-8', adblockEnabled && 'text-status-success')}
        onClick={onToggleAdblock}
        tooltip={adblockEnabled ? 'Adblock włączony' : 'Adblock wyłączony'}
        tooltipSide="bottom"
      >
        {adblockEnabled ? <Shield className="w-4 h-4" /> : <ShieldOff className="w-4 h-4" />}
      </TooltipButton>

      <TooltipButton
        variant="ghost"
        size="icon"
        className={cn(
          'w-8 h-8',
          popupBlockMode === 'strict' && 'text-orange-400',
          popupBlockMode === 'smart' && 'text-status-success',
          popupBlockMode === 'off' && 'text-muted-foreground'
        )}
        onClick={onCyclePopupBlockMode}
        tooltip={POPUP_MODE_LABELS[popupBlockMode]}
        tooltipSide="bottom"
      >
        {popupBlockMode === 'strict' ? (
          <ShieldAlert className="w-4 h-4" />
        ) : popupBlockMode === 'smart' ? (
          <ShieldCheck className="w-4 h-4" />
        ) : (
          <ShieldX className="w-4 h-4" />
        )}
      </TooltipButton>

      <TooltipButton
        variant="ghost"
        size="icon"
        className="w-8 h-8"
        onClick={onGoHome}
        tooltip="Strona główna"
        tooltipSide="bottom"
      >
        <Home className="w-4 h-4" />
      </TooltipButton>
    </div>
  );
}
