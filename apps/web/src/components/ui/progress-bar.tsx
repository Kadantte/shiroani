import { cn } from '@/lib/utils';

interface ProgressBarProps {
  /** Value from 0–100. When `indeterminate` is true, this is ignored. */
  value?: number;
  /** When true, renders a subtle sweeping gradient instead of a fixed fill. */
  indeterminate?: boolean;
  className?: string;
}

/**
 * Minimal tailwind-based progress bar. Kept local to avoid adding
 * `@radix-ui/react-progress` just for the FFmpeg installer — we don't need
 * keyboard/ARIA nav on a one-off download indicator (role="progressbar"
 * covers the accessibility surface we actually care about).
 */
export function ProgressBar({ value, indeterminate, className }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value ?? 0));
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={indeterminate ? undefined : clamped}
      className={cn('relative h-2 w-full overflow-hidden rounded-full bg-muted/60', className)}
    >
      {indeterminate ? (
        <div className="absolute inset-y-0 left-0 w-1/3 animate-progress-slide bg-gradient-to-r from-transparent via-primary to-transparent" />
      ) : (
        <div
          className="h-full bg-primary transition-[width] duration-200 ease-out"
          style={{ width: `${clamped}%` }}
        />
      )}
    </div>
  );
}
