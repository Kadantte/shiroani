import { useMemo } from 'react';
import { BarChart3, Eye, Star, Tv } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { STATUS_CONFIG } from '@/lib/constants';
import type { AnimeStatus } from '@shiroani/shared';

const STATUS_ORDER: AnimeStatus[] = [
  'watching',
  'completed',
  'plan_to_watch',
  'on_hold',
  'dropped',
];

/** Color mapping for inline styles (used by the segmented bar). */
const STATUS_HEX: Record<AnimeStatus, string> = {
  watching: '#3b82f6',
  completed: '#22c55e',
  plan_to_watch: '#eab308',
  on_hold: '#f97316',
  dropped: '#ef4444',
};

export function LibraryStats() {
  const entries = useLibraryStore(s => s.entries);

  const stats = useMemo(() => {
    const totalEntries = entries.length;

    const totalEpisodes = entries.reduce((sum, e) => sum + e.currentEpisode, 0);

    const breakdown: Record<AnimeStatus, number> = {
      watching: 0,
      completed: 0,
      plan_to_watch: 0,
      on_hold: 0,
      dropped: 0,
    };
    for (const entry of entries) {
      breakdown[entry.status]++;
    }

    const scored = entries.filter(e => e.score != null && e.score > 0);
    const avgScore =
      scored.length > 0 ? scored.reduce((sum, e) => sum + (e.score ?? 0), 0) / scored.length : 0;

    return { totalEntries, totalEpisodes, breakdown, avgScore, scoredCount: scored.length };
  }, [entries]);

  const hasEntries = stats.totalEntries > 0;

  return (
    <div className="space-y-4 px-6 py-4 border-b border-border bg-card/20">
      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-3">
        <StatCard icon={<Tv className="w-4 h-4" />} label="Razem" value={stats.totalEntries} />
        <StatCard icon={<Eye className="w-4 h-4" />} label="Odcinki" value={stats.totalEpisodes} />
        <StatCard
          icon={<Star className="w-4 h-4" />}
          label="Srednia ocena"
          value={stats.avgScore > 0 ? stats.avgScore.toFixed(1) : '—'}
          subtitle={stats.scoredCount > 0 ? `z ${stats.scoredCount} ocen` : undefined}
        />
        <StatCard
          icon={<BarChart3 className="w-4 h-4" />}
          label="Ogladam"
          value={stats.breakdown.watching}
        />
      </div>

      {/* Segmented status bar */}
      {hasEntries && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Rozklad statusow</p>
          <div className="flex h-3 rounded-full overflow-hidden bg-muted/50">
            {STATUS_ORDER.map(status => {
              const count = stats.breakdown[status];
              if (count === 0) return null;
              const percent = (count / stats.totalEntries) * 100;
              return (
                <div
                  key={status}
                  className="h-full transition-all duration-300 first:rounded-l-full last:rounded-r-full"
                  style={{
                    width: `${percent}%`,
                    backgroundColor: STATUS_HEX[status],
                    minWidth: count > 0 ? '4px' : 0,
                  }}
                  title={`${STATUS_CONFIG[status].label}: ${count}`}
                />
              );
            })}
          </div>
          {/* Legend */}
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {STATUS_ORDER.map(status => {
              const count = stats.breakdown[status];
              if (count === 0) return null;
              return (
                <div key={status} className="flex items-center gap-1.5">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: STATUS_HEX[status] }}
                  />
                  <span className="text-2xs text-muted-foreground">
                    {STATUS_CONFIG[status].label}{' '}
                    <span className="font-medium text-foreground/80">{count}</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  subtitle,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtitle?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-1 p-3 rounded-lg',
        'bg-background/50 border border-border/50'
      )}
    >
      <div className="flex items-center gap-1.5 text-muted-foreground">{icon}</div>
      <span className="text-lg font-semibold text-foreground leading-none">{value}</span>
      <span className="text-2xs text-muted-foreground">{label}</span>
      {subtitle && <span className="text-2xs text-muted-foreground/60">{subtitle}</span>}
    </div>
  );
}
