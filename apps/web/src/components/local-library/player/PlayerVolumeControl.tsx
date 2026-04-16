import { Volume1, Volume2, VolumeX } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

interface PlayerVolumeControlProps {
  /** 0–1 range. */
  volume: number;
  muted: boolean;
  onVolumeChange: (volume: number) => void;
  onToggleMute: () => void;
}

/**
 * Icon toggle (mute) + slim horizontal slider. The slider expands on hover
 * of either control — this mirrors how YouTube / Netflix keep the volume UI
 * unobtrusive by default but accessible when targeted.
 */
export function PlayerVolumeControl({
  volume,
  muted,
  onVolumeChange,
  onToggleMute,
}: PlayerVolumeControlProps) {
  const effective = muted ? 0 : volume;
  const Icon = muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  return (
    <div className="group/volume flex items-center">
      <button
        type="button"
        aria-label={muted ? 'Wyłącz wyciszenie' : 'Wycisz'}
        title={muted ? 'Wyłącz wyciszenie (M)' : 'Wycisz (M)'}
        onClick={onToggleMute}
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-white/80 transition-colors',
          'hover:bg-white/10 hover:text-white focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-white/40'
        )}
      >
        <Icon className="h-4 w-4" />
      </button>
      <div
        className={cn(
          'overflow-hidden transition-all duration-200 ease-out',
          'w-0 group-hover/volume:w-24 focus-within:w-24'
        )}
      >
        <div className="px-2">
          <Slider
            value={[effective * 100]}
            min={0}
            max={100}
            step={1}
            aria-label="Głośność"
            onValueChange={([next]) => {
              onVolumeChange((next ?? 0) / 100);
            }}
            // Override the default primary-tinted track/thumb: the control bar
            // sits over video so we want monochrome white-on-black.
            className="[&>span[data-orientation=horizontal]]:bg-white/15 [&_[data-orientation=horizontal]>span]:bg-white [&_[role=slider]]:h-3 [&_[role=slider]]:w-3 [&_[role=slider]]:border-white/60 [&_[role=slider]]:bg-white"
          />
        </div>
      </div>
    </div>
  );
}
