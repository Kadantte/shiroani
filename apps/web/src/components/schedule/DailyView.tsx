import { Calendar } from 'lucide-react';
import { AiringEntry } from './AiringEntry';
import type { AiringAnime } from '@shiroani/shared';

export interface DailyViewProps {
  entries: AiringAnime[];
}

export function DailyView({ entries }: DailyViewProps) {
  return (
    <div className="flex-1 overflow-y-auto p-4 pb-20 space-y-2">
      {entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
          <div className="w-14 h-14 rounded-2xl bg-muted/40 border border-border-glass flex items-center justify-center">
            <Calendar className="w-6 h-6 opacity-30" />
          </div>
          <div className="text-center space-y-1">
            <p className="text-sm font-medium text-foreground/70">Brak anime na ten dzien</p>
            <p className="text-xs text-muted-foreground/50">
              Sprobuj innego dnia lub widoku tygodniowego
            </p>
          </div>
        </div>
      ) : (
        entries.map(anime => <AiringEntry key={`${anime.id}-${anime.episode}`} anime={anime} />)
      )}
    </div>
  );
}
