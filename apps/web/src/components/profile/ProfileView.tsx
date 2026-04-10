import { useEffect, useState, useCallback, useMemo } from 'react';
import { User, ExternalLink, RefreshCw, LogOut, Tv, Eye, Clock, Star, Film } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useProfileStore, startProfileRefresh } from '@/stores/useProfileStore';
import type { UserProfile } from '@shiroani/shared';

// ── Formatters ───────────────────────────────────────────────────

function formatDays(minutes: number): string {
  const days = minutes / 60 / 24;
  return days >= 1 ? `${days.toFixed(1)}` : `${(minutes / 60).toFixed(1)}h`;
}

function formatDaysLabel(minutes: number): string {
  return minutes / 60 / 24 >= 1 ? 'dni' : 'godzin';
}

function formatScore(score: number): string {
  return score > 0 ? score.toFixed(1) : '—';
}

const STATUS_LABELS: Record<string, string> = {
  CURRENT: 'Oglądam',
  COMPLETED: 'Ukończone',
  PLANNING: 'Planowane',
  DROPPED: 'Porzucone',
  PAUSED: 'Wstrzymane',
  REPEATING: 'Powtarzam',
};

const STATUS_COLORS: Record<string, string> = {
  CURRENT: 'var(--status-success)',
  COMPLETED: 'var(--primary)',
  PLANNING: 'var(--status-info)',
  DROPPED: 'var(--destructive)',
  PAUSED: 'var(--status-warning)',
  REPEATING: 'var(--status-info)',
};

const FORMAT_LABELS: Record<string, string> = {
  TV: 'TV',
  TV_SHORT: 'TV Short',
  MOVIE: 'Film',
  SPECIAL: 'Special',
  OVA: 'OVA',
  ONA: 'ONA',
  MUSIC: 'Muzyka',
};

// ── Setup View ───────────────────────────────────────────────────

function ProfileSetup() {
  const [input, setInput] = useState('');
  const setUsername = useProfileStore(s => s.setUsername);
  const isLoading = useProfileStore(s => s.isLoading);
  const error = useProfileStore(s => s.error);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (input.trim()) setUsername(input.trim());
    },
    [input, setUsername]
  );

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <User className="w-7 h-7 text-primary" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">Połącz profil AniList</h2>
          <p className="text-sm text-muted-foreground/70 leading-relaxed">
            Wpisz swoją nazwę użytkownika AniList, aby zobaczyć statystyki oglądania
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Nazwa użytkownika AniList"
            className="h-10 text-sm bg-background/60 border-border-glass text-center"
            autoFocus
          />
          <Button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="w-full h-9 text-sm"
          >
            {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Połącz'}
          </Button>
        </form>

        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    </div>
  );
}

// ── Loading Skeleton ─────────────────────────────────────────────

function ProfileSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto">
      {/* Banner skeleton */}
      <div className="h-40 relative">
        <Skeleton className="absolute inset-0 rounded-none" />
      </div>
      <div className="px-6 -mt-10 space-y-6 pb-20">
        {/* Avatar + name */}
        <div className="flex items-end gap-4">
          <Skeleton className="w-20 h-20 rounded-2xl shrink-0" />
          <div className="space-y-2 pb-1">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
        {/* Stats row */}
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
        {/* Bars */}
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-6 rounded" style={{ width: `${80 - i * 10}%` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Stats Dashboard ──────────────────────────────────────────────

