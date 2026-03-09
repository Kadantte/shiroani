import { useState, useEffect, useRef } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { IS_ELECTRON } from '@/lib/platform';
import { APP_LOGO_URL } from '@/lib/constants';

/** Minimum time the splash screen stays visible (ms) */
const MIN_DISPLAY_MS = 2200;
/** Duration of the fade-out exit animation (ms) */
const EXIT_ANIMATION_MS = 600;
/** Delay before showing the spinner (ms) */
const SPINNER_DELAY_MS = 600;

interface SplashScreenProps {
  ready: boolean;
  error: string | null;
  onDismissed?: () => void;
}

export function SplashScreen({ ready, error, onDismissed }: SplashScreenProps) {
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [showSpinner, setShowSpinner] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const hasDismissedRef = useRef(false);

  const shouldDismiss = ready && minTimeElapsed;

  // Minimum display timer
  useEffect(() => {
    const timer = setTimeout(() => setMinTimeElapsed(true), MIN_DISPLAY_MS);
    return () => clearTimeout(timer);
  }, []);

  // Spinner delay
  useEffect(() => {
    const timer = setTimeout(() => setShowSpinner(true), SPINNER_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  // Dismiss sequence: start fade-out, then remove from DOM and notify parent
  useEffect(() => {
    if (!shouldDismiss || hasDismissedRef.current) return;
    hasDismissedRef.current = true;
    setIsDismissing(true);

    const timer = setTimeout(() => {
      setIsVisible(false);
      onDismissed?.();
    }, EXIT_ANIMATION_MS);
    return () => clearTimeout(timer);
  }, [shouldDismiss, onDismissed]);

  if (!isVisible) return null;

  return (
    <div
      className={cn(
        'fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background',
        'transition-all duration-600 ease-out',
        isDismissing && 'opacity-0 scale-[1.02]',
        IS_ELECTRON && 'rounded-t-[10px]'
      )}
    >
      {/* Draggable region so the window can still be moved during splash */}
      {IS_ELECTRON && <div className="absolute inset-x-0 top-0 h-8 drag" />}

      <div className="flex flex-col items-center justify-center gap-3">
        {/* Chibi character with floating animation */}
        <div className="relative">
          {/* Soft glow behind character */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-32 h-32 rounded-full bg-primary/10 blur-3xl animate-pulse-subtle" />
          </div>

          <img
            src={APP_LOGO_URL}
            alt="ShiroAni mascot"
            className="relative w-40 h-40 object-contain drop-shadow-lg animate-[splash-float_3s_ease-in-out_infinite]"
            draggable={false}
          />
        </div>

        {/* Branding */}
        <div className="flex flex-col items-center gap-0.5 animate-[splash-fade-up_0.8s_ease-out_0.3s_both]">
          <span className="text-2xl font-bold tracking-tight text-foreground">白アニ</span>
          <span className="text-[10px] text-muted-foreground/50 tracking-[0.25em] uppercase font-medium">
            ShiroAni
          </span>
        </div>

        {/* Spinner + status */}
        <div
          className="mt-4 flex flex-col items-center gap-2.5"
          style={{
            opacity: showSpinner ? 1 : 0,
            transition: 'opacity 400ms ease-in',
          }}
          role="status"
          aria-live="polite"
        >
          {error ? (
            <div className="flex flex-col items-center gap-3 max-w-xs text-center animate-fade-in">
              <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-destructive" />
              </div>
              <p className="text-destructive text-sm">{error}</p>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 animate-[splash-fade-up_0.6s_ease-out_0.8s_both]">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-primary/70" />
              <p className="text-muted-foreground/60 text-xs">
                {ready ? 'Prawie gotowe...' : 'Laczenie z serwerem...'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
