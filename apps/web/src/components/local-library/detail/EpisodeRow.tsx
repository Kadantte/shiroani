import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Check, FolderOpen, MoreVertical, Play, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { LocalEpisode, PlaybackProgress } from '@shiroani/shared';

interface EpisodeRowProps {
  episode: LocalEpisode;
  progress: PlaybackProgress | undefined;
  onPlay: (episodeId: number) => void;
  onToggleWatched: (episodeId: number, watched: boolean) => void;
  onRemove?: (episodeId: number) => void;
}

function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds <= 0) return '—';
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatEpisodeLabel(episode: LocalEpisode): string {
  const s = episode.parsedSeason ?? 1;
  const e = episode.parsedEpisodeNumber;
  if (e === null) return `S${String(s).padStart(2, '0')}`;
  return `S${String(s).padStart(2, '0')}E${String(e).padStart(2, '0')}`;
}

/**
 * Single row in the episode list. Intentionally pure: all state lives in the
 * store and is passed in as props so rows re-render independently when their
 * own progress changes.
 */
const EpisodeRow = memo(function EpisodeRow({
  episode,
  progress,
  onPlay,
  onToggleWatched,
  onRemove,
}: EpisodeRowProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const watched = progress?.completed ?? false;
  const hasProgress = !watched && !!progress && progress.positionSeconds > 0;
  const pct =
    hasProgress && progress!.durationSeconds > 0
      ? Math.min(100, (progress!.positionSeconds / progress!.durationSeconds) * 100)
      : 0;

  useEffect(() => {
    if (!menuOpen) return;
    const onDocClick = (ev: MouseEvent) => {
      if (!menuRef.current?.contains(ev.target as Node)) setMenuOpen(false);
    };
    const onEsc = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, [menuOpen]);

  const handleToggle = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onToggleWatched(episode.id, !watched);
    },
    [onToggleWatched, episode.id, watched]
  );

  const handleRowClick = useCallback(() => {
    onPlay(episode.id);
  }, [onPlay, episode.id]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onPlay(episode.id);
      }
    },
    [onPlay, episode.id]
  );

  const handleReveal = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      setMenuOpen(false);
      if (typeof window === 'undefined' || !window.shiroaniLocalLibrary?.revealInExplorer) {
        toast.error('Eksplorator plików jest dostępny tylko w aplikacji.');
        return;
      }
      try {
        const result = await window.shiroaniLocalLibrary.revealInExplorer(episode.filePath);
        if (!result.success && result.error) {
          toast.error(`Nie udało się otworzyć: ${result.error}`);
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : String(err));
      }
    },
    [episode.filePath]
  );

  const label = formatEpisodeLabel(episode);
  const title = episode.parsedTitle || `Odcinek ${episode.parsedEpisodeNumber ?? '?'}`;

  return (
    <div
      role="button"
      tabIndex={0}
      className={cn(
        'group relative flex items-center gap-3 rounded-md px-3 py-2.5 text-xs cursor-pointer',
        'bg-card/30 border border-border/40',
        'hover:bg-card/60 hover:border-border/70 transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        watched && 'opacity-70'
      )}
      onClick={handleRowClick}
      onKeyDown={handleKeyDown}
    >
      {/* Thumbnail placeholder */}
      <div className="shrink-0 w-[96px] aspect-video rounded-md overflow-hidden bg-muted/40 border border-border/40 flex items-center justify-center">
        <Play className="w-3.5 h-3.5 text-muted-foreground/40" />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="shrink-0 text-[11px] font-mono font-semibold text-primary/80">
            {label}
          </span>
          <span className="truncate font-medium text-foreground/90">{title}</span>
        </div>
        <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground/70">
          <span>{formatDuration(episode.durationSeconds)}</span>
          {episode.releaseGroup && (
            <>
              <span className="opacity-40">•</span>
              <span className="truncate font-medium text-muted-foreground/90">
                {episode.releaseGroup}
              </span>
            </>
          )}
          {episode.kind !== 'episode' && (
            <>
              <span className="opacity-40">•</span>
              <span className="uppercase tracking-wide text-[10px] text-amber-400/80">
                {episode.kind}
              </span>
            </>
          )}
        </div>
        {hasProgress && (
          <div className="mt-1.5 h-0.5 bg-background/50 rounded">
            <div
              className="h-full bg-primary rounded"
              style={{ width: `${pct}%` }}
              aria-label={`${Math.round(pct)}% obejrzane`}
            />
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="shrink-0 flex items-center gap-1">
        <button
          type="button"
          onClick={handleToggle}
          aria-label={watched ? 'Oznacz jako nieobejrzany' : 'Oznacz jako obejrzany'}
          title={watched ? 'Oznacz jako nieobejrzany' : 'Oznacz jako obejrzany'}
          className={cn(
            'w-6 h-6 rounded-full flex items-center justify-center transition-colors border',
            watched
              ? 'bg-primary border-primary text-primary-foreground'
              : 'bg-transparent border-border/70 text-muted-foreground/50 hover:text-foreground hover:border-border'
          )}
        >
          {watched && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
        </button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground/70 hover:text-primary opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
          onClick={e => {
            e.stopPropagation();
            onPlay(episode.id);
          }}
          aria-label="Odtwórz"
        >
          <Play className="w-3.5 h-3.5" fill="currentColor" />
        </Button>
        <div className="relative" ref={menuRef}>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground/70 hover:text-foreground"
            onClick={e => {
              e.stopPropagation();
              setMenuOpen(v => !v);
            }}
            aria-label="Więcej opcji"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <MoreVertical className="w-3.5 h-3.5" />
          </Button>
          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-8 z-20 w-56 rounded-md border border-border/60 bg-popover/95 backdrop-blur-md shadow-lg p-1"
            >
              <button
                type="button"
                role="menuitem"
                onClick={e => {
                  e.stopPropagation();
                  setMenuOpen(false);
                  onToggleWatched(episode.id, !watched);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-sm text-foreground/90 hover:bg-accent hover:text-accent-foreground"
              >
                <Check className="w-3.5 h-3.5" />
                {watched ? 'Oznacz jako nieobejrzany' : 'Oznacz jako obejrzany'}
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={handleReveal}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-sm text-foreground/90 hover:bg-accent hover:text-accent-foreground"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                Pokaż w eksploratorze
              </button>
              {onRemove && (
                <>
                  <div className="h-px bg-border/60 my-1" />
                  <button
                    type="button"
                    role="menuitem"
                    onClick={e => {
                      e.stopPropagation();
                      setMenuOpen(false);
                      onRemove(episode.id);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-sm text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Usuń z biblioteki
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export { EpisodeRow };
