import { cn } from '@/lib/utils';
import { APP_LOGO_URL } from '@/lib/constants';

interface MascotPreviewProps {
  current: number;
  min: number;
  max: number;
}

/** Minimum display height for the smallest mascot in preview px. */
const PREVIEW_MIN = 50;
/** Maximum display height for the largest mascot in preview px. */
const PREVIEW_MAX = 130;

function scaleToPreview(real: number, min: number, max: number): number {
  if (max <= min) return PREVIEW_MIN;
  const clamped = Math.max(min, Math.min(max, real));
  const t = (clamped - min) / (max - min);
  return Math.round(PREVIEW_MIN + t * (PREVIEW_MAX - PREVIEW_MIN));
}

/**
 * Miniature stage showing three mascot silhouettes (min / current / max) against
 * a grid background. Mirrors the DockStage idiom so the preview language stays
 * consistent across settings sections. The middle chibi animates to the slider's
 * live value; min and max stay pinned as visual anchors.
 */
export function MascotPreview({ current, min, max }: MascotPreviewProps) {
  const minPx = scaleToPreview(min, min, max);
  const currentPx = scaleToPreview(current, min, max);
  const maxPx = scaleToPreview(max, min, max);

  return (
    <div
      className="relative h-[200px] overflow-hidden rounded-xl border border-border-glass"
      style={{
        background:
          'linear-gradient(135deg, oklch(0.14 0.02 300), oklch(0.1 0.02 280)), radial-gradient(circle at 70% 30%, oklch(0.5 0.15 355 / 0.25), transparent 60%)',
        backgroundBlendMode: 'overlay',
      }}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(oklch(1 0 0 / 0.03) 1px, transparent 1px), linear-gradient(90deg, oklch(1 0 0 / 0.03) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
      />
      <div className="relative flex h-full items-end justify-around px-8 pb-6">
        <ChibiPreviewItem previewSize={minPx} realSize={min} label="MIN" />
        <ChibiPreviewItem previewSize={currentPx} realSize={current} label="OBECNY" highlighted />
        <ChibiPreviewItem previewSize={maxPx} realSize={max} label="MAX" />
      </div>
    </div>
  );
}

interface ChibiPreviewItemProps {
  previewSize: number;
  realSize: number;
  label: string;
  highlighted?: boolean;
}

function ChibiPreviewItem({
  previewSize,
  realSize,
  label,
  highlighted = false,
}: ChibiPreviewItemProps) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className={cn(
          'grid place-items-center rounded-lg transition-[width,height] duration-150 ease-out',
          highlighted ? 'border-2 border-dashed border-primary/50 p-1.5' : ''
        )}
        style={{
          width: previewSize + (highlighted ? 16 : 0),
          height: previewSize + (highlighted ? 16 : 0),
        }}
      >
        <img
          src={APP_LOGO_URL}
          alt=""
          draggable={false}
          className="object-contain transition-[width,height] duration-150 ease-out"
          style={{ width: previewSize, height: previewSize }}
        />
      </div>
      <div
        className={cn(
          'font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] tabular-nums',
          highlighted ? 'text-primary' : 'text-muted-foreground/70'
        )}
      >
        {realSize}px · {label}
      </div>
    </div>
  );
}
