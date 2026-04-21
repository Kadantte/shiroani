import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Thin horizontal progress bar with optional accent glow.
 * Redesign idiom — used on anime cards, news trending rows, diary streak.
 */
export interface ProgressBarProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 0–100. Ignored when `indeterminate` is true. */
  value?: number;
  /** Bar thickness in px (default 3) */
  thickness?: number;
  /** When true, primary glow is rendered under the filled track */
  glow?: boolean;
  /** Override the fill colour */
  tone?: 'primary' | 'muted';
  /** Render a sliding gradient instead of a determinate fill. Used for splash + other "unknown duration" loads. */
  indeterminate?: boolean;
}

export function ProgressBar({
  value = 0,
  thickness = 3,
  glow = false,
  tone = 'primary',
  indeterminate = false,
  className,
  style,
  ...props
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const fillClass = tone === 'primary' ? 'bg-primary' : 'bg-muted-foreground/60';
  const toneVar = tone === 'primary' ? '--primary' : '--muted-foreground';
  return (
    <div
      className={cn('relative w-full overflow-hidden rounded-full bg-foreground/8', className)}
      style={{ height: `${thickness}px`, ...style }}
      role="progressbar"
      aria-valuenow={indeterminate ? undefined : clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      {...props}
    >
      {indeterminate ? (
        <div
          className="h-full rounded-full animate-[progress-slide_2.2s_ease-in-out_infinite]"
          style={{
            width: '30%',
            background: `linear-gradient(90deg, transparent, oklch(from var(${toneVar}) l c h), transparent)`,
          }}
        />
      ) : (
        <div
          className={cn(
            'h-full rounded-full transition-[width] duration-300',
            fillClass,
            glow && 'shadow-[0_0_8px_oklch(from_var(--primary)_l_c_h/0.5)]'
          )}
          style={{ width: `${clamped}%` }}
        />
      )}
    </div>
  );
}