function ProfileDashboard({ profile }: { profile: UserProfile }) {
  const { statistics: stats } = profile;
  const clearProfile = useProfileStore(s => s.clearProfile);
  const fetchProfile = useProfileStore(s => s.fetchProfile);
  const isLoading = useProfileStore(s => s.isLoading);

  const memberSince = profile.createdAt
    ? new Date(profile.createdAt * 1000).toLocaleDateString('pl-PL', {
        year: 'numeric',
        month: 'long',
      })
    : null;

  // Compute max for bar scaling
  const maxGenreCount = Math.max(...stats.genres.map(g => g.count), 1);
  const maxFormatCount = Math.max(...stats.formats.map(f => f.count), 1);
  const maxScoreCount = Math.max(...stats.scores.map(s => s.count), 1);
  const maxStudioCount = Math.max(...stats.studios.map(s => s.count), 1);
  const maxYearCount = Math.max(...stats.releaseYears.map(y => y.count), 1);

  const totalStatusCount = stats.statuses.reduce((sum, s) => sum + s.count, 0) || 1;

  return (
    <div className="flex-1 overflow-y-auto">
      {/* ── Banner + Header ──────────────────────────────── */}
      <div className="relative h-44 overflow-hidden">
        {profile.bannerImage ? (
          <img
            src={profile.bannerImage}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-background" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />

        {/* Action buttons */}
        <div className="absolute top-3 right-4 flex items-center gap-2 z-10">
          <Button
            variant="ghost"
            size="icon"
            className="w-7 h-7 bg-background/40 hover:bg-background/60 text-foreground/70"
            onClick={() => fetchProfile()}
            disabled={isLoading}
            title="Odśwież"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', isLoading && 'animate-spin')} />
          </Button>
          {profile.siteUrl && (
            <Button
              variant="ghost"
              size="icon"
              className="w-7 h-7 bg-background/40 hover:bg-background/60 text-foreground/70"
              onClick={() => window.open(profile.siteUrl, '_blank')}
              title="Otwórz na AniList"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="w-7 h-7 bg-background/40 hover:bg-background/60 text-foreground/70"
            onClick={clearProfile}
            title="Rozłącz profil"
          >
            <LogOut className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* ── Profile info ─────────────────────────────────── */}
      <div className="px-6 -mt-12 relative z-10">
        <div className="flex items-end gap-4 mb-6">
          {profile.avatar ? (
            <img
              src={profile.avatar}
              alt={profile.name}
              className="w-20 h-20 rounded-2xl object-cover border-2 border-background shadow-lg shrink-0"
            />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-muted border-2 border-background flex items-center justify-center shrink-0">
              <User className="w-8 h-8 text-muted-foreground/40" />
            </div>
          )}
          <div className="pb-1 min-w-0">
            <h2 className="text-xl font-bold text-foreground truncate">{profile.name}</h2>
            {memberSince && (
              <p className="text-xs text-muted-foreground/60 mt-0.5">Na AniList od {memberSince}</p>
            )}
          </div>
        </div>

        {/* ── Key metrics row ────────────────────────────── */}
        <div className="grid grid-cols-4 gap-2.5 mb-8">
          <MetricCard icon={<Tv className="w-4 h-4" />} value={stats.count} label="Anime" />
          <MetricCard
            icon={<Eye className="w-4 h-4" />}
            value={stats.episodesWatched}
            label="Odcinki"
          />
          <MetricCard
            icon={<Clock className="w-4 h-4" />}
            value={formatDays(stats.minutesWatched)}
            label={formatDaysLabel(stats.minutesWatched)}
          />
          <MetricCard
            icon={<Star className="w-4 h-4" />}
            value={formatScore(stats.meanScore)}
            label="Średnia"
          />
        </div>

        {/* ── Status distribution ────────────────────────── */}
        {stats.statuses.length > 0 && (
          <section className="mb-8">
            <SectionLabel>Statusy</SectionLabel>
            <div className="flex h-2.5 rounded-full overflow-hidden gap-px bg-muted/20 mb-3">
              {stats.statuses.map(s => {
                const pct = (s.count / totalStatusCount) * 100;
                return (
                  <div
                    key={s.name}
                    className="h-full first:rounded-l-full last:rounded-r-full transition-all duration-700"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: STATUS_COLORS[s.name] ?? 'var(--muted-foreground)',
                      minWidth: s.count > 0 ? 4 : 0,
                    }}
                    title={`${STATUS_LABELS[s.name] ?? s.name}: ${s.count}`}
                  />
                );
              })}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {stats.statuses.map(s => (
                <div key={s.name} className="flex items-center gap-1.5">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: STATUS_COLORS[s.name] ?? 'var(--muted-foreground)' }}
                  />
                  <span className="text-xs text-muted-foreground">
                    {STATUS_LABELS[s.name] ?? s.name}
                  </span>
                  <span className="text-xs font-semibold text-foreground/80">{s.count}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Two-column layout for charts ───────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-8 mb-8">
          {/* Genre distribution */}
          {stats.genres.length > 0 && (
            <section>
              <SectionLabel>Gatunki</SectionLabel>
              <div className="space-y-1.5">
                {stats.genres.map(g => (
                  <BarRow
                    key={g.name}
                    label={g.name}
                    value={g.count}
                    max={maxGenreCount}
                    suffix={`${g.meanScore.toFixed(1)} avg`}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Score distribution */}
          {stats.scores.length > 0 && (
            <section>
              <SectionLabel>Rozkład ocen</SectionLabel>
              <ScoreChart scores={stats.scores} maxCount={maxScoreCount} />
            </section>
          )}

          {/* Format breakdown */}
          {stats.formats.length > 0 && (
            <section>
              <SectionLabel>Formaty</SectionLabel>
              <div className="space-y-1.5">
                {stats.formats.map(f => (
                  <BarRow
                    key={f.name}
                    label={FORMAT_LABELS[f.name] ?? f.name}
                    value={f.count}
                    max={maxFormatCount}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Studios */}
          {stats.studios.length > 0 && (
            <section>
              <SectionLabel>Studia</SectionLabel>
              <div className="space-y-1.5">
                {stats.studios.map(s => (
                  <BarRow
                    key={s.name}
                    label={s.name}
                    value={s.count}
                    max={maxStudioCount}
                    suffix={`${s.meanScore.toFixed(1)} avg`}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Release years */}
          {stats.releaseYears.length > 0 && (
            <section>
              <SectionLabel>Lata premiery</SectionLabel>
              <div className="space-y-1.5">
                {stats.releaseYears.map(y => (
                  <BarRow key={y.year} label={String(y.year)} value={y.count} max={maxYearCount} />
                ))}
              </div>
            </section>
          )}

          {/* Tags */}
          {stats.tags.length > 0 && (
            <section>
              <SectionLabel>Tagi</SectionLabel>
              <div className="flex flex-wrap gap-1.5">
                {stats.tags.map(t => (
                  <span
                    key={t.name}
                    className="px-2.5 py-1 rounded-md text-xs bg-primary/8 text-foreground/70 border border-primary/10"
                    title={`${t.count} anime, avg ${t.meanScore.toFixed(1)}`}
                  >
                    {t.name}
                    <span className="ml-1.5 text-primary/70 font-semibold">{t.count}</span>
                  </span>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* ── Favourites ─────────────────────────────────── */}
        {profile.favourites.length > 0 && (
          <section className="mb-8 pb-20">
            <SectionLabel>Ulubione anime</SectionLabel>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
              {profile.favourites.map(fav => (
                <FavouriteCard key={fav.id} fav={fav} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider mb-3">
      {children}
    </h3>
  );
}

function MetricCard({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
}) {
  return (
    <div className="relative p-3 rounded-xl bg-background/40 border border-border-glass overflow-hidden group">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-primary/60">{icon}</span>
      </div>
      <div className="text-lg font-bold text-foreground tabular-nums leading-none">{value}</div>
      <div className="text-2xs text-muted-foreground/60 mt-1">{label}</div>
    </div>
  );
}

function BarRow({
  label,
  value,
  max,
  suffix,
}: {
  label: string;
  value: number;
  max: number;
  suffix?: string;
}) {
  const pct = (value / max) * 100;
  return (
    <div className="flex items-center gap-3 group">
      <span className="text-xs text-foreground/70 w-24 truncate shrink-0 text-right">{label}</span>
      <div className="flex-1 h-5 rounded bg-muted/15 relative overflow-hidden">
        <div
          className="h-full rounded bg-primary/25 transition-all duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
        <span className="absolute inset-y-0 left-2 flex items-center text-2xs font-semibold text-foreground/60">
          {value}
        </span>
      </div>
      {suffix && <span className="text-2xs text-muted-foreground/40 w-14 shrink-0">{suffix}</span>}
    </div>
  );
}

function ScoreChart({
  scores,
  maxCount,
}: {
  scores: UserProfile['statistics']['scores'];
  maxCount: number;
}) {
  // Fill in missing scores 10-100
  const filled = useMemo(() => {
    const map = new Map(scores.map(s => [s.score, s.count]));
    return Array.from({ length: 10 }, (_, i) => {
      const score = (i + 1) * 10;
      return { score, count: map.get(score) ?? 0 };
    });
  }, [scores]);

  return (
    <div className="flex items-end gap-1 h-28">
      {filled.map(s => {
        const pct = maxCount > 0 ? (s.count / maxCount) * 100 : 0;
        return (
          <div key={s.score} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full relative flex-1 flex items-end">
              <div
                className="w-full rounded-t bg-primary/30 transition-all duration-700 ease-out hover:bg-primary/50"
                style={{ height: `${Math.max(pct, 2)}%` }}
                title={`Ocena ${s.score / 10}: ${s.count} anime`}
              />
            </div>
            <span className="text-[9px] text-muted-foreground/50 tabular-nums leading-none">
              {s.score / 10}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function FavouriteCard({ fav }: { fav: UserProfile['favourites'][number] }) {
  const [imgError, setImgError] = useState(false);
  const title = fav.title.english || fav.title.romaji || fav.title.native || '?';

  return (
    <div className="w-[90px] shrink-0">
      <div className="aspect-[3/4] rounded-lg overflow-hidden border border-border/20 relative">
        {fav.coverImage && !imgError ? (
          <img
            src={fav.coverImage}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full bg-muted/30 flex items-center justify-center">
            <Film className="w-4 h-4 text-muted-foreground/30" />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1.5 pt-4">
          <p className="text-[10px] font-medium text-white leading-tight line-clamp-2">{title}</p>
        </div>
      </div>
    </div>
  );
}

// ── Main View ────────────────────────────────────────────────────

export function ProfileView() {
  const username = useProfileStore(s => s.username);
  const profile = useProfileStore(s => s.profile);
  const isLoading = useProfileStore(s => s.isLoading);
  const initFromStore = useProfileStore(s => s.initFromStore);

  useEffect(() => {
    initFromStore();
    startProfileRefresh();
  }, [initFromStore]);

  const statsEmpty = profile && profile.statistics.count === 0;

  return (
    <div className="flex-1 flex flex-col overflow-hidden animate-fade-in">
      {!username && !isLoading ? (
        <ProfileSetup />
      ) : isLoading && !profile ? (
        <ProfileSkeleton />
      ) : profile && !statsEmpty ? (
        <ProfileDashboard profile={profile} />
      ) : statsEmpty ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">Statystyki tego użytkownika są prywatne</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => useProfileStore.getState().clearProfile()}
            >
              Zmień użytkownika
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
