import { LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDockStore, type DockEdge } from '@/stores/useDockStore';
import {
  SettingsCard,
  SettingsRow,
  SettingsRowLabel,
  SettingsToggleRow,
} from '@/components/settings/SettingsCard';
import { DockStage } from '@/components/shared/DockStage';
import { cn } from '@/lib/utils';

const DOCK_EDGES: ReadonlyArray<{ value: DockEdge; label: string }> = [
  { value: 'bottom', label: 'Dół' },
  { value: 'top', label: 'Góra' },
  { value: 'left', label: 'Lewo' },
  { value: 'right', label: 'Prawo' },
];

export function DockSection() {
  const dockEdge = useDockStore(s => s.edge);
  const setDockEdge = useDockStore(s => s.setEdge);
  const dockAutoHide = useDockStore(s => s.autoHide);
  const setDockAutoHide = useDockStore(s => s.setAutoHide);
  const dockShowLabels = useDockStore(s => s.showLabels);
  const setDockShowLabels = useDockStore(s => s.setShowLabels);
  const dockDraggable = useDockStore(s => s.draggable);
  const setDockDraggable = useDockStore(s => s.setDraggable);
  const resetDockPosition = useDockStore(s => s.resetPosition);

  return (
    <div className="space-y-4">
      <SettingsCard
        icon={LayoutGrid}
        title="Pozycja docka"
        subtitle="Wybierz krawędź ekranu — podgląd po prawej reaguje na zmianę."
      >
        <DockStage edge={dockEdge} height={160} />

        <SettingsRow stacked>
          <SettingsRowLabel
            title="Krawędź"
            description="Na której krawędzi ekranu przyczepić dock"
          />
          <div
            role="radiogroup"
            aria-label="Krawędź docka"
            className="grid grid-cols-2 gap-1.5 sm:grid-cols-4"
          >
            {DOCK_EDGES.map(({ value, label }) => {
              const isActive = dockEdge === value;
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={isActive}
                  onClick={() => setDockEdge(value)}
                  className={cn(
                    'rounded-lg border px-3 py-[7px] text-[12px] font-medium transition-colors',
                    'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                    isActive
                      ? 'border-primary/35 bg-primary/18 text-primary font-semibold'
                      : 'border-border-glass bg-background/30 text-muted-foreground hover:bg-accent/40 hover:text-foreground'
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </SettingsRow>

        <SettingsRow divider>
          <SettingsRowLabel
            title="Pozycja na krawędzi"
            description="Przywróć środek krawędzi, jeśli przesunąłeś dock przeciąganiem"
          />
          <Button
            variant="outline"
            size="sm"
            className="h-8 border-border-glass text-xs"
            onClick={resetDockPosition}
          >
            Przywróć pozycję
          </Button>
        </SettingsRow>
      </SettingsCard>

      <SettingsCard
        icon={LayoutGrid}
        tone="muted"
        title="Zachowanie"
        subtitle="Jak dock reaguje na kursor i czy można go przesuwać."
      >
        <SettingsToggleRow
          id="dock-autohide-label"
          title="Automatyczne ukrywanie"
          description="Dock chowa się do ikony i rozwija po najechaniu kursorem"
          checked={dockAutoHide}
          onCheckedChange={setDockAutoHide}
        />
        <SettingsToggleRow
          divider
          id="dock-labels-label"
          title="Pokaż etykiety"
          description="Wyświetlaj nazwy pod ikonami nawigacji"
          checked={dockShowLabels}
          onCheckedChange={setDockShowLabels}
        />
        <SettingsToggleRow
          divider
          id="dock-draggable-label"
          title="Przeciąganie"
          description="Pozwól na zmianę pozycji docka przeciąganiem"
          checked={dockDraggable}
          onCheckedChange={setDockDraggable}
        />
      </SettingsCard>
    </div>
  );
}
