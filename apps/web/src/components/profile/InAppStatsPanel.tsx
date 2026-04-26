import { useEffect } from 'react';
import { Trash2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { pluralize } from '@shiroani/shared';
import {
  startAppStatsPolling,
  stopAppStatsPolling,
  useAppStatsStore,
} from '@/stores/useAppStatsStore';
import { buildHeroLine, daysSinceCreated, formatPolishDuration } from '@/lib/stats-conversions';
import { ActivityHeatmap } from './ActivityHeatmap';

/**
 * "W aplikacji" tab body — local time-spent stats. Fed by the main-process
 * tracker via the `app-stats:*` IPC channels and refreshed on a 60s poll.
 */
export function InAppStatsPanel() {
  const snapshot = useAppStatsStore(s => s.snapshot);
  const reset = useAppStatsStore(s => s.reset);

  useEffect(() => {
    startAppStatsPolling();
    return () => {
      stopAppStatsPolling();
    };
  }, []);

  const days = daysSinceCreated(snapshot);
  const hero = buildHeroLine(snapshot);
  const { totals } = snapshot;

  const handleReset = () => {
    if (
      typeof window !== 'undefined' &&
      window.confirm('Na pewno wyczyścić wszystkie lokalne statystyki? Nie da się tego cofnąć.')
    ) {
      void reset();
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-7 pt-6 pb-24 flex flex-col gap-6">
      {/* ── Hero block ─────────────────────────────────────── */}
      <section
        className={cn(
          'relative px-6 py-5 rounded-2xl border border-border-glass overflow-hidden',
          'bg-gradient-to-br from-primary/[0.08] via-foreground/[0.02] to-foreground/[0.04]'
        )}
      >
        <div className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-muted-foreground mb-3 flex items-center gap-2">
          <Sparkles className="w-3 h-3 text-primary" />
          <span>Twój czas z ShiroAni</span>
        </div>
        <h2 className="font-sans font-extrabold text-[22px] leading-[1.25] tracking-[-0.02em] text-foreground">
          {hero.primary}
        </h2>
        <p className="mt-2 text-[13px] text-foreground/75">{hero.secondary}</p>
        <div className="mt-3 font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground">
          {pluralize(days, 'dzień', 'dni', 'dni')} z ShiroAni ·{' '}
          {pluralize(totals.sessionCount, 'sesja', 'sesje', 'sesji')}
        </div>
      </section>

      {/* ── Counter cards ──────────────────────────────────── */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <CounterCard
          label="Otwarta aplikacja"
          value={formatPolishDuration(totals.appOpenSeconds)}
          sub="łącznie z minimalizacją"
        />
        <CounterCard
          label="Aktywnie"
          value={formatPolishDuration(totals.appActiveSeconds)}
          sub="okno z fokusem, bez bezczynności"
          tone="accent"
        />
        <CounterCard
          label="Z anime"
          value={formatPolishDuration(totals.animeWatchSeconds)}
          sub="przeglądarka na rozpoznanej stronie"
          tone="gold"
        />
      </section>

      {/* ── Activity heatmap ───────────────────────────────── */}
      <section>
        <SectionHead>Aktywność z ostatnich 12 tygodni</SectionHead>
        <div className="px-4 py-4 rounded-xl border border-border-glass bg-foreground/[0.025]">
          <ActivityHeatmap snapshot={snapshot} weeks={12} metric="active" />
          <p className="mt-3 text-[11.5px] text-muted-foreground/80">
            Każda kratka to jeden dzień. Intensywność pokazuje, ile aktywnego czasu spędziłeś w
            aplikacji.
          </p>
        </div>
      </section>

      {/* ── Streak strip ───────────────────────────────────── */}
      {snapshot.currentStreak.days > 0 && (
        <section className="px-5 py-4 rounded-xl border border-border-glass bg-foreground/[0.025] flex flex-wrap items-baseline gap-x-6 gap-y-2">
          <Stat
            label="Aktualna seria"
            value={pluralize(snapshot.currentStreak.days, 'dzień', 'dni', 'dni')}
            tone="accent"
          />
          <Stat
            label="Najdłuższa"
            value={pluralize(snapshot.longestStreak.days, 'dzień', 'dni', 'dni')}
          />
        </section>
      )}

      {/* ── Reset action ───────────────────────────────────── */}
      <section className="pt-2 border-t border-border-glass/60">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleReset}
          className={cn(
            'h-9 gap-2 px-3 text-[12px] font-medium',
            'text-muted-foreground hover:bg-destructive/15 hover:text-destructive'
          )}
        >
          <Trash2 className="w-3.5 h-3.5" />
          Wyczyść statystyki
        </Button>
        <p className="mt-2 text-[11px] text-muted-foreground/70 leading-relaxed">
          Wszystko liczy się lokalnie — żaden licznik nie opuszcza twojego komputera.
        </p>
      </section>
    </div>
  );
}

function SectionHead({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold flex items-center gap-2.5 mb-3">
      <span>{children}</span>
      <span aria-hidden="true" className="flex-1 h-px bg-border-glass" />
    </h3>
  );
}

function CounterCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: 'accent' | 'gold';
}) {
  return (
    <div className="px-4 py-3.5 rounded-xl bg-foreground/[0.025] border border-border-glass">
      <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground mb-1.5">
        {label}
      </div>
      <div
        className={cn(
          'font-sans font-extrabold text-[22px] tracking-[-0.02em] leading-[1.15] tabular-nums',
          tone === 'accent' && 'text-primary',
          tone === 'gold' && 'text-[oklch(0.8_0.14_70)]',
          !tone && 'text-foreground'
        )}
      >
        {value}
      </div>
      {sub && <div className="text-[11.5px] text-muted-foreground/80 mt-1">{sub}</div>}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'accent' }) {
  return (
    <div className="flex flex-col">
      <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </span>
      <span
        className={cn(
          'font-sans font-extrabold text-[18px] tracking-[-0.02em] tabular-nums',
          tone === 'accent' ? 'text-primary' : 'text-foreground'
        )}
      >
        {value}
      </span>
    </div>
  );
}
