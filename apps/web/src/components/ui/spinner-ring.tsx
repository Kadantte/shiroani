import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Dual counter-rotating ring. Used on the splash as ambient loading motion,
 * reusable for any focal "something is happening" moment (feed article fetch,
 * profile activity load, updater progress).
 */
export interface SpinnerRingProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Total ring diameter in px. Default 138 — wraps a 110px focal element with 14px inset. */
  size?: number;
  /** Theme token used for both ring arcs at different alphas. */
  tone?: 'primary' | 'destructive';
  /** Freeze rotation. Used for the splash error state. */
  paused?: boolean;
  children?: React.ReactNode;
}

const TONE_VAR: Record<NonNullable<SpinnerRingProps['tone']>, string> = {
  primary: '--primary',
  destructive: '--destructive',
};

export function SpinnerRing({
  size = 138,
  tone = 'primary',
  paused = false,
  children,
  className,
  style,
  ...props
}: SpinnerRingProps) {
  const toneVar = TONE_VAR[tone];
  return (
    <div
      className={cn('relative', className)}
      style={{ width: size, height: size, ...style }}
      {...props}
    >
      <div
        aria-hidden="true"
        className={cn(
          'absolute inset-0 rounded-full border-[1.5px] border-transparent',
          !paused && 'animate-[spinner-ring-cw_1.8s_linear_infinite]'
        )}
        style={{
          borderTopColor: `oklch(from var(${toneVar}) l c h)`,
          borderRightColor: `oklch(from var(${toneVar}) l c h / 0.4)`,
        }}
      />
      <div
        aria-hidden="true"
        className={cn(
          'absolute inset-[6px] rounded-full border-[1.5px] border-transparent',
          !paused && 'animate-[spinner-ring-ccw_2.6s_linear_infinite]'
        )}
        style={{
          borderTopColor: `oklch(from var(${toneVar}) l c h / 0.7)`,
          borderLeftColor: `oklch(from var(${toneVar}) l c h / 0.3)`,
        }}
      />
      {children ? <div className="absolute inset-0 grid place-items-center">{children}</div> : null}
    </div>
  );
}
