import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Image as ImageIcon,
  MoreVertical,
  Play,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import type {
  LocalEpisode,
  LocalSeries,
  PosterKind,
  SeriesProgressSummary,
} from '@shiroani/shared';
import { PosterImage } from '../posters/PosterImage';
import { PosterPickerDialog } from '../posters/PosterPickerDialog';
import { useLocalLibraryStore } from '@/stores/useLocalLibraryStore';

interface SeriesHeroProps {
  series: LocalSeries;
  summary: SeriesProgressSummary | undefined;
  resumeEpisode: LocalEpisode | null;
  primaryEpisode: LocalEpisode | null;
  totalDurationSeconds: number;
  onBack: () => void;
  onPlay: (episodeId: number) => void;
  onMarkAllWatched: () => void;
  onMarkAllUnwatched: () => void;
}

function formatDurationHoursMinutes(totalSeconds: number): string {
  if (!totalSeconds || totalSeconds <= 0) return '—';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.round((totalSeconds % 3600) / 60);
  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours} h`;
  return `${hours} h ${minutes} min`;
}

function formatEpisodeLabel(episode: LocalEpisode): string {
  const s = episode.parsedSeason ?? 1;
  const e = episode.parsedEpisodeNumber;
  if (e === null) return `S${String(s).padStart(2, '0')}`;
  return `S${String(s).padStart(2, '0')}E${String(e).padStart(2, '0')}`;
}

function formatPosition(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function hueOf(title: string): number {
  let hash = 0;
  for (let i = 0; i < title.length; i += 1) {
    hash = (hash * 31 + title.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % 360;
}

export function SeriesHero({
  series,
  summary,
  resumeEpisode,
  primaryEpisode,
  totalDurationSeconds,
  onBack,
  onPlay,
  onMarkAllWatched,
  onMarkAllUnwatched,
}: SeriesHeroProps) {
  const title = series.displayTitle ?? series.parsedTitle;
  const hue = hueOf(title);
  const hasBanner = !!series.bannerPath || !!series.posterPath;

  const removeArtwork = useLocalLibraryStore(s => s.removeSeriesArtwork);
  const removeSeriesFromLibrary = useLocalLibraryStore(s => s.removeSeriesFromLibrary);

  const [menuOpen, setMenuOpen] = useState(false);
  const [pickerKind, setPickerKind] = useState<PosterKind | null>(null);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

  const handleChangeArtwork = useCallback((kind: PosterKind) => {
    setMenuOpen(false);
    setPickerKind(kind);
  }, []);

  const handleRemoveArtwork = useCallback(
    async (kind: PosterKind) => {
      setMenuOpen(false);
      try {
        await removeArtwork(series.id, kind);
        toast.success(kind === 'poster' ? 'Plakat usunięty.' : 'Baner usunięty.');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : String(err));
      }
    },
    [removeArtwork, series.id]
  );

  const handleConfirmRemoveFromLibrary = useCallback(async () => {
    setRemoveDialogOpen(false);
    try {
      await removeSeriesFromLibrary(series.id);
      toast.success('Usunięto z biblioteki.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }, [removeSeriesFromLibrary, series.id]);

  const hasResume =
    resumeEpisode &&
    summary?.resumePositionSeconds !== null &&
    summary?.resumePositionSeconds !== undefined &&
    summary?.resumeDurationSeconds !== null &&
    summary?.resumeDurationSeconds !== undefined &&
    summary.resumeDurationSeconds > 0;

  const watchedCount = summary?.watchedCount ?? 0;
  const totalCount = summary?.totalCount ?? 0;
  const allWatched = totalCount > 0 && watchedCount >= totalCount;

  const targetEpisode = hasResume ? resumeEpisode : primaryEpisode;

  const primaryLabel = (() => {
    if (!targetEpisode) return 'Brak odcinków';
    if (hasResume && summary && resumeEpisode) {
      const pos = formatPosition(summary.resumePositionSeconds);
      return `Wznów ${formatEpisodeLabel(resumeEpisode)} • ${pos}`;
    }
    return `Odtwórz ${formatEpisodeLabel(targetEpisode)}`;
  })();

  return (
    <div className="relative">
      <div
        className="relative h-[240px] overflow-hidden"
        style={{
          background: `linear-gradient(135deg, hsl(${hue}, 40%, 22%) 0%, hsl(${(hue + 60) % 360}, 35%, 14%) 100%)`,
        }}
      >
        {hasBanner && (
          <>
            <div className="absolute inset-0 scale-110 blur-3xl opacity-45">
              <PosterImage series={series} kind="banner" fallbackToPoster alt="" />
            </div>
            <div className="absolute inset-0 opacity-80">
              <PosterImage series={series} kind="banner" fallbackToPoster alt="" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-background/92 via-background/58 to-background/32" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/62 to-background/12" />
          </>
        )}
        {!hasBanner && (
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        )}

        {/* Back button */}
        <div className="absolute top-4 left-4">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs bg-background/40 backdrop-blur-sm border border-border/50 hover:bg-background/70"
            onClick={onBack}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Biblioteka
          </Button>
        </div>

        {/* Ellipsis menu: change/remove poster + banner */}
        <div className="absolute top-4 right-4" ref={menuRef}>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs bg-background/40 backdrop-blur-sm border border-border/50 hover:bg-background/70"
            onClick={() => setMenuOpen(v => !v)}
            aria-label="Opcje grafiki"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <MoreVertical className="w-3.5 h-3.5" />
          </Button>
          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-9 z-20 w-56 rounded-md border border-border/60 bg-popover/95 backdrop-blur-md shadow-lg p-1"
            >
              <MenuItem
                icon={<ImageIcon className="w-3.5 h-3.5" />}
                label="Zmień plakat"
                onClick={() => handleChangeArtwork('poster')}
              />
              <MenuItem
                icon={<ImageIcon className="w-3.5 h-3.5" />}
                label="Zmień baner"
                onClick={() => handleChangeArtwork('banner')}
              />
              {series.posterPath && (
                <MenuItem
                  icon={<Trash2 className="w-3.5 h-3.5" />}
                  label="Usuń plakat"
                  onClick={() => void handleRemoveArtwork('poster')}
                  destructive
                />
              )}
              {series.bannerPath && (
                <MenuItem
                  icon={<Trash2 className="w-3.5 h-3.5" />}
                  label="Usuń baner"
                  onClick={() => void handleRemoveArtwork('banner')}
                  destructive
                />
              )}
              <MenuItem
                icon={<Trash2 className="w-3.5 h-3.5" />}
                label="Usuń z biblioteki"
                onClick={() => {
                  setMenuOpen(false);
                  setRemoveDialogOpen(true);
                }}
                destructive
              />
            </div>
          )}
        </div>
      </div>

      {/* Meta block overlapping the banner's bottom edge */}
      <div className="px-6 -mt-16 relative z-10">
        <div className="flex items-end gap-5">
          {/* Poster */}
          <div className="shrink-0 w-[140px] aspect-[3/4] rounded-lg overflow-hidden border border-border/60 shadow-xl bg-card/80">
            <PosterImage series={series} kind="poster" />
          </div>

          <div className="flex-1 min-w-0 pb-2">
            <h1 className="text-2xl font-semibold text-foreground leading-tight truncate">
              {title}
            </h1>
            {series.parsedTitle !== title && (
              <p className="text-xs text-muted-foreground/70 mt-0.5 truncate">
                {series.parsedTitle}
              </p>
            )}
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground/80">
              {series.year && <span>{series.year}</span>}
              {series.year && <span className="opacity-40">•</span>}
              <span>
                {totalCount} {pluralizeEpisodes(totalCount)}
              </span>
              {totalDurationSeconds > 0 && (
                <>
                  <span className="opacity-40">•</span>
                  <span>{formatDurationHoursMinutes(totalDurationSeconds)}</span>
                </>
              )}
              {series.matchStatus === 'unmatched' && (
                <>
                  <span className="opacity-40">•</span>
                  <span className="text-amber-400/80">Niedopasowane</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-4 flex-wrap">
          <Button
            variant="default"
            size="default"
            className="gap-2 min-w-[180px]"
            onClick={() => targetEpisode && onPlay(targetEpisode.id)}
            disabled={!targetEpisode}
          >
            <Play className="w-4 h-4" fill="currentColor" />
            {primaryLabel}
          </Button>
          <Button
            variant="outline"
            size="default"
            className={cn('gap-2', allWatched && 'border-primary/40 text-primary')}
            onClick={allWatched ? onMarkAllUnwatched : onMarkAllWatched}
            disabled={totalCount === 0}
          >
            {allWatched ? (
              <>
                <Circle className="w-4 h-4" />
                Oznacz jako nieobejrzane
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Oznacz wszystkie
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="default"
            className="gap-2"
            onClick={() => handleChangeArtwork('poster')}
          >
            <ImageIcon className="w-4 h-4" />
            Zmień plakat
          </Button>
        </div>
      </div>

      {pickerKind && (
        <PosterPickerDialog
          seriesId={series.id}
          kind={pickerKind}
          open
          onClose={() => setPickerKind(null)}
          initialQuery={title}
        />
      )}

      <ConfirmDialog
        open={removeDialogOpen}
        onOpenChange={setRemoveDialogOpen}
        title="Usunąć z biblioteki?"
        description="Seria zniknie z aplikacji wraz z zapisanym postępem oglądania. Pliki wideo na dysku nie zostaną usunięte — przy następnym skanowaniu katalogu seria może pojawić się ponownie."
        confirmLabel="Usuń z biblioteki"
        cancelLabel="Anuluj"
        onConfirm={() => void handleConfirmRemoveFromLibrary()}
        variant="destructive"
      />
    </div>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
  destructive = false,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-sm transition-colors',
        destructive
          ? 'text-destructive hover:bg-destructive/10'
          : 'text-foreground/90 hover:bg-accent hover:text-accent-foreground'
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function pluralizeEpisodes(n: number): string {
  if (n === 1) return 'odcinek';
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'odcinki';
  return 'odcinków';
}
