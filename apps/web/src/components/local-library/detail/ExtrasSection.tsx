import { Sparkles } from 'lucide-react';
import type { LocalEpisode, PlaybackProgress } from '@shiroani/shared';
import { EpisodeRow } from './EpisodeRow';

interface ExtrasSectionProps {
  extras: LocalEpisode[];
  progressByEpisode: Record<number, PlaybackProgress>;
  onPlay: (episodeId: number) => void;
  onToggleWatched: (episodeId: number, watched: boolean) => void;
}

const EXTRA_KIND_LABELS: Record<string, string> = {
  ova: 'OVA',
  movie: 'Film',
  special: 'Specjalny',
  nced: 'NC Opening',
  nceed: 'NC Ending',
  extra: 'Extra',
};

export function ExtrasSection({
  extras,
  progressByEpisode,
  onPlay,
  onToggleWatched,
}: ExtrasSectionProps) {
  if (extras.length === 0) return null;

  // Group by kind so users can scan — "OVAs" then "Movies" etc.
  const byKind = new Map<string, LocalEpisode[]>();
  for (const ep of extras) {
    const bucket = byKind.get(ep.kind) ?? [];
    bucket.push(ep);
    byKind.set(ep.kind, bucket);
  }

  return (
    <section className="space-y-4 pt-8">
      <div className="flex items-center gap-2">
        <Sparkles className="w-3.5 h-3.5 text-primary/70" />
        <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground/80">
          Dodatki
        </h2>
      </div>
      {Array.from(byKind.entries()).map(([kind, episodes]) => (
        <div key={kind} className="space-y-1.5">
          <h3 className="text-xs font-semibold text-muted-foreground/80 px-1">
            {EXTRA_KIND_LABELS[kind] ?? kind}
          </h3>
          <div className="space-y-1.5">
            {episodes.map(ep => (
              <EpisodeRow
                key={ep.id}
                episode={ep}
                progress={progressByEpisode[ep.id]}
                onPlay={onPlay}
                onToggleWatched={onToggleWatched}
              />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
