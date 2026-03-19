import { useState, useEffect } from 'react';
import type { CountdownState } from '@shiroani/shared';
import { cn } from '@/lib/utils';

interface CountdownOverlayProps {
  countdown: CountdownState;
}

export function CountdownOverlay({ countdown }: CountdownOverlayProps) {
  const [display, setDisplay] = useState(countdown.seconds);
  const [phase, setPhase] = useState<'counting' | 'play' | 'exiting'>('counting');

  // Tick down based on elapsed time since countdown started
  useEffect(() => {
    if (!countdown.active) return;

    const tick = () => {
      const elapsed = Math.floor((Date.now() - countdown.startedAt) / 1000);
      const remaining = Math.max(0, countdown.seconds - elapsed);
      setDisplay(remaining);

      if (remaining === 0) {
        setPhase('play');
        // Auto-dismiss after showing "Play!"
        const exitTimer = setTimeout(() => setPhase('exiting'), 1500);
        return () => clearTimeout(exitTimer);
      }
    };

    tick();
    const interval = setInterval(tick, 200);
    return () => clearInterval(interval);
  }, [countdown.active, countdown.seconds, countdown.startedAt]);

  if (phase === 'exiting') return null;

  return (
    <div
      className={cn(
        'fixed inset-0 z-[50] flex items-center justify-center',
        'bg-background/80 backdrop-blur-sm',
        'transition-opacity duration-300'
      )}
    >
      {phase === 'counting' && display > 0 ? (
        <span
          key={display}
          className="text-8xl font-bold text-primary drop-shadow-lg"
          style={{
            animation: 'countdown-bounce-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both',
          }}
        >
          {display}
        </span>
      ) : (
        <span
          className="text-6xl font-bold text-primary drop-shadow-lg"
          style={{
            animation: 'countdown-scale-up 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both',
          }}
        >
          Play!
        </span>
      )}
    </div>
  );
}
