import { Languages } from 'lucide-react';
import { PlayerMenu } from './PlayerMenu';
import type { PlayerAudioTrack } from '@shiroani/shared';

interface PlayerAudioTrackMenuProps {
  tracks: PlayerAudioTrack[];
  activeIndex: number;
  onSelect: (trackIndex: number) => void;
  onOpenChange?: (open: boolean) => void;
}

function formatTrackLabel(track: PlayerAudioTrack): string {
  const parts: string[] = [];
  if (track.language) parts.push(track.language.toUpperCase());
  if (track.title) parts.push(track.title);
  if (parts.length === 0) parts.push(`Ścieżka ${track.index + 1}`);
  return parts.join(' · ');
}

function formatTrackHint(track: PlayerAudioTrack): string | null {
  const bits: string[] = [];
  if (track.codec) bits.push(track.codec.toUpperCase());
  if (track.channels) {
    if (track.channels === 1) bits.push('Mono');
    else if (track.channels === 2) bits.push('Stereo');
    else if (track.channels === 6) bits.push('5.1');
    else if (track.channels === 8) bits.push('7.1');
    else bits.push(`${track.channels}ch`);
  }
  return bits.length > 0 ? bits.join(' · ') : null;
}

export function PlayerAudioTrackMenu({
  tracks,
  activeIndex,
  onSelect,
  onOpenChange,
}: PlayerAudioTrackMenuProps) {
  const items = tracks.map(track => ({
    id: String(track.index),
    value: track.index,
    label: formatTrackLabel(track),
    hint: formatTrackHint(track),
  }));

  return (
    <PlayerMenu<number>
      icon={Languages}
      label="Ścieżka audio"
      selectedId={String(activeIndex)}
      items={items}
      headerSlot="Audio"
      onSelect={item => onSelect(item.value)}
      onOpenChange={onOpenChange}
    />
  );
}
