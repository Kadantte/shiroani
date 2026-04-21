import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Circular SVG progress ring used on the Profile view to show library
 * status proportions (completed / watching / planning / paused / dropped).
 *
 * Mirrors the `.ring-wrap` / `.ring-fill` idiom from the redesign mock:
 *   - 72px default diameter, 6px stroke
 *   - track uses a low-opacity foreground wash
 *   - fill uses the primary accent by default (or a custom CSS colour)
 *   - value label sits absolutely-centred and echoes the fill colour
 *   - animates via `stroke-dashoffset` transition on value change
 */
export interface ProgressRingProps {
  /** 0–100 */
  value: number;
  /** Diameter in px (default 72) */
  size?: number;
  /** Stroke width in px (default 6) */
  strokeWidth?: number;
  /**
   * Stroke colour for the filled arc. Accepts any CSS colour string,
   * typically an `oklch(...)` value or a CSS variable. Defaults to
   * `var(--primary)`.
   */
  stroke?: string;
  /** Optional label under the ring (JetBrains Mono, uppercase, muted) */
  label?: string;
  /**
   * Value text override. Defaults to `{value}%`. Pass empty string to hide.
   */
  valueLabel?: React.ReactNode;
  /** Optional className forwarded to the outer wrapper */
  className?: string;
}

export function ProgressRing({
  value,
  size = 72,
  strokeWidth = 6,
  stroke = 'var(--primary)',
  label,
  valueLabel,
  className,
}: ProgressRingProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;
  const display = valueLabel !== undefined ? valueLabel : `${Math.round(clamped)}%`;

  return (
    <div className={cn('flex flex-col items-center gap-1.5', className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-90"
          aria-hidden="true"
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="oklch(from var(--primary) l c h / 0.07)"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{
              transition: 'stroke-dashoffset 700ms cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          />
        </svg>
        {display !== '' && (
          <div
            className="absolute inset-0 grid place-items-center text-[15px] font-extrabold leading-none tracking-[-0.02em] tabular-nums"
            style={{ color: stroke }}
          >
            {display}
          </div>
        )}
      </div>
      {label && (
        <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </span>
      )}
    </div>
  );
}
