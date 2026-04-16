import { Gauge } from 'lucide-react';
import { PlayerMenu } from './PlayerMenu';

const SPEEDS: ReadonlyArray<{ id: string; label: string; value: number }> = [
  { id: '0.5', label: '0.5x', value: 0.5 },
  { id: '0.75', label: '0.75x', value: 0.75 },
  { id: '1', label: 'Normalna', value: 1 },
  { id: '1.25', label: '1.25x', value: 1.25 },
  { id: '1.5', label: '1.5x', value: 1.5 },
  { id: '2', label: '2x', value: 2 },
];

interface PlayerSpeedMenuProps {
  rate: number;
  onChange: (rate: number) => void;
  onOpenChange?: (open: boolean) => void;
}

export function PlayerSpeedMenu({ rate, onChange, onOpenChange }: PlayerSpeedMenuProps) {
  const current = SPEEDS.find(s => Math.abs(s.value - rate) < 0.001) ?? SPEEDS[2];
  return (
    <PlayerMenu<number>
      icon={Gauge}
      label={`Prędkość: ${current.label}`}
      selectedId={current.id}
      items={SPEEDS}
      headerSlot="Prędkość"
      onSelect={item => onChange(item.value)}
      onOpenChange={onOpenChange}
    />
  );
}
