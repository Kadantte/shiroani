import { useEffect } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useUpdateStore } from '@/stores/useUpdateStore';

interface UpdatesSectionProps {
  version: string;
}

export function UpdatesSection({ version }: UpdatesSectionProps) {
  const {
    status,
    updateInfo,
    progress,
    error,
    channel,
    isChannelSwitching,
    checkForUpdates,
    startDownload,
    installNow,
    setChannel,
    initListeners,
  } = useUpdateStore();

  useEffect(() => {
    const cleanup = initListeners();
    return cleanup;
  }, [initListeners]);

  const statusText = (() => {
    switch (status) {
      case 'idle':
        return 'Brak nowych aktualizacji';
      case 'checking':
        return 'Sprawdzanie...';
      case 'available':
        return `Dostepna aktualizacja: ${updateInfo?.version ?? ''}`;
      case 'downloading':
        return `Pobieranie... ${progress ? `${Math.round(progress.percent)}%` : ''}`;
      case 'ready':
        return 'Aktualizacja gotowa do instalacji';
      case 'error':
        return `Blad: ${error ?? 'Nieznany blad'}`;
      default:
        return '';
    }
  })();

  return (
    <div className="space-y-6">
      {/* Version */}
      <div>
        <h3 className="text-sm font-medium mb-1">Wersja</h3>
        <p className="text-base font-mono text-foreground">{version || '...'}</p>
      </div>

      <Separator />

      {/* Channel */}
      <div>
        <h3 className="text-sm font-medium mb-2">Kanal aktualizacji</h3>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setChannel('stable')}
            disabled={isChannelSwitching}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg border transition-all',
              channel === 'stable'
                ? 'border-primary bg-primary/10 text-foreground'
                : 'border-border text-muted-foreground hover:border-foreground/20'
            )}
          >
            <div
              className={cn(
                'w-3 h-3 rounded-full',
                channel === 'stable' ? 'bg-primary' : 'bg-muted-foreground/30'
              )}
            />
            <span className="text-sm">Stabilna</span>
          </button>
          <button
            onClick={() => setChannel('beta')}
            disabled={isChannelSwitching}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg border transition-all',
              channel === 'beta'
                ? 'border-primary bg-primary/10 text-foreground'
                : 'border-border text-muted-foreground hover:border-foreground/20'
            )}
          >
            <div
              className={cn(
                'w-3 h-3 rounded-full',
                channel === 'beta' ? 'bg-primary' : 'bg-muted-foreground/30'
              )}
            />
            <span className="text-sm">Beta</span>
          </button>
        </div>
      </div>

      <Separator />

      {/* Check for updates */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <Button
            size="sm"
            onClick={checkForUpdates}
            disabled={status === 'checking' || status === 'downloading'}
          >
            {status === 'checking' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Sprawdz aktualizacje
          </Button>

          {status === 'available' && (
            <Button size="sm" variant="outline" onClick={startDownload}>
              Pobierz
            </Button>
          )}

          {status === 'ready' && (
            <Button size="sm" variant="outline" onClick={installNow}>
              Zainstaluj teraz
            </Button>
          )}
        </div>

        <p
          className={cn(
            'text-xs',
            status === 'error' ? 'text-destructive' : 'text-muted-foreground'
          )}
        >
          {statusText}
        </p>

        {/* Download progress */}
        {status === 'downloading' && progress && (
          <div className="mt-2 w-full bg-primary/20 rounded-full h-1.5">
            <div
              className="bg-primary h-full rounded-full transition-all duration-300"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
