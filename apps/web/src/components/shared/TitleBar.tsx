import { useState, useEffect, useCallback } from 'react';
import { Minus, Square, Copy, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { IS_ELECTRON, IS_MAC } from '@/lib/platform';

/**
 * Custom title bar for the frameless Electron window.
 * Provides drag-to-move and window control buttons (minimize, maximize/restore, close).
 */
export function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    if (!IS_ELECTRON) return;

    // Fetch initial state
    window.electronAPI?.window.isMaximized().then(setIsMaximized);

    // Listen for changes
    const cleanup = window.electronAPI?.window.onMaximizedChange(setIsMaximized);
    return cleanup;
  }, []);

  const handleMinimize = useCallback(() => {
    window.electronAPI?.window.minimize();
  }, []);

  const handleMaximize = useCallback(() => {
    window.electronAPI?.window.maximize();
  }, []);

  const handleClose = useCallback(() => {
    window.electronAPI?.window.close();
  }, []);

  // On macOS, the native traffic lights handle window controls
  if (IS_MAC) {
    return (
      <div className="drag h-8 flex items-center px-3 bg-sidebar border-b border-border shrink-0">
        <div className="flex-1" />
        <span className="text-xs font-medium text-muted-foreground select-none">ShiroAni</span>
        <div className="flex-1" />
      </div>
    );
  }

  return (
    <div className="drag h-8 flex items-center bg-sidebar border-b border-border shrink-0 select-none">
      <div className="no-drag flex items-center px-3 gap-1.5">
        <div className="w-3 h-3 rounded-full bg-primary" />
        <span className="text-xs font-semibold text-foreground">ShiroAni</span>
      </div>

      <div className="flex-1" />

      <div className="no-drag flex items-stretch h-full">
        <button
          onClick={handleMinimize}
          className={cn(
            'w-11 flex items-center justify-center',
            'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
            'transition-colors duration-150'
          )}
          aria-label="Minimalizuj"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleMaximize}
          className={cn(
            'w-11 flex items-center justify-center',
            'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
            'transition-colors duration-150'
          )}
          aria-label={isMaximized ? 'Przywroc' : 'Maksymalizuj'}
        >
          {isMaximized ? <Copy className="w-3 h-3" /> : <Square className="w-3 h-3" />}
        </button>
        <button
          onClick={handleClose}
          className={cn(
            'w-11 flex items-center justify-center',
            'text-muted-foreground hover:bg-destructive hover:text-destructive-foreground',
            'transition-colors duration-150'
          )}
          aria-label="Zamknij"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
