import { useState } from 'react';
import { User, ExternalLink, RefreshCw, LogOut, Tv, Eye, Clock, Star, Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useProfileStore } from '@/stores/useProfileStore';
import { ProfileShareDialog } from './ProfileShareDialog';
import {
  formatDays,
  formatDaysLabel,
  formatScore,
  STATUS_LABELS,
  STATUS_COLORS,
  FORMAT_LABELS,
} from './profile-constants';
import { SectionLabel, MetricCard, BarRow, ScoreChart, FavouriteCard } from './ProfileCharts';
import type { UserProfile } from '@shiroani/shared';

export function ProfileDashboard({ profile }: { profile: UserProfile }) {
  const { statistics: stats } = profile;
  const clearProfile = useProfileStore(s => s.clearProfile);
  const fetchProfile = useProfileStore(s => s.fetchProfile);
  const isLoading = useProfileStore(s => s.isLoading);
  const [shareOpen, setShareOpen] = useState(false);

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
            onClick={() => setShareOpen(true)}
            title="Udostepnij"
          >
            <Share2 className="w-3.5 h-3.5" />
          </Button>
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

      <ProfileShareDialog open={shareOpen} onOpenChange={setShareOpen} profile={profile} />
    </div>
  );
}
