import { cn } from '@/lib/utils';
import { ProgressBar } from '@/components/shared/ProgressBar';

interface SplashFooterProps {
  showSpinner: boolean;
  message: string;
  messageKey: number;
  version: string | null;
  error: string | null;
  onRetry: () => void;
  onClose: () => void;
}

export function SplashFooter({
  showSpinner,
  message,
  messageKey,
  version,
  error,
  onRetry,
  onClose,
}: SplashFooterProps) {
  const isError = Boolean(error);

  return (
    <div
      className={cn(
        'absolute inset-x-0 bottom-0 transition-opacity duration-400 ease-in',
        showSpinner ? 'opacity-100' : 'opacity-0'
      )}
      role="status"
      aria-live="polite"
    >
      {!isError && (
        <ProgressBar indeterminate thickness={2} className="rounded-none bg-foreground/5" />
      )}

      <div
        className={cn(
          'flex items-center gap-4 px-6 py-4',
          'border-t border-foreground/5 bg-background/50 backdrop-blur-md',
          isError ? 'justify-center' : 'justify-between'
        )}
      >
        {isError ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-[7px] border border-foreground/10 bg-foreground/5 px-3.5 py-1.5 text-[11.5px] font-semibold text-foreground/85 hover:bg-foreground/10 cursor-pointer"
            >
              Zamknij
            </button>
            <button
              type="button"
              onClick={onRetry}
              className="rounded-[7px] bg-primary px-3.5 py-1.5 text-[11.5px] font-semibold text-primary-foreground hover:bg-primary/90 cursor-pointer"
            >
              Spróbuj ponownie
            </button>
          </div>
        ) : (
          <>
            <div className="flex min-w-0 items-center gap-2.5">
              <span
                aria-hidden="true"
                className="h-[7px] w-[7px] shrink-0 rounded-full bg-primary animate-[splash-dot-blink_1.4s_ease-in-out_infinite]"
                style={{ boxShadow: '0 0 8px oklch(from var(--primary) l c h / 0.7)' }}
              />
              <p
                key={messageKey}
                className="truncate text-sm text-muted-foreground animate-[splash-msg-swap_0.4s_ease-out_both]"
              >
                {message}
              </p>
            </div>
            {version && (
              <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground/60">
                v{version}
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}
