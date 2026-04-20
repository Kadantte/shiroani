import { MASCOT_THINK_URL } from '@/lib/constants';
import { SpinnerRing } from '@/components/ui/spinner-ring';
import { cn } from '@/lib/utils';

interface SplashHeroProps {
  variant?: 'loading' | 'error';
  errorMessage?: string | null;
}

export function SplashHero({ variant = 'loading', errorMessage }: SplashHeroProps) {
  const isError = variant === 'error';
  return (
    <div className="relative flex flex-col items-center justify-center gap-5 px-8 text-center animate-[splash-fade-up_0.8s_ease-out_both]">
      <SpinnerRing size={200} tone={isError ? 'destructive' : 'primary'} paused={isError}>
        <img
          src={MASCOT_THINK_URL}
          alt="Maskotka ShiroAni"
          className={cn(
            'w-36 h-36 object-contain drop-shadow-lg',
            !isError && 'animate-[splash-pulse_2.4s_ease-in-out_infinite]'
          )}
          draggable={false}
        />
      </SpinnerRing>

      <div className="flex flex-col items-center gap-1.5 animate-[splash-fade-up_0.8s_ease-out_0.2s_both]">
        <div className="font-serif text-[34px] font-extrabold leading-none tracking-[-0.02em] text-foreground">
          Shiro
          <em className={cn('italic', isError ? 'text-destructive' : 'text-primary')}>Ani</em>
        </div>
        <div
          className={cn(
            'font-mono text-[10.5px] uppercase tracking-[0.28em]',
            isError ? 'text-destructive/85' : 'text-muted-foreground/80'
          )}
        >
          {isError ? 'brak połączenia · tryb offline' : '白アニ · twoje anime'}
        </div>
      </div>

      {isError && errorMessage && (
        <p className="max-w-sm text-sm leading-relaxed text-muted-foreground animate-[splash-fade-up_0.6s_ease-out_0.4s_both]">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
