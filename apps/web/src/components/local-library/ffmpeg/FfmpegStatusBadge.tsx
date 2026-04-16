import { AlertTriangle, CheckCircle2, Settings2, Terminal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFfmpegStore } from '@/stores/useFfmpegStore';

interface FfmpegStatusBadgeProps {
  onClick: () => void;
}

/**
 * Compact pill summarising FFmpeg status. Designed to live inline on the
 * Local Library header so the user always knows whether they can scan /
 * play, and can open the setup dialog with one click.
 */
export function FfmpegStatusBadge({ onClick }: FfmpegStatusBadgeProps) {
  const status = useFfmpegStore(s => s.status);

  const label = status.installed
    ? status.mode === 'bundled'
      ? 'FFmpeg: zainstalowany'
      : 'FFmpeg: systemowy'
    : 'FFmpeg: brak — kliknij, aby zainstalować';

  const Icon = status.installed
    ? status.mode === 'bundled'
      ? CheckCircle2
      : Terminal
    : AlertTriangle;

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      className={
        status.installed
          ? 'gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10'
          : 'gap-1.5 text-xs text-amber-400 hover:text-amber-300 hover:bg-amber-500/10'
      }
      aria-label="Otwórz konfigurację FFmpeg"
    >
      <Icon className="w-3.5 h-3.5" />
      <span className="truncate max-w-[260px]">{label}</span>
      <Settings2 className="w-3 h-3 opacity-60" />
    </Button>
  );
}
