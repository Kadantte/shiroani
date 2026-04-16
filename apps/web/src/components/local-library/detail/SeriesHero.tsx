import { ArrowLeft, CheckCircle2, Circle, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { LocalEpisode, LocalSeries, SeriesProgressSummary } from '@shiroani/shared';

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
  const bannerUrl = series.bannerPath ?? series.posterPath;
  const hue = hueOf(title);

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
        {bannerUrl && (
          <>
            <img
              src={bannerUrl}
              alt=""
              aria-hidden
              className="absolute inset-0 w-full h-full object-cover scale-110 blur-md opacity-70"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background/30" />
          </>
        )}
        {!bannerUrl && (
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
      </div>

      {/* Meta block overlapping the banner's bottom edge */}
      <div className="px-6 -mt-16 relative z-10">
        <div className="flex items-end gap-5">
          {/* Poster */}
          <div className="shrink-0 w-[140px] aspect-[3/4] rounded-lg overflow-hidden border border-border/60 shadow-xl bg-card/80">
            {series.posterPath ? (
              <img src={series.posterPath} alt={title} className="w-full h-full object-cover" />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center"
                style={{
                  background: `linear-gradient(135deg, hsl(${hue}, 45%, 28%) 0%, hsl(${(hue + 40) % 360}, 35%, 18%) 100%)`,
                }}
              >
                <span className="text-2xl font-semibold text-foreground/80">
                  {title
                    .split(/\s+/)
                    .filter(Boolean)
                    .slice(0, 2)
                    .map(w => w[0])
                    .join('')
                    .toUpperCase()}
                </span>
              </div>
            )}
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
        </div>
      </div>
    </div>
  );
}

function pluralizeEpisodes(n: number): string {
  if (n === 1) return 'odcinek';
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'odcinki';
  return 'odcinków';
}
