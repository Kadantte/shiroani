import { Subtitles } from 'lucide-react';
import { PlayerMenu } from './PlayerMenu';
import type { PlayerSubtitleTrack } from '@shiroani/shared';

interface PlayerSubtitleTrackMenuProps {
  tracks: PlayerSubtitleTrack[];
  /** Track index of the active track. `null` = subtitles off. */
  activeIndex: number | null;
  onSelect: (trackIndex: number) => void;
  onSelectOff: () => void;
  onOpenChange?: (open: boolean) => void;
}

function formatLabel(track: PlayerSubtitleTrack): string {
  const parts: string[] = [];
  if (track.language) parts.push(track.language.toUpperCase());
  if (track.title) parts.push(track.title);
  if (parts.length === 0) parts.push(`Ścieżka ${track.index + 1}`);
  return parts.join(' · ');
}

function formatHint(track: PlayerSubtitleTrack): string | null {
  const bits: string[] = [];
  if (track.codec) bits.push(track.codec.toUpperCase());
  if (track.isForced) bits.push('Wymuszone');
  if (track.subsUrl === null) bits.push('Obrazkowe (niedostępne)');
  return bits.length > 0 ? bits.join(' · ') : null;
}

export function PlayerSubtitleTrackMenu({
  tracks,
  activeIndex,
  onSelect,
  onSelectOff,
  onOpenChange,
}: PlayerSubtitleTrackMenuProps) {
  // Hide image-based subs (PGS/VobSub) since libass can't render them and
  // there's no fallback plumbed through. The backend still returns them so
  // we know they exist — surface the codec in the hint rather than the row.
  const renderable = tracks.filter(t => t.subsUrl !== null);

  const items = renderable.map(track => ({
    id: String(track.index),
    value: track.index,
    label: formatLabel(track),
    hint: formatHint(track),
  }));

  return (
    <PlayerMenu<number>
      icon={Subtitles}
      label="Napisy"
      selectedId={activeIndex === null ? null : String(activeIndex)}
      items={items}
      headerSlot="Napisy"
      offLabel="Wyłączone"
      onSelectOff={onSelectOff}
      onSelect={item => onSelect(item.value)}
      onOpenChange={onOpenChange}
    />
  );
}
