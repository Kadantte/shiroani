import { ArrowLeft, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PlayerSessionMode } from '@shiroani/shared';

interface PlayerTopBarProps {
  seriesTitle: string;
  episodeTitle: string | null;
  episodeBadge: string | null;
  mode: PlayerSessionMode | null;
  onBack: () => void;
  visible: boolean;
}

const MODE_LABEL: Record<Exclude<PlayerSessionMode, 'remux'>, string> = {
  'transcode-video': 'Transkodowanie wideo',
  'transcode-audio': 'Transkodowanie audio',
  'transcode-both': 'Transkodowanie A/V',
};

/**
 * Top strip of the player chrome. Back button, episode identity, and a
 * "Transcoding" badge so the user can correlate perf/battery cost with the
 * fact that ffmpeg is actively re-encoding rather than just remuxing.
 */
export function PlayerTopBar({
  seriesTitle,
  episodeTitle,
  episodeBadge,
  mode,
  onBack,
  visible,
}: PlayerTopBarProps) {
  const badgeLabel = mode && mode !== 'remux' ? MODE_LABEL[mode] : null;

  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-4 p-4 transition-opacity duration-200',
        'bg-gradient-to-b from-black/80 via-black/40 to-transparent',
        visible ? 'opacity-100' : 'opacity-0'
      )}
    >
      <div className="pointer-events-auto flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="Powrót"
          title="Powrót (Esc)"
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white/90 backdrop-blur-sm transition-colors',
            'hover:bg-black/60 hover:text-white focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-white/40'
          )}
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        <div className="min-w-0">
          <p className="truncate text-xs uppercase tracking-wider text-white/60">{seriesTitle}</p>
          <div className="flex items-center gap-2">
            {episodeBadge && (
              <span className="rounded border border-white/20 bg-white/5 px-1.5 py-0.5 font-mono text-[11px] text-white/80">
                {episodeBadge}
              </span>
            )}
            {episodeTitle && (
              <h1 className="truncate text-sm font-semibold text-white">{episodeTitle}</h1>
            )}
          </div>
        </div>
      </div>

      {badgeLabel && (
        <div
          className={cn(
            'pointer-events-auto flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-200 backdrop-blur-sm'
          )}
          title="FFmpeg aktywnie transkoduje ten plik."
        >
          <Sparkles className="h-3 w-3" />
          {badgeLabel}
        </div>
      )}
    </div>
  );
}
