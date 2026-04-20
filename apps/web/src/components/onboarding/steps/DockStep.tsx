import { LayoutGrid } from 'lucide-react';
import { StepLayout } from '../StepLayout';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { useDockStore, type DockEdge } from '@/stores/useDockStore';
import { DockStage } from '@/components/shared/DockStage';

/**
 * Step 04 · Navigation dock.
 *
 * Wires edge (bottom/left/right), auto-hide, labels and drag toggles into
 * the existing DockStore. Includes a stage preview so users see the selected
 * position before they commit to it.
 */
export function DockStep() {
  const edge = useDockStore(s => s.edge);
  const setEdge = useDockStore(s => s.setEdge);
  const autoHide = useDockStore(s => s.autoHide);
  const setAutoHide = useDockStore(s => s.setAutoHide);
  const showLabels = useDockStore(s => s.showLabels);
  const setShowLabels = useDockStore(s => s.setShowLabels);
  const draggable = useDockStore(s => s.draggable);
  const setDraggable = useDockStore(s => s.setDraggable);

  return (
    <StepLayout
      kanji="位"
      headline={
        <>
          Gdzie <em className="not-italic text-primary italic">postawić</em> dock? Pod ręką, ale nie
          na drodze.
        </>
      }
      description={
        <>
          Pływająca pigułka z ikonami domyślnie siedzi na dole — ale jeśli preferujesz pion, są też
          boki. Zobacz podgląd po prawej.
        </>
      }
      stepMarker={
        <>
          Krok <b className="font-bold text-primary">05 · Układ</b> · dock nawigacyjny
        </>
      }
      stepIcon={<LayoutGrid className="h-5 w-5" />}
      stepTitle="Dock"
    >
      <div className="space-y-3 rounded-2xl border border-border-glass bg-foreground/[0.02] p-4">
        <DockStage edge={edge} />
        <div className="grid grid-cols-3 gap-1.5">
          <EdgePill edge="bottom" current={edge} onSelect={setEdge} label="Dół" />
          <EdgePill edge="left" current={edge} onSelect={setEdge} label="Lewo" />
          <EdgePill edge="right" current={edge} onSelect={setEdge} label="Prawo" />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <ToggleRow
          id="onb-dock-autohide"
          label="Automatyczne ukrywanie"
          description="Dock chowa się do ikony i rozwija po najechaniu"
          checked={autoHide}
          onChange={setAutoHide}
        />
        <ToggleRow
          id="onb-dock-labels"
          label="Pokaż etykiety"
          description="Wyświetla nazwy pod ikonami nawigacji"
          checked={showLabels}
          onChange={setShowLabels}
        />
        <ToggleRow
          id="onb-dock-drag"
          label="Przeciąganie"
          description="Zmiana pozycji docka przez drag & drop"
          checked={draggable}
          onChange={setDraggable}
        />
      </div>
    </StepLayout>
  );
}

function EdgePill({
  edge,
  current,
  onSelect,
  label,
}: {
  edge: DockEdge;
  current: DockEdge;
  onSelect: (edge: DockEdge) => void;
  label: string;
}) {
  const active = current === edge;
  return (
    <button
      type="button"
      onClick={() => onSelect(edge)}
      aria-pressed={active}
      className={cn(
        'flex flex-col items-center gap-1.5 rounded-lg border px-2.5 py-2 font-mono text-[9.5px] uppercase tracking-[0.1em] transition-colors',
        'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        active
          ? 'border-primary/40 bg-primary/10 text-primary'
          : 'border-border-glass bg-foreground/[0.03] text-muted-foreground hover:text-foreground'
      )}
    >
      <span
        className="relative h-[22px] w-[34px] overflow-hidden rounded-[4px] border border-border-glass bg-foreground/[0.05]"
        aria-hidden="true"
      >
        {edge === 'bottom' && (
          <span className="absolute bottom-0.5 left-1/2 block h-1 w-5 -translate-x-1/2 rounded-full bg-primary" />
        )}
        {edge === 'left' && (
          <span className="absolute left-0.5 top-1/2 block h-4 w-1 -translate-y-1/2 rounded-full bg-primary" />
        )}
        {edge === 'right' && (
          <span className="absolute right-0.5 top-1/2 block h-4 w-1 -translate-y-1/2 rounded-full bg-primary" />
        )}
      </span>
      <span className={cn('font-semibold', active && 'font-bold')}>{label}</span>
    </button>
  );
}

function ToggleRow({
  id,
  label,
  description,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border-glass bg-foreground/[0.02] px-3.5 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="text-[12.5px] font-semibold text-foreground" id={`${id}-label`}>
          {label}
        </p>
        <p className="text-[11px] text-muted-foreground" id={`${id}-desc`}>
          {description}
        </p>
      </div>
      <Switch
        aria-labelledby={`${id}-label`}
        aria-describedby={`${id}-desc`}
        checked={checked}
        onCheckedChange={onChange}
      />
    </div>
  );
}
