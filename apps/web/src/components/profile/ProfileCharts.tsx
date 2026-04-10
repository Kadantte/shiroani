import { useState, useMemo } from 'react';
import { Film } from 'lucide-react';
import type { UserProfile } from '@shiroani/shared';

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider mb-3">
      {children}
    </h3>
  );
}

export function MetricCard({
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

export function BarRow({
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

export function ScoreChart({
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

export function FavouriteCard({ fav }: { fav: UserProfile['favourites'][number] }) {
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
