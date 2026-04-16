import { FolderPlus, HardDrive, RefreshCw } from 'lucide-react';
import { TooltipButton } from '@/components/ui/tooltip-button';
import { FfmpegStatusBadge } from '../ffmpeg/FfmpegStatusBadge';

interface LibraryHeaderProps {
  seriesCount: number;
  hasRoots: boolean;
  isAddingRoot: boolean;
  isAnyScanRunning: boolean;
  onAddFolder: () => void;
  onRescanAll: () => void;
  onOpenFfmpegSetup: () => void;
}

/**
 * Top strip of the library grid. Mirrors the spacing / typography of the
 * AniList tracker `ViewHeader` for visual consistency, but hand-rolled here
 * because the local-library actions differ (rescan-all, ffmpeg badge).
 */
export function LibraryHeader({
  seriesCount,
  hasRoots,
  isAddingRoot,
  isAnyScanRunning,
  onAddFolder,
  onRescanAll,
  onOpenFfmpegSetup,
}: LibraryHeaderProps) {
  const subtitle =
    seriesCount > 0 ? `${seriesCount} ${pluralizeSeries(seriesCount)}` : 'Importuj folder z anime';

  return (
    <div className="shrink-0 px-5 pt-4 pb-3 space-y-3 border-b border-border/60 bg-card/20 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <HardDrive className="w-4 h-4 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-semibold text-foreground leading-tight">
              Biblioteka lokalna
            </h1>
            <p className="text-xs text-muted-foreground/70 leading-tight truncate">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <FfmpegStatusBadge onClick={onOpenFfmpegSetup} />
          {hasRoots && (
            <TooltipButton
              variant="ghost"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={onRescanAll}
              disabled={isAnyScanRunning}
              tooltip="Przeskanuj wszystkie foldery"
            >
              <RefreshCw
                className={isAnyScanRunning ? 'w-3.5 h-3.5 animate-spin' : 'w-3.5 h-3.5'}
              />
              Przeskanuj
            </TooltipButton>
          )}
          <TooltipButton
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={onAddFolder}
            disabled={isAddingRoot}
            tooltip="Dodaj kolejny folder"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            Dodaj folder
          </TooltipButton>
        </div>
      </div>
    </div>
  );
}

function pluralizeSeries(n: number): string {
  // Polish: 1 seria / 2-4 serie / 5+ serii
  if (n === 1) return 'seria';
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'serie';
  return 'serii';
}
