import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { IS_ELECTRON } from '@/lib/platform';
import { KanjiWatermark } from '@/components/shared/KanjiWatermark';
import { SplashHero } from './SplashHero';
import { SplashFooter } from './SplashFooter';

/** Minimum time the splash screen stays visible (ms) */
const MIN_DISPLAY_MS = 3000;
/** Duration of the fade-out exit animation (ms) */
const EXIT_ANIMATION_MS = 600;
/** Delay before showing the footer status + progress (ms) */
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

function randomStartIndex() {
  return Math.floor(Math.random() * LOADING_MESSAGES.length);
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
  const [version, setVersion] = useState<string | null>(null);
  const hasDismissedRef = useRef(false);

  const shouldDismiss = ready && minTimeElapsed;

  useEffect(() => {
    const timer = setTimeout(() => setMinTimeElapsed(true), MIN_DISPLAY_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setShowSpinner(true), SPINNER_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (error) return;
    const timer = setInterval(
      () => setMessageIndex(i => (i + 1) % LOADING_MESSAGES.length),
      MESSAGE_ROTATE_MS
    );
    return () => clearInterval(timer);
  }, [error]);

  useEffect(() => {
    let mounted = true;
    window.electronAPI?.app?.getVersion().then(v => {
      if (mounted && v) setVersion(v);
    });
    return () => {
      mounted = false;
    };
  }, []);

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

      <KanjiWatermark kanji="白" position="tr" size={320} opacity={0.03} />

      <SplashHero variant={error ? 'error' : 'loading'} errorMessage={error} />

      <SplashFooter
        showSpinner={showSpinner}
        message={LOADING_MESSAGES[messageIndex]}
        messageKey={messageIndex}
        version={version}
        error={error}
        onRetry={() => window.location.reload()}
        onClose={() => window.close()}
      />
    </div>
  );
}
