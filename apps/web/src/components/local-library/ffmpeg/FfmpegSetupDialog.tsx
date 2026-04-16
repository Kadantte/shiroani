import { useCallback, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  HardDrive,
  Info,
  Loader2,
  RotateCcw,
  Terminal,
  Trash2,
  XCircle,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ProgressBar } from '@/components/ui/progress-bar';
import { useFfmpegStore } from '@/stores/useFfmpegStore';
import type { FfmpegInstallPhase } from '@shiroani/shared';
import { FfmpegSystemPathDialog } from './FfmpegSystemPathDialog';
import { formatBytes, formatEta, formatSpeed } from './format';

const PHASE_LABEL: Record<FfmpegInstallPhase, string> = {
  idle: '',
  resolve: 'Przygotowywanie...',
  download: 'Pobieranie...',
  verify: 'Weryfikacja pliku...',
  extract: 'Rozpakowywanie...',
  finalize: 'Zapisywanie...',
  done: 'Gotowe',
  failed: 'Błąd',
  cancelled: 'Anulowano',
};

const ACTIVE_PHASES: ReadonlySet<FfmpegInstallPhase> = new Set([
  'resolve',
  'download',
  'verify',
  'extract',
  'finalize',
]);

interface FfmpegSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Fires once when an install finishes successfully OR the user saves a
   * system path. Used by callers that gated a destination flow on FFmpeg
   * (e.g. "Add Folder" continuing after install).
   */
  onReady?: () => void;
}

/**
 * First-run FFmpeg setup. The dialog has five derived visual states that map
 * onto the installer's progress phases + the current persisted status:
 *
 *   - `idle`      (installer idle + not installed)
 *   - `installing` (resolve/download/verify/extract/finalize)
 *   - `installed`  (installer idle + installed)
 *   - `failed`     (last attempt failed, still not installed)
 *   - `cancelled`  (last attempt cancelled, still not installed)
 *
 * Design goals:
 *   - Downloads are the primary option, but "use system ffmpeg" is always
 *     reachable — some users already have it installed and would resent a
 *     90 MB re-download.
 *   - Dialog is non-dismissable during active install (user cancels via the
 *     explicit Cancel button) to avoid orphaned download processes if the
 *     user accidentally clicks outside.
 */
