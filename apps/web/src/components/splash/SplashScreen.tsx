import { useState, useEffect, useRef, useMemo } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { IS_ELECTRON } from '@/lib/platform';
import { MASCOT_THINK_URL } from '@/lib/constants';

/** Minimum time the splash screen stays visible (ms) */
const MIN_DISPLAY_MS = 3000;
/** Duration of the fade-out exit animation (ms) */
const EXIT_ANIMATION_MS = 600;
/** Delay before showing the spinner (ms) */
const SPINNER_DELAY_MS = 600;
/** How often loading messages rotate (ms) */
const MESSAGE_ROTATE_MS = 1400;

const LOADING_MESSAGES = [
  'Shiro-chan się przeciąga~ nyaa...',
  'Szukam pilota od anime...',
  'Shiro rysuje plan na dziś...',
  'Podkradamy ciastka z kuchni...',
  'Shiro sprawdza co nowego...',
  'Jeszcze jedna drzemka... zzz',
  'Shiro-chan jest prawie gotowa!',
  'Układamy pluszaki na kanapie...',
  'Shiro goni motylka... zaraz wracam!',
  'Nastawiamy czajnik na herbatkę...',
];

/** Pick a random starting index so each launch feels different */
function randomStartIndex() {
  return Math.floor(Math.random() * LOADING_MESSAGES.length);
}

/** Sparkle particles that twinkle around the mascot area */
const SPARKLE_COUNT = 10;

function useSparkles() {
  return useMemo(
    () =>
      Array.from({ length: SPARKLE_COUNT }, (_, i) => {
        // Distribute sparkles in a circle around center (mascot area)
        const angle = (i / SPARKLE_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.8;
        const radius = 60 + Math.random() * 80; // 60-140px from center
        return {
          id: i,
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius,
          size: 2 + Math.random() * 3,
          delay: Math.random() * 2,
          duration: 1.5 + Math.random() * 1.5,
        };
      }),
    []
  );
}

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
  const [messageIndex, setMessageIndex] = useState(randomStartIndex);
  const hasDismissedRef = useRef(false);
  const sparkles = useSparkles();

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

  // Rotate loading messages
  useEffect(() => {
    if (error) return;
    const timer = setInterval(
      () => setMessageIndex(i => (i + 1) % LOADING_MESSAGES.length),
      MESSAGE_ROTATE_MS
    );
    return () => clearInterval(timer);
  }, [error]);

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
        'fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background overflow-hidden',
        'transition-[opacity,transform] duration-600 ease-out',
        isDismissing && 'opacity-0 scale-[1.02]',
        IS_ELECTRON && 'rounded-t-[10px]'
      )}
    >
      {/* Draggable region so the window can still be moved during splash */}
      {IS_ELECTRON && <div className="absolute inset-x-0 top-0 h-8 drag" />}

      <div className="flex flex-col items-center justify-center gap-3">
        {/* Chibi character with bounce entrance + floating animation */}
        <div className="relative animate-[splash-bounce-in_0.7s_cubic-bezier(0.34,1.56,0.64,1)_both]">
          {/* Soft glow behind character */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-32 h-32 rounded-full bg-primary/10 blur-3xl animate-pulse-subtle" />
          </div>

          {/* Sparkles twinkling around the mascot */}
          <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
            {sparkles.map(s => (
              <div
                key={s.id}
                className="absolute rounded-full bg-primary"
                style={{
                  left: `calc(50% + ${s.x}px)`,
                  top: `calc(50% + ${s.y}px)`,
                  width: s.size,
                  height: s.size,
                  animation: `splash-twinkle ${s.duration}s ease-in-out ${s.delay}s infinite both`,
                }}
              />
            ))}
          </div>

          <img
            src={MASCOT_THINK_URL}
            alt="Maskotka ShiroAni"
            className="relative w-40 h-40 object-contain drop-shadow-lg animate-[splash-float_3s_ease-in-out_0.7s_infinite]"
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
          className={cn(
            'mt-4 flex flex-col items-center gap-2.5 transition-opacity duration-400 ease-in',
            showSpinner ? 'opacity-100' : 'opacity-0'
          )}
          role="status"
          aria-live="polite"
        >
          {error ? (
            <div className="flex flex-col items-center gap-3 max-w-xs text-center animate-fade-in">
              <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-destructive" aria-hidden="true" />
              </div>
              <p className="text-destructive text-sm">{error}</p>
              <button
                type="button"
                className="text-sm text-primary hover:underline cursor-pointer"
                onClick={() => window.location.reload()}
              >
                Spróbuj ponownie
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 animate-[splash-fade-up_0.6s_ease-out_0.8s_both]">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <p
                key={messageIndex}
                className="text-muted-foreground text-sm animate-[splash-msg-swap_0.4s_ease-out_both]"
              >
                {LOADING_MESSAGES[messageIndex]}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
