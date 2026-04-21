import * as React from 'react';
import { cn } from '@/lib/utils';

type Position = 'br' | 'tr' | 'bl' | 'tl';

/**
 * Large decorative kanji character rendered behind view hero sections in the
 * redesign. Positioned absolutely; pointer-events: none.
 */
export interface KanjiWatermarkProps extends React.HTMLAttributes<HTMLSpanElement> {
  kanji: string;
  /** Which corner the glyph sits in (default bottom-right) */
  position?: Position;
  /** Glyph size in px (default 220) */
  size?: number;
  /** Optional opacity override (default .06) */
  opacity?: number;
}

const POSITION_CLASSES: Record<Position, string> = {
  br: 'right-[-24px] bottom-[-36px]',
  tr: 'right-[-24px] top-[-36px]',
  bl: 'left-[-24px] bottom-[-36px]',
  tl: 'left-[-24px] top-[-36px]',
};

export function KanjiWatermark({
  kanji,
  position = 'br',
  size = 220,
  opacity = 0.06,
  className,
  style,
  ...props
}: KanjiWatermarkProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute select-none font-serif font-extrabold leading-none tracking-[-0.05em] text-foreground',
        POSITION_CLASSES[position],
        className
      )}
      style={{ fontSize: `${size}px`, opacity, ...style }}
      {...props}
    >
      {kanji}
    </span>
  );
}