export function FfmpegSetupDialog({ open, onOpenChange, onReady }: FfmpegSetupDialogProps) {
  const status = useFfmpegStore(s => s.status);
  const progress = useFfmpegStore(s => s.progress);
  const lastError = useFfmpegStore(s => s.lastError);
  const install = useFfmpegStore(s => s.install);
  const cancel = useFfmpegStore(s => s.cancel);
  const uninstall = useFfmpegStore(s => s.uninstall);
  const clearSystemPaths = useFfmpegStore(s => s.clearSystemPaths);

  const [systemPathOpen, setSystemPathOpen] = useState(false);
  const [showExplainer, setShowExplainer] = useState(false);

  const isInstalling = ACTIVE_PHASES.has(progress.phase);

  // Pick one visual state so the render body only has to handle five mutually
  // exclusive branches. `isInstalling` wins over anything else because it
  // represents a transient, recoverable state.
  const view: 'installing' | 'installed' | 'failed' | 'cancelled' | 'idle' = useMemo(() => {
    if (isInstalling) return 'installing';
    if (status.installed) return 'installed';
    if (progress.phase === 'failed') return 'failed';
    if (progress.phase === 'cancelled') return 'cancelled';
    return 'idle';
  }, [isInstalling, status.installed, progress.phase]);

  const handleInstall = useCallback(() => {
    void install();
  }, [install]);

  const handleCancel = useCallback(() => {
    void cancel();
  }, [cancel]);

  const handleUninstall = useCallback(() => {
    void uninstall();
  }, [uninstall]);

  const handleClearSystem = useCallback(() => {
    void clearSystemPaths();
  }, [clearSystemPaths]);

  const handleSystemSaved = useCallback(() => {
    onReady?.();
  }, [onReady]);

  // Block dismissing the dialog mid-download so accidental outside-clicks
  // don't orphan the install. Users can always press Cancel.
  const handleOpenChange = useCallback(
    (value: boolean) => {
      if (!value && isInstalling) return;
      onOpenChange(value);
    },
    [isInstalling, onOpenChange]
  );

  // Fire the "ready" callback once when the install finishes successfully.
  // The dialog stays open so the user can see confirmation — they close it
  // explicitly.
  const wasInstalled = status.installed;
  const installDoneWithoutHandler = view === 'installed' && progress.phase === 'done';
  if (installDoneWithoutHandler && wasInstalled) {
    // We call onReady inline (render-phase safe because it's idempotent per
    // caller and wrapped in a check). Guarded with a ref would be preferable
    // in a larger app, but keeps the component simpler here.
    queueMicrotask(() => onReady?.());
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-primary" />
              FFmpeg dla biblioteki lokalnej
            </DialogTitle>
            <DialogDescription>
              {view === 'installed'
                ? 'FFmpeg jest gotowy — możesz skanować i odtwarzać pliki.'
                : 'Potrzebujemy FFmpeg do odczytu metadanych (MKV, HEVC) i odtwarzania.'}
            </DialogDescription>
          </DialogHeader>

          {view === 'idle' && (
            <IdleBody
              bundledSupported={status.bundledSupported}
              showExplainer={showExplainer}
              onToggleExplainer={() => setShowExplainer(s => !s)}
              onInstall={handleInstall}
              onUseSystem={() => setSystemPathOpen(true)}
            />
          )}

          {view === 'installing' && (
            <InstallingBody
              phase={progress.phase}
              bytes={progress.bytes}
              total={progress.total}
              speed={progress.speed}
              detail={progress.detail}
            />
          )}

          {view === 'installed' && <InstalledBody status={status} />}

          {view === 'failed' && (
            <FailureBody
              title="Instalacja nie powiodła się"
              message={lastError ?? progress.detail ?? 'Nieznany błąd.'}
            />
          )}

          {view === 'cancelled' && (
            <FailureBody
              title="Instalacja anulowana"
              message="Pobieranie zostało przerwane. Możesz spróbować ponownie w dowolnej chwili."
              tone="neutral"
            />
          )}

          <DialogFooter>
            {view === 'installing' && (
              <Button variant="outline" onClick={handleCancel}>
                <XCircle className="w-4 h-4" />
                Anuluj
              </Button>
            )}

            {(view === 'failed' || view === 'cancelled') && (
              <>
                <Button variant="ghost" onClick={() => setSystemPathOpen(true)}>
                  <Terminal className="w-4 h-4" />
                  Użyj systemowego
                </Button>
                <Button onClick={handleInstall}>
                  <RotateCcw className="w-4 h-4" />
                  Spróbuj ponownie
                </Button>
              </>
            )}

            {view === 'installed' && (
              <>
                {status.mode === 'bundled' ? (
                  <Button variant="ghost" onClick={handleUninstall}>
                    <Trash2 className="w-4 h-4" />
                    Odinstaluj
                  </Button>
                ) : (
                  <Button variant="ghost" onClick={handleClearSystem}>
                    <XCircle className="w-4 h-4" />
                    Zapomnij ścieżki
                  </Button>
                )}
                <Button variant="outline" onClick={() => setSystemPathOpen(true)}>
                  <Terminal className="w-4 h-4" />
                  {status.mode === 'system' ? 'Zmień ścieżki' : 'Użyj systemowego'}
                </Button>
                <Button onClick={() => onOpenChange(false)}>Zamknij</Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <FfmpegSystemPathDialog
        open={systemPathOpen}
        onOpenChange={setSystemPathOpen}
        onSaved={handleSystemSaved}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Body variants
// ---------------------------------------------------------------------------

interface IdleBodyProps {
  bundledSupported: boolean;
  showExplainer: boolean;
  onToggleExplainer: () => void;
  onInstall: () => void;
  onUseSystem: () => void;
}

function IdleBody({
  bundledSupported,
  showExplainer,
  onToggleExplainer,
  onInstall,
  onUseSystem,
}: IdleBodyProps) {
  return (
    <div className="space-y-4 py-2">
      <div className="grid gap-3">
        <button
          type="button"
          onClick={onInstall}
          disabled={!bundledSupported}
          className="group flex items-start gap-3 rounded-xl border border-primary/25 bg-primary/5 p-4 text-left transition-colors hover:bg-primary/10 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Download className="h-5 w-5" />
          </div>
          <div className="flex-1 space-y-1">
            <p className="text-sm font-semibold text-foreground">Zainstaluj FFmpeg (zalecane)</p>
            <p className="text-xs text-muted-foreground/80 leading-snug">
              {bundledSupported
                ? 'Pobierze ok. 90 MB i zapisze w danych aplikacji. Jednorazowo.'
                : 'Niedostępne dla Twojej platformy — skorzystaj z opcji poniżej.'}
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={onUseSystem}
          className="group flex items-start gap-3 rounded-xl border border-border/80 bg-card/40 p-4 text-left transition-colors hover:bg-card/70 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground">
            <Terminal className="h-5 w-5" />
          </div>
          <div className="flex-1 space-y-1">
            <p className="text-sm font-semibold text-foreground">Użyj systemowego FFmpeg</p>
            <p className="text-xs text-muted-foreground/80 leading-snug">
              Masz już zainstalowanego FFmpeg (np. z Homebrew, Scoop)? Wskaż pliki i użyjemy ich.
            </p>
          </div>
        </button>
      </div>

      <div>
        <button
          type="button"
          onClick={onToggleExplainer}
          className="flex items-center gap-1.5 text-xs text-muted-foreground/70 hover:text-foreground transition-colors"
        >
          <Info className="w-3.5 h-3.5" />
          {showExplainer ? 'Ukryj szczegóły' : 'Po co ShiroAni potrzebuje FFmpeg?'}
        </button>
        {showExplainer && (
          <p className="mt-2 text-xs text-muted-foreground/80 leading-relaxed">
            Większość plików anime to kontenery MKV z wieloma ścieżkami audio/napisów i kodekiem
            HEVC. Przeglądarki nie odtwarzają ich natywnie, a parser metadanych (czas, rozdziały)
            pochodzi z <code>ffprobe</code>. FFmpeg to otwarte narzędzie linii komend — nie łączy
            się z siecią, nie zbiera telemetrii.
          </p>
        )}
      </div>
    </div>
  );
}

interface InstallingBodyProps {
  phase: FfmpegInstallPhase;
  bytes: number;
  total: number;
  speed: number;
  detail?: string;
}

function InstallingBody({ phase, bytes, total, speed, detail }: InstallingBodyProps) {
  const percent = total > 0 ? (bytes / total) * 100 : 0;
  const eta = formatEta(bytes, total, speed);
  // Only the download phase has a known total; everything else is a
  // short "spinning" indicator.
  const indeterminate = phase !== 'download';

  return (
    <div className="space-y-4 py-2">
      <div className="flex items-center gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">{PHASE_LABEL[phase]}</p>
          {detail && (
            <p className="text-xs text-muted-foreground/70 truncate" title={detail}>
              {detail}
            </p>
          )}
        </div>
      </div>

      <ProgressBar value={percent} indeterminate={indeterminate} />

      <div className="flex items-center justify-between text-xs text-muted-foreground/80 tabular-nums">
        <span>
          {phase === 'download' && total > 0
            ? `${formatBytes(bytes)} / ${formatBytes(total)}`
            : phase === 'download'
              ? formatBytes(bytes)
              : '—'}
        </span>
        <span>
          {phase === 'download' ? formatSpeed(speed) : ''}
          {eta ? `  •  ${eta}` : ''}
        </span>
      </div>
    </div>
  );
}

function InstalledBody({
  status,
}: {
  status: { mode: string; ffmpegPath: string | null; version: string | null };
}) {
  return (
    <div className="space-y-3 py-2">
      <div className="flex items-center gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-4">
        <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
        <div className="space-y-0.5 min-w-0">
          <p className="text-sm font-medium text-foreground">
            {status.mode === 'bundled'
              ? 'FFmpeg zainstalowany w danych aplikacji'
              : 'Używasz systemowego FFmpeg'}
          </p>
          <p
            className="text-xs text-muted-foreground/70 font-mono truncate"
            title={status.ffmpegPath ?? ''}
          >
            {status.ffmpegPath ?? '—'}
          </p>
        </div>
      </div>
      {status.version && (
        <p className="text-xs text-muted-foreground/70">
          Wersja: <code className="text-foreground/80">{status.version}</code>
        </p>
      )}
    </div>
  );
}

function FailureBody({
  title,
  message,
  tone = 'error',
}: {
  title: string;
  message: string;
  tone?: 'error' | 'neutral';
}) {
  const classes =
    tone === 'error'
      ? 'border-destructive/30 bg-destructive/5 text-destructive'
      : 'border-border/60 bg-card/40 text-foreground';
  const Icon = tone === 'error' ? AlertCircle : Info;
  return (
    <div className="py-2">
      <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${classes}`}>
        <Icon className="w-5 h-5 shrink-0 mt-0.5" />
        <div className="space-y-1 min-w-0">
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs opacity-80 break-words">{message}</p>
        </div>
      </div>
    </div>
  );
}
