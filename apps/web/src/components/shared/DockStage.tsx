import { cn } from '@/lib/utils';
import type { DockEdge } from '@/stores/useDockStore';

interface DockStageProps {
  edge: DockEdge;
  /** Override the stage height in px (default 144). */
  height?: number;
  className?: string;
}

/**
 * Miniature stage with a grid background + floating dock positioned by edge.
 * Reused between the onboarding DockStep and the Dock settings section so the
 * live preview stays consistent across first-run and post-setup adjustments.
 */
export function DockStage({ edge, height = 144, className }: DockStageProps) {
  return (
    <div
      className={cn('relative overflow-hidden rounded-xl border border-border-glass', className)}
      style={{
        height,
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
      <MiniDock edge={edge} />
    </div>
  );
}

function MiniDock({ edge }: { edge: DockEdge }) {
  const isVertical = edge === 'left' || edge === 'right';
  const positionStyle: React.CSSProperties = (() => {
    switch (edge) {
      case 'bottom':
        return { bottom: 12, left: '50%', transform: 'translateX(-50%)' };
      case 'top':
        return { top: 12, left: '50%', transform: 'translateX(-50%)' };
      case 'left':
        return { left: 12, top: '50%', transform: 'translateY(-50%)' };
      case 'right':
        return { right: 12, top: '50%', transform: 'translateY(-50%)' };
    }
  })();

  return (
    <div
      className={cn(
        'absolute flex gap-1 rounded-full border border-white/10 p-1 shadow-[0_10px_24px_oklch(0_0_0_/_0.5)] backdrop-blur-md',
        isVertical ? 'flex-col' : 'flex-row'
      )}
      style={{ ...positionStyle, background: 'oklch(0.16 0.025 300 / 0.85)' }}
    >
      <span className="grid h-6 w-6 place-items-center rounded-full bg-primary text-primary-foreground">
        <span className="block h-2 w-2 rounded-[2px] bg-current" />
      </span>
      <span className="grid h-6 w-6 place-items-center rounded-full text-muted-foreground">
        <span className="block h-2 w-2 rounded-[2px] bg-current opacity-60" />
      </span>
      <span className="grid h-6 w-6 place-items-center rounded-full text-muted-foreground">
        <span className="block h-2 w-2 rounded-[2px] bg-current opacity-60" />
      </span>
      <span className="grid h-6 w-6 place-items-center rounded-full text-muted-foreground">
        <span className="block h-2 w-2 rounded-[2px] bg-current opacity-60" />
      </span>
    </div>
  );
}
