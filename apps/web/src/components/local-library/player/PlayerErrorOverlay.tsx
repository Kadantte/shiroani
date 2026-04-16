import { AlertTriangle, ArrowLeft, HardDrive, RotateCcw, Search, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { PlayerSessionError } from './usePlayerSession';

interface PlayerErrorOverlayProps {
  error: PlayerSessionError;
  onRetry: () => void;
  onBack: () => void;
  onOpenFfmpegSetup: () => void;
  onRescan: (() => void) | null;
}

interface OverlayContent {
  title: string;
  message: string;
  icon: typeof AlertTriangle;
  primary?: { label: string; onClick: () => void; icon: typeof AlertTriangle };
  secondary?: { label: string; onClick: () => void; icon: typeof AlertTriangle };
}

/**
 * Error surface for the four recoverable failure modes the backend exposes.
 * Each variant offers the most direct recovery: the FFmpeg setup dialog for a
 * missing install, a library rescan for a file that vanished, retry for a
 * probe failure (usually transient), and an unknown-error fallback.
 */
export function PlayerErrorOverlay({
  error,
  onRetry,
  onBack,
  onOpenFfmpegSetup,
  onRescan,
}: PlayerErrorOverlayProps) {
  const content = buildContent(error, { onRetry, onOpenFfmpegSetup, onRescan });

  const Icon = content.icon;
  const PrimaryIcon = content.primary?.icon ?? RotateCcw;
  const SecondaryIcon = content.secondary?.icon ?? ArrowLeft;

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/80 backdrop-blur-[2px]">
      <div className="w-full max-w-md rounded-2xl border border-border/60 bg-card/80 p-6 shadow-2xl backdrop-blur">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
            <Icon className="h-5 w-5" strokeWidth={2} />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <h2 className="text-base font-semibold text-foreground">{content.title}</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">{content.message}</p>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
          <Button variant="ghost" onClick={onBack} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Powrót
          </Button>
          {content.secondary && (
            <Button variant="outline" onClick={content.secondary.onClick} className="gap-2">
              <SecondaryIcon className="h-4 w-4" />
              {content.secondary.label}
            </Button>
          )}
          {content.primary && (
            <Button onClick={content.primary.onClick} className="gap-2">
              <PrimaryIcon className="h-4 w-4" />
              {content.primary.label}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function buildContent(
  error: PlayerSessionError,
  actions: {
    onRetry: () => void;
    onOpenFfmpegSetup: () => void;
    onRescan: (() => void) | null;
  }
): OverlayContent {
  switch (error.code) {
    case 'FFMPEG_NOT_INSTALLED':
      return {
        icon: HardDrive,
        title: 'FFmpeg nie jest zainstalowany',
        message:
          'Do odtwarzania lokalnych plików potrzebny jest FFmpeg. Zainstaluj go lub wskaż istniejące binaria systemowe.',
        primary: {
          label: 'Konfiguracja FFmpeg',
          icon: HardDrive,
          onClick: actions.onOpenFfmpegSetup,
        },
      };
    case 'FILE_NOT_FOUND':
      return {
        icon: XCircle,
        title: 'Plik już nie istnieje',
        message:
          'Wygląda na to, że plik został przeniesiony lub usunięty. Przeskanuj bibliotekę, aby zaktualizować listę.',
        primary: actions.onRescan
          ? { label: 'Skanuj ponownie', icon: Search, onClick: actions.onRescan }
          : { label: 'Spróbuj ponownie', icon: RotateCcw, onClick: actions.onRetry },
      };
    case 'PROBE_FAILED':
      return {
        icon: AlertTriangle,
        title: 'Nie można odczytać pliku',
        message:
          'FFmpeg nie zdołał odczytać tego pliku. Może być uszkodzony lub w nieobsługiwanym formacie.',
        primary: { label: 'Spróbuj ponownie', icon: RotateCcw, onClick: actions.onRetry },
      };
    case 'UNKNOWN':
    default:
      return {
        icon: AlertTriangle,
        title: 'Odtwarzacz napotkał błąd',
        message:
          error.message || 'Wystąpił nieznany błąd. Spróbuj ponownie lub wróć do biblioteki.',
        primary: { label: 'Spróbuj ponownie', icon: RotateCcw, onClick: actions.onRetry },
      };
  }
}
