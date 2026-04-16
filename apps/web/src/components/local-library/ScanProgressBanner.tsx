import { Loader2, X } from 'lucide-react';
import type { LocalLibraryScanPhase } from '@shiroani/shared';
import { Button } from '@/components/ui/button';
import { ProgressBar } from '@/components/ui/progress-bar';
import type { ScanProgressSnapshot } from '@/stores/useLocalLibraryStore';

interface ScanProgressBannerProps {
  rootPath: string;
  rootLabel: string | null;
  progress: ScanProgressSnapshot;
  onCancel: () => void;
}

/** Phase → Polish UI label. Kept here next to the banner so adding a new
 *  phase in the worker is a single-file change on the renderer. */
const PHASE_LABELS: Record<LocalLibraryScanPhase, string> = {
  starting: 'Uruchamianie skanu…',
  discovering: 'Wyszukiwanie plików',
  parsing: 'Analiza nazw',
  probing: 'Analiza mediów',
  persisting: 'Zapisywanie wyników',
  cleanup: 'Porządkowanie',
  done: 'Zakończono',
};

function shortenPath(p: string | null, maxLen = 60): string {
  if (!p) return '';
  if (p.length <= maxLen) return p;
  return '…' + p.slice(-(maxLen - 1));
}

/**
 * Renders a compact running-scan strip above the roots list. Purposefully
 * minimal — Phase 3 owns the real grid, this is just status feedback so the
 * user knows *something* is happening after they click "Add Folder".
 */
export function ScanProgressBanner({
  rootPath,
  rootLabel,
  progress,
  onCancel,
}: ScanProgressBannerProps) {
  const { phase, filesDone, filesTotal, filesSkipped, currentPath, error } = progress;
  const indeterminate = phase === 'starting' || phase === 'discovering' || filesTotal === 0;
  const pct = indeterminate ? undefined : (filesDone / Math.max(filesTotal, 1)) * 100;
  const isError = Boolean(error);

  return (
    <div
      className={
        isError
          ? 'rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-xs'
          : 'rounded-lg border border-border/60 bg-card/40 px-3 py-2.5 text-xs'
      }
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-2.5">
        {isError ? (
          <X className="w-3.5 h-3.5 shrink-0 text-destructive" aria-hidden />
        ) : (
          <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin text-primary" aria-hidden />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 truncate font-medium text-foreground/90" title={rootPath}>
              {rootLabel ?? rootPath}
            </div>
            {!isError && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[11px] text-muted-foreground/80 hover:text-destructive"
                onClick={onCancel}
              >
                Anuluj
              </Button>
            )}
          </div>
          <div className="text-[11px] text-muted-foreground/80">
            {isError ? (
              <span className="text-destructive/90">{error}</span>
            ) : (
              <>
                <span>{PHASE_LABELS[phase] ?? phase}</span>
                {filesTotal > 0 && (
                  <span>
                    {' · '}
                    {filesDone} / {filesTotal}
                    {filesSkipped > 0 && (
                      <span className="text-muted-foreground/60">
                        {' '}
                        ({filesSkipped} pominiętych)
                      </span>
                    )}
                  </span>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      {!isError && (
        <div className="mt-2 flex items-center gap-2">
          <ProgressBar value={pct} indeterminate={indeterminate} className="h-1.5" />
        </div>
      )}
      {!isError && currentPath && (
        <div className="mt-1 truncate text-[10px] text-muted-foreground/60" title={currentPath}>
          {shortenPath(currentPath)}
        </div>
      )}
    </div>
  );
}
