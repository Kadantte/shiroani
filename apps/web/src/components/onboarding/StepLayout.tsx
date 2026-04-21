import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { KanjiWatermark } from '@/components/shared/KanjiWatermark';

/**
 * Shared two-pane magazine-split layout used by every onboarding step.
 * Left pane holds Shiro-chan's narrative (kanji watermark, serif headline,
 * body copy); right pane hosts the interactive form card.
 *
 * The left-pane content changes per step but the visual rhythm (typography,
 * kanji, spacing) is shared, which gives the wizard a consistent editorial feel.
 */
export interface StepLayoutProps {
  /** Kanji character rendered as a faint watermark behind the left pane. */
  kanji: string;
  /** Headline rendered in Shippori Mincho. Accepts JSX so callers can italicise words via <em>. */
  headline: ReactNode;
  /** Supporting paragraph under the headline. */
  description: ReactNode;
  /** Right-pane "step marker" label (e.g. "Krok 02 · Wygląd · paleta"). */
  stepMarker: ReactNode;
  /** Right-pane title line rendered next to the marker icon. */
  stepTitle: ReactNode;
  /** Optional icon glyph/element shown beside the step title. */
  stepIcon?: ReactNode;
  /** Optional hint rendered under the step title. */
  stepHint?: ReactNode;
  /** Right-pane body — the interactive form card for this step. */
  children: ReactNode;
  /** Additional classes applied to the right-pane scroll container. */
  rightClassName?: string;
}

export function StepLayout({
  kanji,
  headline,
  description,
  stepMarker,
  stepTitle,
  stepIcon,
  stepHint,
  children,
  rightClassName,
}: StepLayoutProps) {
  return (
    <div className="grid h-full grid-cols-1 md:grid-cols-[1.08fr_1fr]">
      {/* Left pane — narrative */}
      <div className="relative flex min-w-0 flex-col justify-between overflow-hidden px-10 py-10 md:px-12 md:py-12">
        <KanjiWatermark
          kanji={kanji}
          position="bl"
          size={340}
          opacity={0.04}
          className="-left-10 -bottom-20 text-foreground"
        />
        <div className="relative z-[1] max-w-[42ch]">
          <h1 className="mt-6 font-serif text-[38px] font-bold leading-[0.98] tracking-[-0.03em] text-foreground md:text-[46px]">
            {headline}
          </h1>
          <p className="mt-4 text-[14.5px] leading-relaxed text-muted-foreground">{description}</p>
        </div>
      </div>

      {/* Right pane — interactive */}
      <div
        className={cn(
          'relative flex min-w-0 flex-col gap-3.5 overflow-y-auto border-l border-border-glass bg-background/40 px-8 py-10 md:px-10 md:py-11',
          rightClassName
        )}
      >
        <div className="border-b border-border-glass pb-3 font-mono text-[10.5px] uppercase tracking-[0.2em] text-muted-foreground">
          {stepMarker}
        </div>
        <h2 className="flex items-center gap-2.5 font-serif text-xl font-bold tracking-[-0.01em] text-foreground">
          {stepIcon && <span className="text-primary text-lg">{stepIcon}</span>}
          {stepTitle}
        </h2>
        {stepHint && (
          <p className="-mt-1 mb-1 text-[12.5px] leading-relaxed text-muted-foreground">
            {stepHint}
          </p>
        )}
        <div className="flex min-h-0 flex-col gap-3">{children}</div>
      </div>
    </div>
  );
}
